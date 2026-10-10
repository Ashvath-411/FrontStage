import { describe, it, expect } from 'vitest';
import { parseChart, formatChart } from './parseChart.js';

describe('parseChart', () => {
  it('reads several sections with their bars', () => {
    const sections = parseChart('# Verse 1\nC / hello\nG / world\n# Chorus\nF / la', { beatsPerBar: 4 });
    expect(sections.map((section) => section.name)).toEqual(['Verse 1', 'Chorus']);
    expect(sections[0].bars).toHaveLength(2);
    expect(sections[1].bars[0]).toEqual({ chords: [{ beat: 1, chord: 'F' }], lyric: 'la' });
  });

  it('shares the bar equally between chords', () => {
    const [section] = parseChart('Am F', { beatsPerBar: 4 });
    expect(section.bars[0].chords).toEqual([{ beat: 1, chord: 'Am' }, { beat: 3, chord: 'F' }]);
  });

  it('holds the previous chord on a dot', () => {
    const [section] = parseChart('# A\nF . C G / words', { beatsPerBar: 4 });
    expect(section.bars[0].chords).toEqual([
      { beat: 1, chord: 'F' },
      { beat: 3, chord: 'C' },
      { beat: 4, chord: 'G' }
    ]);
  });

  it('keeps an empty lyric and a bar without chords', () => {
    const [section] = parseChart('# A\nAm /\n.\n/ only words', { beatsPerBar: 4 });
    expect(section.bars).toEqual([
      { chords: [{ beat: 1, chord: 'Am' }], lyric: '' },
      { chords: [], lyric: '' },
      { chords: [], lyric: 'only words' }
    ]);
  });

  it('reads tempo and time signature changes', () => {
    const sections = parseChart('# Verse bpm=92\nC D E\n# Chorus bpm=100 ts=3\nC D E', { beatsPerBar: 4 });
    expect(sections[0]).toMatchObject({ name: 'Verse', bpm: 92 });
    expect(sections[0].beatsPerBar).toBeUndefined();
    expect(sections[1]).toMatchObject({ name: 'Chorus', bpm: 100, beatsPerBar: 3 });
    expect(sections[0].bars[0].chords.map((chord) => chord.beat)).toEqual([1, 2.3333, 3.6667]);
    expect(sections[1].bars[0].chords.map((chord) => chord.beat)).toEqual([1, 2, 3]);
  });

  it('keeps slash chords and splits the lyric on a spaced slash', () => {
    const [section] = parseChart('C/E G / and/or', { beatsPerBar: 4 });
    expect(section.bars[0]).toEqual({ chords: [{ beat: 1, chord: 'C/E' }, { beat: 3, chord: 'G' }], lyric: 'and/or' });
  });

  it('puts bars before any header into a default section', () => {
    const sections = parseChart('C\n\nG', { beatsPerBar: 4 });
    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe('Song');
    expect(sections[0].bars).toHaveLength(2);
  });
});

describe('formatChart', () => {
  it('writes text that parses back to the same sections', () => {
    const text = '# Verse bpm=92\nF . C G / words\n.\nAm F /\n# Bridge ts=3\nC . G\n/ la la';
    const sections = parseChart(text, { beatsPerBar: 4 });
    expect(parseChart(formatChart(sections, { beatsPerBar: 4 }), { beatsPerBar: 4 })).toEqual(sections);
  });
});
