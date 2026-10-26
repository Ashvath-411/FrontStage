import { describe, it, expect } from 'vitest';
import { bassRange, chordIntervals, chordNotes, toneRange } from './chordNotes.js';

const pitchClasses = (pitches) => pitches.map((pitch) => pitch % 12).sort((first, second) => first - second);

describe('chordIntervals', () => {
  it('reads the common chord qualities', () => {
    expect(chordIntervals('')).toEqual([0, 4, 7]);
    expect(chordIntervals('m')).toEqual([0, 3, 7]);
    expect(chordIntervals('min')).toEqual([0, 3, 7]);
    expect(chordIntervals('7')).toEqual([0, 4, 7, 10]);
    expect(chordIntervals('maj7')).toEqual([0, 4, 7, 11]);
    expect(chordIntervals('m7')).toEqual([0, 3, 7, 10]);
    expect(chordIntervals('sus4')).toEqual([0, 5, 7]);
    expect(chordIntervals('sus')).toEqual([0, 5, 7]);
    expect(chordIntervals('sus2')).toEqual([0, 2, 7]);
    expect(chordIntervals('7sus4')).toEqual([0, 5, 7, 10]);
    expect(chordIntervals('dim')).toEqual([0, 3, 6]);
    expect(chordIntervals('dim7')).toEqual([0, 3, 6, 9]);
    expect(chordIntervals('m7b5')).toEqual([0, 3, 6, 10]);
    expect(chordIntervals('aug')).toEqual([0, 4, 8]);
    expect(chordIntervals('+')).toEqual([0, 4, 8]);
    expect(chordIntervals('6')).toEqual([0, 4, 7, 9]);
    expect(chordIntervals('m6')).toEqual([0, 3, 7, 9]);
    expect(chordIntervals('add9')).toEqual([0, 4, 7, 14]);
    expect(chordIntervals('9')).toEqual([0, 4, 7, 10, 14]);
    expect(chordIntervals('maj9')).toEqual([0, 4, 7, 11, 14]);
    expect(chordIntervals('5')).toEqual([0, 7]);
    expect(chordIntervals('7#9')).toEqual([0, 4, 7, 10, 15]);
  });

  it('keeps what it understood when an ending is unknown', () => {
    expect(chordIntervals('7alt')).toEqual([0, 4, 7, 10]);
  });
});

describe('chordNotes', () => {
  it('voices a major chord with the root low and the chord in the middle octave', () => {
    expect(chordNotes('C')).toEqual({ bass: 48, tones: [55, 60, 64], pitches: [48, 55, 60, 64] });
  });

  it('plays the right notes for maj, min, 7, maj7, m7 and sus chords', () => {
    expect(pitchClasses(chordNotes('G').tones)).toEqual([2, 7, 11]);
    expect(pitchClasses(chordNotes('Am').tones)).toEqual([0, 4, 9]);
    expect(pitchClasses(chordNotes('D7').tones)).toEqual([0, 2, 6, 9]);
    expect(pitchClasses(chordNotes('Fmaj7').tones)).toEqual([0, 4, 5, 9]);
    expect(pitchClasses(chordNotes('Em7').tones)).toEqual([2, 4, 7, 11]);
    expect(pitchClasses(chordNotes('Dsus4').tones)).toEqual([2, 7, 9]);
    expect(pitchClasses(chordNotes('Asus2').tones)).toEqual([4, 9, 11]);
    expect(chordNotes('Am').bass % 12).toBe(9);
  });

  it('honours the slash bass', () => {
    const notes = chordNotes('C/E');
    expect(notes.bass % 12).toBe(4);
    expect(pitchClasses(notes.tones)).toEqual([0, 4, 7]);
    expect(chordNotes('D/F#').bass % 12).toBe(6);
    expect(chordNotes('Bb/D').bass % 12).toBe(2);
  });

  it('follows the transposed key, including the slash bass', () => {
    expect(chordNotes('G', 2).bass % 12).toBe(9);
    expect(pitchClasses(chordNotes('G', 2).tones)).toEqual([1, 4, 9]);
    expect(pitchClasses(chordNotes('Em7', -2).tones)).toEqual([0, 2, 5, 9]);
    expect(chordNotes('C/E', 3).bass % 12).toBe(7);
    expect(chordNotes('F#m', -7).bass % 12).toBe(11);
    expect(chordNotes('Bb', 12)).toEqual(chordNotes('Bb'));
  });

  it('stays in a comfortable range for every root and quality', () => {
    for (const root of ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      for (const quality of ['', 'm', '7', 'maj7', 'm7', 'sus4', '9', '13', 'dim7']) {
        for (const transpose of [-5, 0, 6]) {
          const notes = chordNotes(root + quality, transpose);
          expect(notes.bass).toBeGreaterThanOrEqual(bassRange.low);
          expect(notes.bass).toBeLessThanOrEqual(bassRange.high);
          notes.tones.forEach((tone) => {
            expect(tone).toBeGreaterThanOrEqual(toneRange.low);
            expect(tone).toBeLessThanOrEqual(toneRange.high);
          });
          expect(notes.tones.length).toBeLessThanOrEqual(5);
          expect(new Set(notes.tones).size).toBe(notes.tones.length);
        }
      }
    }
  });

  it('drops the fifth first when a big chord has too many notes', () => {
    expect(pitchClasses(chordNotes('C13').tones)).toEqual([0, 2, 4, 9, 10]);
  });

  it('plays nothing for no-chord marks or text that is not a chord', () => {
    expect(chordNotes('N.C.')).toBe(null);
    expect(chordNotes('%')).toBe(null);
    expect(chordNotes('')).toBe(null);
    expect(chordNotes(undefined)).toBe(null);
    expect(pitchClasses(chordNotes('C6/9').tones)).toEqual([0, 2, 4, 7, 9]);
  });
});
