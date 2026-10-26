import { describe, it, expect } from 'vitest';
import { keySpelling, nameNotes, pitchClassWeights, spellPitchClass } from './chordNaming.js';

const held = (...pitches) => pitches.map((pitch) => ({ pitch }));

describe('nameNotes', () => {
  it('names triads in root position', () => {
    expect(nameNotes(held(60, 64, 67))).toBe('C');
    expect(nameNotes(held(57, 60, 64))).toBe('Am');
    expect(nameNotes(held(59, 62, 65))).toBe('Bdim');
    expect(nameNotes(held(60, 64, 68))).toBe('Caug');
    expect(nameNotes(held(62, 67, 69))).toBe('Dsus4');
    expect(nameNotes(held(62, 64, 69))).toBe('Dsus2');
  });

  it('names sevenths and sixths', () => {
    expect(nameNotes(held(55, 59, 62, 65))).toBe('G7');
    expect(nameNotes(held(60, 64, 67, 71))).toBe('Cmaj7');
    expect(nameNotes(held(57, 60, 64, 67))).toBe('Am7');
    expect(nameNotes(held(59, 62, 65, 69))).toBe('Bm7b5');
    expect(nameNotes(held(48, 64, 67, 69))).toBe('C6');
    expect(nameNotes(held(60, 62, 64, 67))).toBe('Cadd9');
  });

  it('uses the lowest note for slash chords', () => {
    expect(nameNotes(held(52, 60, 67))).toBe('C/E');
    expect(nameNotes(held(43, 60, 64))).toBe('C/G');
    expect(nameNotes(held(54, 62, 69))).toBe('D/F#');
    expect(nameNotes(held(46, 60, 64, 67))).toBe('C7/Bb');
  });

  it('copes with spread voicings and missing fifths', () => {
    expect(nameNotes(held(36, 52, 67, 72))).toBe('C');
    expect(nameNotes(held(43, 53, 59))).toBe('G7');
    expect(nameNotes(held(60, 64))).toBe('C');
    expect(nameNotes(held(60, 63))).toBe('Cm');
    expect(nameNotes(held(40, 47))).toBe('E5');
  });

  it('spells roots from the song key', () => {
    expect(nameNotes(held(58, 62, 65), keySpelling('F', 'major'))).toBe('Bb');
    expect(nameNotes(held(58, 62, 65), keySpelling('C', 'major'))).toBe('Bb');
    expect(nameNotes(held(58, 62, 65), keySpelling('E', 'major'))).toBe('A#');
    expect(nameNotes(held(51, 55, 58, 61), keySpelling('Ab', 'major'))).toBe('Eb7');
    expect(nameNotes(held(54, 62, 69), keySpelling('G', 'major'))).toBe('D/F#');
    expect(nameNotes(held(56, 59, 63), keySpelling('E', 'major'))).toBe('G#m');
    expect(spellPitchClass(8, keySpelling('C', 'major'))).toBe('Ab');
    expect(spellPitchClass(6, keySpelling('C', 'major'))).toBe('F#');
    expect(keySpelling('Db', 'major')).toEqual({ keyPc: 1, preferFlats: true });
  });

  it('needs at least two different notes', () => {
    expect(nameNotes([])).toBe(null);
    expect(nameNotes(held(60))).toBe(null);
    expect(nameNotes(held(48, 60, 72))).toBe(null);
  });

  it('lets long notes outweigh short passing notes', () => {
    const notes = [{ pitch: 48, weight: 4 }, { pitch: 64, weight: 4 }, { pitch: 67, weight: 4 }, { pitch: 74, weight: 0.5 }];
    expect(nameNotes(notes)).toBe('C');
    expect(pitchClassWeights(notes)[2]).toBe(0);
    expect(pitchClassWeights([{ pitch: 60, weight: 4 }, { pitch: 62, weight: 2 }])[2]).toBe(0.5);
  });
});
