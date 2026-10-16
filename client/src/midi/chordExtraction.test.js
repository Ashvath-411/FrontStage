import { describe, it, expect } from 'vitest';
import { chordRegions, chordsByBar, extractChords, isNewChord, mergeShortRegions, soundingSegments, writeTakeToChart } from './chordExtraction.js';
import { keySpelling, plainSpelling } from './chordNaming.js';
import { quantizeTake } from './quantize.js';
import { formatChordTokens } from '../engine/parseChart.js';

function chord(pitches, start, end) {
  return pitches.map((pitch) => ({ pitch, velocity: 90, start, end }));
}

describe('segments and regions', () => {
  it('cuts the take at every start and end', () => {
    const segments = soundingSegments([...chord([60, 64], 0, 2), ...chord([67], 1, 3)]);
    expect(segments.map((segment) => [segment.start, segment.end, segment.notes.length])).toEqual([[0, 1, 2], [1, 2, 3], [2, 3, 1]]);
  });

  it('starts a new chord when two notes change or the bass moves', () => {
    const core = chord([48, 64, 67], 0, 1);
    expect(isNewChord(core, { notes: chord([48, 64, 67, 74], 0, 1) })).toBe(false);
    expect(isNewChord(core, { notes: chord([48, 65, 69], 0, 1) })).toBe(true);
    expect(isNewChord(core, { notes: chord([52, 64, 67], 0, 1) })).toBe(true);
  });

  it('holds through silence and folds very short regions into the one before', () => {
    const regions = chordRegions(soundingSegments([...chord([48, 64, 67], 0, 1.5), ...chord([43, 62, 67], 2, 4)]));
    expect(regions.map((region) => [region.start, region.end])).toEqual([[0, 2], [2, 4]]);
    expect(mergeShortRegions([{ start: 0, end: 2 }, { start: 2, end: 2.25 }, { start: 2.25, end: 4 }])).toEqual([{ start: 0, end: 2.25 }, { start: 2.25, end: 4 }]);
    expect(mergeShortRegions([{ start: 0, end: 0.25 }, { start: 0.25, end: 4 }])).toEqual([{ start: 0, end: 4 }]);
  });
});

describe('extractChords', () => {
  it('finds each chord at its true beat and merges repeats', () => {
    const notes = [...chord([45, 60, 64], 0, 2), ...chord([45, 60, 64], 2, 3), ...chord([43, 59, 62], 3, 3.5), ...chord([41, 57, 60], 3.5, 4)];
    expect(extractChords(notes, plainSpelling)).toEqual([{ beat: 0, chord: 'Am' }, { beat: 3, chord: 'G' }, { beat: 3.5, chord: 'F' }]);
  });

  it('ignores a melody passing over a held chord', () => {
    const notes = [...chord([48, 52, 55], 0, 4), { pitch: 72, start: 0, end: 1 }, { pitch: 74, start: 1, end: 1.5 }, { pitch: 76, start: 1.5, end: 2.5 }, { pitch: 77, start: 2.5, end: 3 }, { pitch: 79, start: 3, end: 4 }];
    expect(extractChords(notes, plainSpelling)).toEqual([{ beat: 0, chord: 'C' }]);
  });

  it('writes slash chords from the bass and spells from the key', () => {
    const notes = [...chord([48, 64, 67], 0, 2), ...chord([52, 60, 67], 2, 4), ...chord([46, 62, 65], 4, 8)];
    expect(extractChords(notes, keySpelling('F', 'major')).map((event) => event.chord)).toEqual(['C', 'C/E', 'Bb']);
  });

  it('holds the last chord through single bass notes', () => {
    const notes = [...chord([45, 60, 64], 0, 2), { pitch: 43, start: 2, end: 3 }, { pitch: 41, start: 3, end: 4 }];
    expect(extractChords(notes, plainSpelling)).toEqual([{ beat: 0, chord: 'Am' }]);
  });
});

describe('writing to bars', () => {
  it('places chords at beats inside each bar and repeats a held chord at the bar start', () => {
    const bars = chordsByBar([{ beat: 0, chord: 'Am' }, { beat: 2, chord: 'G' }, { beat: 3, chord: 'F' }, { beat: 6.5, chord: 'C' }], 3, 4);
    expect(bars).toEqual([
      [{ beat: 1, chord: 'Am' }, { beat: 3, chord: 'G' }, { beat: 4, chord: 'F' }],
      [{ beat: 1, chord: 'F' }, { beat: 3.5, chord: 'C' }],
      [{ beat: 1, chord: 'C' }]
    ]);
    expect(formatChordTokens(bars[0], 4)).toBe('Am . G F');
    expect(formatChordTokens(bars[1], 4)).toBe('F*5 C*3');
  });

  it('replaces chords from the start bar, keeps words and adds bars when needed', () => {
    const sections = [{ name: 'Verse', bars: [{ chords: [{ beat: 1, chord: 'D' }], lyric: 'one' }, { chords: [], lyric: 'two' }] }];
    const result = writeTakeToChart(sections, 1, [[{ beat: 1, chord: 'Am' }], [{ beat: 1, chord: 'G' }, { beat: 3, chord: 'F' }]], 4);
    expect(result.sections[0].bars).toEqual([
      { chords: [{ beat: 1, chord: 'D' }], lyric: 'one' },
      { chords: [{ beat: 1, chord: 'Am' }], lyric: 'two' },
      { chords: [{ beat: 1, chord: 'G' }, { beat: 3, chord: 'F' }], lyric: '' }
    ]);
    expect(result.changes.map((change) => [change.barIdx, change.before])).toEqual([[1, []], [2, null]]);
  });

  it('leaves bars before the first played chord alone and drops chords past a shorter bar', () => {
    const sections = [{ name: 'A', bars: [{ chords: [{ beat: 1, chord: 'D' }], lyric: '' }] }, { name: 'B', beatsPerBar: 3, bars: [{ chords: [], lyric: '' }] }];
    const result = writeTakeToChart(sections, 0, [[], [{ beat: 1, chord: 'E' }, { beat: 4, chord: 'A' }]], 4);
    expect(result.sections[0].bars[0].chords).toEqual([{ beat: 1, chord: 'D' }]);
    expect(result.sections[1].bars[0].chords).toEqual([{ beat: 1, chord: 'E' }]);
    expect(writeTakeToChart(sections, 0, [[], []], 4).changes).toEqual([]);
  });
});

describe('from raw playing to chart text', () => {
  it('turns a sloppy, rolled performance with a passing note into Am . G F | C', () => {
    const raw = [
      ...[45, 60, 64].map((pitch, index) => ({ pitch, velocity: 80, start: 0.04 + index * 0.03, end: 1.93 })),
      ...[43, 59, 62].map((pitch, index) => ({ pitch, velocity: 85, start: 1.97 + index * 0.02, end: 2.95 })),
      { pitch: 74, velocity: 70, start: 2.5, end: 2.62 },
      ...[41, 57, 60].map((pitch, index) => ({ pitch, velocity: 90, start: 3.03 + index * 0.01, end: 3.96 })),
      ...[48, 64, 67].map((pitch) => ({ pitch, velocity: 95, start: 4.02, end: 7.9 }))
    ];
    const take = { bpm: 100, beatsPerBar: 4, barCount: 2, notes: raw, pedal: [] };
    const quantized = quantizeTake(take);
    expect(quantized.grid).toBe('1/8');
    const bars = chordsByBar(extractChords(quantized.notes, keySpelling('C', 'major')), 2, 4);
    expect(bars.map((bar) => formatChordTokens(bar, 4))).toEqual(['Am . G F', 'C']);
  });
});
