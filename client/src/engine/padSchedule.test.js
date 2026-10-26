import { describe, it, expect } from 'vitest';
import { buildTimeline } from './timeline.js';
import { emptyPadMemory, padChangesBetween, padChordAt, padChordName, padTick, sessionElapsedMs } from './padSchedule.js';

const firstSong = {
  sections: [{ bpm: 120, beatsPerBar: 4, barCount: 2 }, { bpm: 60, beatsPerBar: 3, barCount: 1 }],
  bars: [{ chords: [{ beat: 1, chord: 'C' }, { beat: 3, chord: 'G' }] }, { chords: [{ beat: 1, chord: 'Am' }] }, { chords: [{ beat: 2, chord: 'F' }] }],
  countInBars: 1,
  gapMode: 'countdown',
  gapSeconds: 4,
  transpose: 0
};
const secondSong = { sections: [{ bpm: 100, beatsPerBar: 4, barCount: 1 }], bars: [{ chords: [{ beat: 1, chord: 'D' }] }], countInBars: 0, gapMode: 'countdown', gapSeconds: 0, transpose: 2 };
const timelines = [firstSong, secondSong].map(buildTimeline);
const summary = (events) => events.map((event) => [event.atMs, event.chord ?? 'off']);
const kinds = (actions) => actions.map((action) => [action.atMs, action.kind]);

describe('padChangesBetween', () => {
  it('lists every chord change on the session clock, with silence at each song end', () => {
    expect(summary(padChangesBetween(timelines, 0, true, -1, 20000))).toEqual([
      [2000, 'C'], [3000, 'G'], [4000, 'Am'], [7000, 'F'], [9000, 'off'], [13000, 'D'], [15400, 'off']
    ]);
  });

  it('stops after the current song when auto-advance is off', () => {
    expect(summary(padChangesBetween(timelines, 0, false, -1, 20000)).at(-1)).toEqual([9000, 'off']);
    expect(summary(padChangesBetween(timelines, 1, false, -1, 20000))).toEqual([[0, 'D'], [2400, 'off']]);
  });

  it('includes the end of the window but not its start', () => {
    expect(summary(padChangesBetween(timelines, 0, true, 2000, 3000))).toEqual([[3000, 'G']]);
  });
});

describe('padChordAt', () => {
  it('is silent in the count-in and the gap, and follows tempo and meter changes', () => {
    expect(padChordAt(timelines, 0, 1000, true)).toBe(null);
    expect(padChordAt(timelines, 0, 2500, true).chord).toBe('C');
    expect(padChordAt(timelines, 0, 4500, true).chord).toBe('Am');
    expect(padChordAt(timelines, 0, 6500, true).chord).toBe('Am');
    expect(padChordAt(timelines, 0, 7500, true).chord).toBe('F');
    expect(padChordAt(timelines, 0, 10000, true)).toBe(null);
    expect(padChordAt(timelines, 0, 99999, true)).toBe(null);
  });

  it('plays the next song in its transposed key', () => {
    const chord = padChordAt(timelines, 0, 13100, true);
    expect(chord.chord).toBe('D');
    expect(chord.notes.bass % 12).toBe(4);
  });

  it('treats a no-chord mark as silence', () => {
    const withRest = buildTimeline({ ...firstSong, bars: [{ chords: [{ beat: 1, chord: 'N.C.' }] }, ...firstSong.bars.slice(1)] });
    expect(padChordAt([withRest], 0, 2500, true)).toBe(null);
    expect(summary(padChangesBetween([withRest], 0, true, -1, 3000))).toEqual([[2000, 'off']]);
  });
});

function run(memory, from, to, extra = {}) {
  const actions = [];
  let current = memory;
  for (let nowMs = from; nowMs <= to; nowMs += 25) {
    const result = padTick(current, { playing: true, key: 'a', nowMs, lookAheadMs: 150, timelines, fromItem: 0, autoAdvance: true, ...extra });
    current = result.memory;
    actions.push(...result.actions);
  }
  return { memory: current, actions };
}

describe('padTick', () => {
  it('schedules each change exactly once while the session plays', () => {
    const { actions } = run(emptyPadMemory, -1500, 16000);
    expect(kinds(actions)).toEqual([[2000, 'chord'], [3000, 'chord'], [4000, 'chord'], [7000, 'chord'], [9000, 'release'], [13000, 'chord'], [15400, 'release']]);
    expect(actions.map((action) => action.chord ?? null)).toEqual(['C', 'G', 'Am', 'F', null, 'D', null]);
  });

  it('starts nothing in the count-in, and stops at once on pause', () => {
    const counting = run(emptyPadMemory, -1500, 1500);
    expect(counting.actions).toEqual([]);
    const playing = run(emptyPadMemory, -1500, 2500);
    const paused = padTick(playing.memory, { playing: false });
    expect(paused.actions).toEqual([{ kind: 'stop' }]);
    expect(paused.memory).toEqual(emptyPadMemory);
    expect(padTick(paused.memory, { playing: false }).actions).toEqual([]);
  });

  it('resumes in the middle of a chord without striking it twice', () => {
    const { actions } = run(emptyPadMemory, 3500, 3700, { key: 'resumed' });
    expect(kinds(actions)).toEqual([[3500, 'chord']]);
    expect(actions[0].chord).toBe('G');
    const onTheChange = run(emptyPadMemory, 4000, 4300, { key: 'resumed' });
    expect(kinds(onTheChange.actions)).toEqual([[4000, 'chord']]);
  });

  it('a seek or section jump stops the old chord and starts the chord at the new place', () => {
    const before = run(emptyPadMemory, 1900, 2500);
    const jumped = padTick(before.memory, { playing: true, key: 'after-seek', nowMs: 7200, lookAheadMs: 150, timelines, fromItem: 0, autoAdvance: true });
    expect(jumped.actions.map((action) => action.kind)).toEqual(['stop', 'chord']);
    expect(jumped.actions[1].chord).toBe('F');
  });

  it('a jump into the gap only stops the sound', () => {
    const before = run(emptyPadMemory, 1900, 2500);
    const jumped = padTick(before.memory, { playing: true, key: 'gap', nowMs: 10000, lookAheadMs: 150, timelines, fromItem: 0, autoAdvance: true });
    expect(jumped.actions).toEqual([{ kind: 'stop' }]);
    expect(jumped.memory.sounding).toBe(false);
  });

  it('knows the session clock only while playing', () => {
    expect(sessionElapsedMs({ playState: 'playing', anchorServerMs: 1000, anchorOffsetMs: 200 }, 3000)).toBe(2200);
    expect(sessionElapsedMs({ playState: 'paused', anchorServerMs: 1000, anchorOffsetMs: 200 }, 3000)).toBe(null);
    expect(sessionElapsedMs({ playState: 'ended', anchorServerMs: 1000, anchorOffsetMs: 0 }, 3000)).toBe(null);
  });
});

describe('padChordName', () => {
  it('names the chord being played, and clears it on release, stop and pause', () => {
    const playing = run(emptyPadMemory, 1900, 2000);
    expect(padChordName(playing, null)).toBe('C');
    const quiet = padTick(playing.memory, { playing: true, key: 'a', nowMs: 2025, lookAheadMs: 150, timelines, fromItem: 0, autoAdvance: true });
    expect(padChordName(quiet, 'C')).toBe('C');
    expect(padChordName(padTick(playing.memory, { playing: false }), 'C')).toBe(null);
    const released = run(emptyPadMemory, 8900, 9000);
    expect(padChordName(released, 'F')).toBe(null);
  });
});
