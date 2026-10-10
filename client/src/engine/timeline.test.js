import { describe, it, expect } from 'vitest';
import { buildTimeline, positionAt, nextChordChange } from './timeline.js';

function makeItem(overrides = {}) {
  return {
    sections: [
      { name: 'Verse', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 2 },
      { name: 'Bridge', bpm: 60, beatsPerBar: 4, firstBar: 2, barCount: 1 }
    ],
    bars: [
      { chords: [{ beat: 1, chord: 'C' }, { beat: 3, chord: 'F' }], lyric: 'one' },
      { chords: [], lyric: 'two' },
      { chords: [{ beat: 1, chord: 'G' }], lyric: 'three' }
    ],
    countInBars: 1,
    tempoPct: 100,
    gapMode: 'countdown',
    gapSeconds: 8,
    ...overrides
  };
}

describe('buildTimeline', () => {
  it('computes bar start times with one tempo', () => {
    const timeline = buildTimeline(makeItem({ sections: [{ name: 'A', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 3 }] }));
    expect(timeline.barStartsMs).toEqual([0, 2000, 4000]);
    expect(timeline.songMs).toBe(6000);
  });

  it('computes bar start times with a tempo change in the bridge', () => {
    const timeline = buildTimeline(makeItem());
    expect(timeline.barStartsMs).toEqual([0, 2000, 4000]);
    expect(timeline.barDurationsMs).toEqual([2000, 2000, 4000]);
    expect(timeline.songMs).toBe(8000);
  });

  it('uses the first bar duration for the count-in', () => {
    expect(buildTimeline(makeItem({ countInBars: 2 })).countInMs).toBe(4000);
    expect(buildTimeline(makeItem({ countInBars: 0 })).countInMs).toBe(0);
  });

  it('handles a 3/4 section', () => {
    const timeline = buildTimeline(makeItem({ sections: [{ name: 'Waltz', bpm: 90, beatsPerBar: 3, firstBar: 0, barCount: 3 }] }));
    expect(timeline.barDurationsMs[0]).toBe(2000);
  });

  it('halves durations at tempo 200% and doubles them at 50%', () => {
    expect(buildTimeline(makeItem({ tempoPct: 200 })).barStartsMs).toEqual([0, 1000, 2000]);
    expect(buildTimeline(makeItem({ tempoPct: 200 })).songMs).toBe(4000);
    expect(buildTimeline(makeItem({ tempoPct: 50 })).barStartsMs).toEqual([0, 4000, 8000]);
    expect(buildTimeline(makeItem({ tempoPct: 50 })).countInMs).toBe(4000);
  });

  it('sets the gap length from the gap mode', () => {
    expect(buildTimeline(makeItem()).gapMs).toBe(8000);
    expect(buildTimeline(makeItem({ gapMode: 'immediate' })).gapMs).toBe(0);
    expect(buildTimeline(makeItem({ gapMode: 'manual' })).gapMs).toBeNull();
  });
});

