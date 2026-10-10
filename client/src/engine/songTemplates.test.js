import { describe, expect, it } from 'vitest';
import { findTemplate, templateBarCount, templateSections } from './songTemplates.js';

describe('song templates', () => {
  it('builds the Pop 4/4 outline with empty bars', () => {
    const sections = templateSections('pop');
    expect(sections.map((section) => `${section.name} ${section.bars.length}`)).toEqual([
      'Intro 4', 'Verse 8', 'Chorus 8', 'Verse 8', 'Chorus 8', 'Bridge 4', 'Chorus 8', 'Outro 4'
    ]);
    expect(sections.every((section) => section.bars.every((bar) => bar.chords.length === 0 && bar.lyric === ''))).toBe(true);
    expect(findTemplate('pop').beatsPerBar).toBe(4);
  });

  it('builds the Simple loop outline', () => {
    expect(templateSections('loop').map((section) => `${section.name} ${section.bars.length}`)).toEqual(['Intro 4', 'Verse 16', 'Chorus 16', 'Outro 4']);
    expect(templateBarCount(findTemplate('loop'))).toBe(40);
    expect(templateBarCount(findTemplate('pop'))).toBe(52);
  });

  it('gives every bar its own object so edits never leak', () => {
    const [intro] = templateSections('loop');
    expect(intro.bars[0]).not.toBe(intro.bars[1]);
  });

  it('returns null for an unknown template', () => {
    expect(templateSections('jazz')).toBeNull();
  });
});
