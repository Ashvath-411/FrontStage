import { describe, it, expect } from 'vitest';
import { buildTimeline } from './timeline.js';
import { beatsBetween } from './beats.js';

function makeItem(overrides = {}) {
  return {
    sections: [{ name: 'A', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 4 }],
    bars: Array.from({ length: 4 }, () => ({ chords: [] })),
    countInBars: 0,
    tempoPct: 100,
    gapMode: 'countdown',
    gapSeconds: 2,
    ...overrides
  };
}

const times = (beats) => beats.map((beat) => beat.atMs);

describe('beatsBetween', () => {
  it('gives a beat every 500 ms at 120 BPM in 4/4 with an accent on every fourth', () => {
    const beats = beatsBetween([buildTimeline(makeItem())], 0, true, 0, 8000);
    expect(times(beats)).toEqual(Array.from({ length: 16 }, (_, index) => index * 500));
    expect(beats.filter((beat) => beat.accent).map((beat) => beat.atMs)).toEqual([0, 2000, 4000, 6000]);
    expect(beats.every((beat) => beat.phase === 'song')).toBe(true);
  });

  it('follows a tempo change in a bridge', () => {
    const item = makeItem({
      sections: [
        { name: 'Verse', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 2 },
        { name: 'Bridge', bpm: 60, beatsPerBar: 3, firstBar: 2, barCount: 1 }
      ],
      bars: Array.from({ length: 3 }, () => ({ chords: [] }))
    });
    const beats = beatsBetween([buildTimeline(item)], 0, true, 3500, 20000);
    expect(times(beats)).toEqual([3500, 4000, 5000, 6000]);
    expect(beats.map((beat) => beat.accent)).toEqual([false, true, false, false]);
  });

  it('spaces beats by the tempo %', () => {
    expect(times(beatsBetween([buildTimeline(makeItem({ tempoPct: 200 }))], 0, true, 0, 1000))).toEqual([0, 250, 500, 750]);
    expect(times(beatsBetween([buildTimeline(makeItem({ tempoPct: 50 }))], 0, true, 0, 4000))).toEqual([0, 1000, 2000, 3000]);
  });

  it('plays count-in beats at the first bar tempo before the song', () => {
    const beats = beatsBetween([buildTimeline(makeItem({ countInBars: 1 }))], 0, true, 0, 2600);
    expect(times(beats)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    expect(beats.map((beat) => beat.phase)).toEqual(['countin', 'countin', 'countin', 'countin', 'song', 'song']);
    expect(beats.map((beat) => beat.accent)).toEqual([true, false, false, false, true, false]);
  });

  it('returns nothing before the anchor time and handles negative windows', () => {
    expect(times(beatsBetween([buildTimeline(makeItem())], 0, true, -300, 600))).toEqual([0, 500]);
    expect(beatsBetween([buildTimeline(makeItem())], 0, true, -1000, -1)).toEqual([]);
  });

  it('never repeats or skips a beat across consecutive windows', () => {
    const timelines = [buildTimeline(makeItem({ countInBars: 1, tempoPct: 137 })), buildTimeline(makeItem({ countInBars: 2 }))];
    const whole = beatsBetween(timelines, 0, true, 0, 30000, true);
    const pieces = [];
    for (let fromMs = 0; fromMs < 30000; fromMs += 150) {
      pieces.push(...beatsBetween(timelines, 0, true, fromMs, fromMs + 150, true));
    }
    expect(pieces).toEqual(whole);
    const firstWindow = beatsBetween(timelines, 0, true, 0, 500);
    expect(firstWindow).toHaveLength(2);
    expect(firstWindow[1].atMs).toBeCloseTo(500 / 1.37, 6);
    expect(beatsBetween(timelines, 0, true, 500, 1000)[0].atMs).toBeCloseTo(1000 / 1.37, 6);
  });

  it('crosses into the next song with auto advance and stops without it', () => {
    const timelines = [buildTimeline(makeItem()), buildTimeline(makeItem({ countInBars: 1, sections: [{ name: 'A', bpm: 60, beatsPerBar: 4, firstBar: 0, barCount: 4 }] }))];
    const advancing = beatsBetween(timelines, 0, true, 7500, 12000);
    expect(times(advancing)).toEqual([7500, 10000, 11000]);
    expect(advancing.map((beat) => beat.phase)).toEqual(['song', 'countin', 'countin']);
    expect(times(beatsBetween(timelines, 0, false, 7500, 12000))).toEqual([7500]);
  });

  it('returns gap beats at the next song tempo only when asked', () => {
    const timelines = [buildTimeline(makeItem()), buildTimeline(makeItem({ sections: [{ name: 'A', bpm: 60, beatsPerBar: 4, firstBar: 0, barCount: 4 }] }))];
    const withGap = beatsBetween(timelines, 0, true, 8000, 10000, true);
    expect(times(withGap)).toEqual([8000, 9000]);
    expect(withGap.map((beat) => beat.phase)).toEqual(['gap', 'gap']);
    expect(withGap[0].accent).toBe(true);
    expect(beatsBetween(timelines, 0, true, 8000, 10000)).toEqual([]);
  });

  it('returns nothing during a manual gap and after the last song', () => {
    const manual = [buildTimeline(makeItem({ gapMode: 'manual' })), buildTimeline(makeItem())];
    expect(beatsBetween(manual, 0, true, 8000, 60000, true)).toEqual([]);
    expect(beatsBetween([buildTimeline(makeItem())], 0, true, 8000, 60000, true)).toEqual([]);
  });

  it('starts from a later item', () => {
    const timelines = [buildTimeline(makeItem()), buildTimeline(makeItem({ tempoPct: 200 }))];
    expect(times(beatsBetween(timelines, 1, true, 0, 1000))).toEqual([0, 250, 500, 750]);
  });
});
