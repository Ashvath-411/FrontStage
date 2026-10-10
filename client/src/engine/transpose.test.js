import { describe, it, expect } from 'vitest';
import { transposeChord, keyPrefersFlats, transposeKey } from './transpose.js';

describe('transposeChord', () => {
  it('moves F#m up 2 to G#m', () => {
    expect(transposeChord('F#m', 2, false)).toBe('G#m');
  });

  it('moves Bb down 1 to A', () => {
    expect(transposeChord('Bb', -1, false)).toBe('A');
    expect(transposeChord('Bb', -1, true)).toBe('A');
  });

  it('moves the bass of a slash chord: C/E up 2 is D/F#', () => {
    expect(transposeChord('C/E', 2, false)).toBe('D/F#');
  });

  it('prefers flats when asked', () => {
    expect(transposeChord('G', 3, true)).toBe('Bb');
    expect(transposeChord('G', 3, false)).toBe('A#');
    expect(transposeChord('C7/G', 1, true)).toBe('Db7/Ab');
  });

  it('keeps the quality and wraps around the octave', () => {
    expect(transposeChord('Bmaj7', 1, false)).toBe('Cmaj7');
    expect(transposeChord('Csus4', -13, false)).toBe('Bsus4');
  });

  it('returns unknown text and zero shifts unchanged', () => {
    expect(transposeChord('N.C.', 3, false)).toBe('N.C.');
    expect(transposeChord('Db', 0, false)).toBe('Db');
  });
});

describe('keys', () => {
  it('knows which keys use flats', () => {
    expect(keyPrefersFlats('F', 'major')).toBe(true);
    expect(keyPrefersFlats('Eb', 'major')).toBe(true);
    expect(keyPrefersFlats('D', 'minor')).toBe(true);
    expect(keyPrefersFlats('E', 'major')).toBe(false);
    expect(keyPrefersFlats('A', 'minor')).toBe(false);
  });

  it('transposes a key and picks flats in flat keys', () => {
    expect(transposeKey('C', 'major', 3)).toEqual({ root: 'Eb', preferFlats: true });
    expect(transposeKey('C', 'major', 2)).toEqual({ root: 'D', preferFlats: false });
    expect(transposeKey('A', 'minor', 1)).toEqual({ root: 'Bb', preferFlats: true });
    expect(transposeKey('E', 'major', 2)).toEqual({ root: 'F#', preferFlats: false });
  });
});
