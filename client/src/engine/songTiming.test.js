import { describe, it, expect } from 'vitest';
import { resolveSections, itemDurationMs, formatDuration } from './songTiming.js';

const song = {
  bpm: 120,
  beatsPerBar: 4,
  sections: [
    { name: 'A', bars: [{ chords: [] }, { chords: [] }] },
    { name: 'B', bpm: 60, bars: [{ chords: [] }] }
  ]
};

describe('song timing', () => {
  it('resolves inherited tempo and bar numbers', () => {
    expect(resolveSections(song.sections, { bpm: 120, beatsPerBar: 4 }).map(({ bpm, firstBar, barCount }) => ({ bpm, firstBar, barCount })))
      .toEqual([{ bpm: 120, firstBar: 0, barCount: 2 }, { bpm: 60, firstBar: 2, barCount: 1 }]);
  });

  it('adds count-in, song and gap, without a gap after the last item', () => {
    const item = { countInBars: 1, tempoPct: 100, gapMode: 'countdown', gapSeconds: 5 };
    expect(itemDurationMs(song, item, false)).toBe(2000 + 8000 + 5000);
    expect(itemDurationMs(song, item, true)).toBe(10000);
    expect(itemDurationMs(song, { ...item, tempoPct: 200 }, true)).toBe(5000);
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2:05');
  });
});
