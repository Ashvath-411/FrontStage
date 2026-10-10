import { describe, expect, it } from 'vitest';
import { addChordToBar, diatonicChords, paletteExtras } from './chordPalette.js';

describe('diatonicChords', () => {
  it('lists I ii iii IV V vi vii dim in a major key', () => {
    expect(diatonicChords('C', 'major')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(diatonicChords('D', 'major')).toEqual(['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim']);
  });

  it('lists i ii dim III iv v VI VII in a minor key', () => {
    expect(diatonicChords('A', 'minor')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  it('spells flat keys with flats', () => {
    expect(diatonicChords('Bb', 'major')).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim']);
    expect(diatonicChords('D', 'minor')).toEqual(['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C']);
  });
});

describe('paletteExtras', () => {
  it('adds the major V in a minor key', () => {
    expect(paletteExtras('A', 'minor', null)).toEqual(['E']);
  });

  it('adds sus and 7 versions of the selected chord', () => {
    expect(paletteExtras('C', 'major', 'G')).toEqual(['Gsus2', 'Gsus4', 'G7']);
    expect(paletteExtras('C', 'major', 'Am7')).toEqual(['Asus2', 'Asus4', 'A7']);
  });
});

describe('addChordToBar', () => {
  const empty = { chords: [], lyric: 'first line' };
  const withG = { chords: [{ beat: 1, chord: 'G' }], lyric: '' };

  it('replaces the bar chord and moves on', () => {
    expect(addChordToBar(withG, 'C', 4)).toEqual({ chords: [{ beat: 1, chord: 'C' }], advance: true });
  });

  it('appends chords to the bar and splits it evenly', () => {
    expect(addChordToBar(withG, 'D', 4, { append: true })).toEqual({ chords: [{ beat: 1, chord: 'G' }, { beat: 3, chord: 'D' }], advance: false });
    const three = addChordToBar({ chords: [{ beat: 1, chord: 'G' }, { beat: 3, chord: 'D' }] }, 'Em', 4, { append: true });
    expect(three.chords).toEqual([{ beat: 1, chord: 'G' }, { beat: 2.3333, chord: 'D' }, { beat: 3.6667, chord: 'Em' }]);
    expect(addChordToBar(withG, 'D', 3, { append: true }).chords).toEqual([{ beat: 1, chord: 'G' }, { beat: 2.5, chord: 'D' }]);
  });

  it('puts the first chord in an empty bar when appending', () => {
    expect(addChordToBar(empty, 'Em', 4, { append: true })).toEqual({ chords: [{ beat: 1, chord: 'Em' }], advance: false });
  });

  it('changes the selected chip and keeps the others', () => {
    const bar = { chords: [{ beat: 1, chord: 'G' }, { beat: 2, chord: 'D' }, { beat: 3, chord: 'Em' }, { beat: 4, chord: 'C' }] };
    expect(addChordToBar(bar, 'Am', 4, { chipIdx: 2 }).chords.map((entry) => entry.chord)).toEqual(['G', 'D', 'Am', 'C']);
  });

  it('stops at 16 chords in a bar', () => {
    const full = { chords: Array.from({ length: 16 }, (_, index) => ({ beat: 1 + index / 4, chord: 'C' })) };
    expect(addChordToBar(full, 'G', 4, { append: true }).chords).toHaveLength(16);
  });
});