describe('positionAt', () => {
  const twoItems = [buildTimeline(makeItem()), buildTimeline(makeItem({ tempoPct: 200 }))];

  it('returns starting for negative elapsed time', () => {
    const position = positionAt(twoItems, 0, -1500, true);
    expect(position.phase).toBe('starting');
    expect(position.itemIdx).toBe(0);
    expect(position.msToPhaseEnd).toBe(1500);
  });

  it('starts in the count-in at exactly zero', () => {
    const position = positionAt(twoItems, 0, 0, true);
    expect(position.phase).toBe('countin');
    expect(position.beatInBar).toBe(1);
    expect(position.bpmNow).toBe(120);
    expect(position.msToPhaseEnd).toBe(2000);
  });

  it('counts beats through the count-in', () => {
    expect(positionAt(twoItems, 0, 1600, true).beatInBar).toBe(4);
  });

  it('lands on bar 0 beat 1 at the exact song start', () => {
    const position = positionAt(twoItems, 0, 2000, true);
    expect(position).toMatchObject({ phase: 'song', itemIdx: 0, barIdx: 0, beatInBar: 1, chordIdx: 0, sectionIdx: 0 });
    expect(position.msToNextSong).toBe(16000);
  });

  it('switches chord on beat 3', () => {
    expect(positionAt(twoItems, 0, 2000 + 1000, true).chordIdx).toBe(1);
  });

  it('carries the previous chord into a bar with no chords', () => {
    const position = positionAt(twoItems, 0, 2000 + 2500, true);
    expect(position.barIdx).toBe(1);
    expect(position.chordIdx).toBe(1);
  });

  it('is on the last bar and beat in the last millisecond of a song', () => {
    const position = positionAt(twoItems, 0, 2000 + 8000 - 1, true);
    expect(position).toMatchObject({ phase: 'song', barIdx: 2, beatInBar: 4, chordIdx: 2, sectionIdx: 1, bpmNow: 60 });
    expect(position.msToPhaseEnd).toBe(1);
  });

  it('is in the gap mid-way with the next song tempo', () => {
    const position = positionAt(twoItems, 0, 10000 + 4000, true);
    expect(position.phase).toBe('gap');
    expect(position.itemIdx).toBe(0);
    expect(position.msToPhaseEnd).toBe(4000);
    expect(position.msToNextSong).toBe(4000);
    expect(position.bpmNow).toBe(240);
  });

  it('moves into the next item across the boundary', () => {
    const position = positionAt(twoItems, 0, 18000 + 500, true);
    expect(position.phase).toBe('countin');
    expect(position.itemIdx).toBe(1);
    expect(positionAt(twoItems, 0, 18000 + 1000, true)).toMatchObject({ phase: 'song', itemIdx: 1, barIdx: 0 });
  });

  it('can start from a later item', () => {
    expect(positionAt(twoItems, 1, 1000, true)).toMatchObject({ phase: 'song', itemIdx: 1, barIdx: 0 });
  });

  it('returns finished after the last song', () => {
    const position = positionAt(twoItems, 1, 1000 + 4000, true);
    expect(position.phase).toBe('finished');
    expect(position.itemIdx).toBe(1);
  });

  it('returns waiting at a manual gap', () => {
    const manual = [buildTimeline(makeItem({ gapMode: 'manual' })), twoItems[1]];
    const position = positionAt(manual, 0, 10000 + 30000, true);
    expect(position.phase).toBe('waiting');
    expect(position.itemIdx).toBe(0);
  });

  it('returns waiting after the gap when auto advance is off', () => {
    expect(positionAt(twoItems, 0, 10000 + 4000, false).phase).toBe('gap');
    expect(positionAt(twoItems, 0, 18000 + 500, false)).toMatchObject({ phase: 'waiting', itemIdx: 0 });
  });

  it('goes straight to the next count-in with an immediate gap', () => {
    const immediate = [buildTimeline(makeItem({ gapMode: 'immediate' })), twoItems[1]];
    expect(positionAt(immediate, 0, 10000, true)).toMatchObject({ phase: 'countin', itemIdx: 1 });
  });

  it('returns finished for an empty setlist', () => {
    expect(positionAt([], 0, 0, true).phase).toBe('finished');
  });
});

describe('nextChordChange', () => {
  it('skips repeats of the current chord', () => {
    const timeline = buildTimeline(makeItem({
      bars: [{ chords: [{ beat: 1, chord: 'G' }] }, { chords: [{ beat: 1, chord: 'G' }] }, { chords: [{ beat: 1, chord: 'C' }] }]
    }));
    expect(nextChordChange(timeline, 0).chord).toBe('C');
    expect(nextChordChange(timeline, -1).chord).toBe('G');
    expect(nextChordChange(timeline, 2)).toBeNull();
  });
});
