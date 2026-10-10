import { describe, expect, it } from 'vitest';
import { isReadableChord, isValidChord, unknownChords, unreadableChords } from './chordCheck.js';

describe('isValidChord', () => {
  it('accepts roots with sharps and flats', () => {
    ['C', 'F#', 'Bb', 'Eb', 'G#'].forEach((chord) => expect(isValidChord(chord)).toBe(true));
  });

  it('accepts qualities', () => {
    ['Am', 'Cmaj', 'Dmin', 'Bdim', 'Caug', 'C+', 'Dsus2', 'Gsus4', 'Gsus', 'Cadd9'].forEach((chord) => expect(isValidChord(chord)).toBe(true));
  });

  it('accepts extensions and altered tones', () => {
    ['C6', 'G7', 'D9', 'F11', 'A13', 'Cmaj7', 'Am7', 'E7b9', 'G7#9', 'F#m7b5', 'Ebmaj9', 'C6/9', 'Bdim7', 'A5', 'Dm7sus4'].forEach((chord) => expect(isValidChord(chord)).toBe(true));
  });

  it('accepts slash chords and no chord', () => {
    ['C/E', 'Dm/C', 'F#m7/C#', 'N.C.', 'NC'].forEach((chord) => expect(isValidChord(chord)).toBe(true));
  });

  it('refuses things that are not chords', () => {
    ['', 'H', 'c', 'Cx', 'Am F', 'C/H', 'C/', 'Xm7', 'Cmaj8', 'G7b4'].forEach((chord) => expect(isValidChord(chord)).toBe(false));
  });
});

describe('readable chords', () => {
  it('only blocks chords the transposer cannot read', () => {
    expect(isReadableChord('Cxyz')).toBe(true);
    expect(isReadableChord('N.C.')).toBe(true);
    expect(isReadableChord('H7')).toBe(false);
    expect(isReadableChord('C/H')).toBe(false);
  });

  it('lists unreadable chords once and unknown chords per bar', () => {
    const sections = [{ name: 'A', bars: [{ chords: [{ beat: 1, chord: 'H7' }, { beat: 3, chord: 'Cxyz' }] }, { chords: [{ beat: 1, chord: 'H7' }] }] }];
    expect(unreadableChords(sections)).toEqual(['H7']);
    expect(unknownChords(sections[0].bars[0].chords)).toEqual(['H7', 'Cxyz']);
  });
});
