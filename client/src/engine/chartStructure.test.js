import { describe, expect, it } from 'vitest';
import { addSection, chartDurationMs, deleteSection, duplicateSection, moveSection } from './chartStructure.js';

const sections = [
  { name: 'Verse', bars: [{ chords: [{ beat: 1, chord: 'C' }], lyric: 'first line' }] },
  { name: 'Chorus', bpm: 120, bars: [{ chords: [{ beat: 1, chord: 'F' }], lyric: 'second line' }, { chords: [], lyric: '' }] }
];

describe('structure builder', () => {
  it('adds a section of empty bars with an optional tempo', () => {
    const { sections: added } = addSection(sections, { name: ' Bridge ', barCount: 4, bpm: 90 });
    expect(added.at(-1)).toEqual({ name: 'Bridge', bpm: 90, bars: Array(4).fill({ chords: [], lyric: '' }) });
    expect(addSection(sections, { name: 'Outro', barCount: 8 }).sections.at(-1)).not.toHaveProperty('bpm');
  });

  it('refuses a section without a name or with a bad size or tempo', () => {
    expect(addSection(sections, { name: ' ', barCount: 4 }).error).toMatch(/name/);
    expect(addSection(sections, { name: 'Intro', barCount: 0 }).error).toMatch(/1 to 64/);
    expect(addSection(sections, { name: 'Intro', barCount: 4, bpm: 500 }).error).toMatch(/Tempo/);
  });

  it('moves a section up or down and ignores moves past the ends', () => {
    expect(moveSection(sections, 1, -1).sections.map((section) => section.name)).toEqual(['Chorus', 'Verse']);
    expect(moveSection(sections, 1, 1).sections).toBe(sections);
  });

  it('duplicates a section right after itself with or without the words', () => {
    const withWords = duplicateSection(sections, 0, true).sections;
    expect(withWords.map((section) => section.name)).toEqual(['Verse', 'Verse', 'Chorus']);
    expect(withWords[1].bars[0].lyric).toBe('first line');
    const withoutWords = duplicateSection(sections, 1, false).sections;
    expect(withoutWords[2]).toMatchObject({ name: 'Chorus', bpm: 120 });
    expect(withoutWords[2].bars[0]).toEqual({ chords: [{ beat: 1, chord: 'F' }], lyric: '' });
  });

  it('deletes a section', () => {
    expect(deleteSection(sections, 0).sections.map((section) => section.name)).toEqual(['Chorus']);
  });

  it('estimates the duration from the song tempo and section overrides', () => {
    expect(chartDurationMs(sections, { bpm: 60, beatsPerBar: 4 })).toBe(4000 + 4000);
  });
});
