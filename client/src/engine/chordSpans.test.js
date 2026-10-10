import { describe, expect, it } from 'vitest';
import { chordSpans } from './chordSpans.js';

const sizes = (spans) => spans.map((entry) => [entry.chord, Math.round(entry.size * 1000) / 1000]);

describe('chordSpans', () => {
  it('gives one chord the whole bar', () => {
    expect(chordSpans([{ beat: 1, chord: 'G' }], 4)).toEqual([{ chord: 'G', beat: 1, size: 1 }]);
  });

  it('sizes chords by how long they last', () => {
    expect(sizes(chordSpans([{ beat: 1, chord: 'C' }, { beat: 4, chord: 'G' }], 4))).toEqual([['C', 0.75], ['G', 0.25]]);
    expect(sizes(chordSpans([{ beat: 1, chord: 'C' }, { beat: 2.3333, chord: 'D' }, { beat: 3.6667, chord: 'E' }], 4))).toEqual([['C', 0.333], ['D', 0.333], ['E', 0.333]]);
  });

  it('keeps an empty space before a late first chord and sorts the chords', () => {
    expect(sizes(chordSpans([{ beat: 3, chord: 'D' }, { beat: 2, chord: 'A' }], 3))).toEqual([[null, 0.333], ['A', 0.333], ['D', 0.333]]);
  });

  it('returns nothing for a bar with no chords', () => {
    expect(chordSpans([], 4)).toEqual([]);
  });
});
