import { describe, expect, it } from 'vitest';
import { barAt, beatsAtBar, locateBar, readChartText, tooManyChords, totalBarCount, updateBar } from './chartEdits.js';
import { formatChart, parseChart } from './parseChart.js';

const chart = '# Verse\nC / first line\nG\n# Bridge ts=3\nAm F / second line\n.';
const sections = parseChart(chart, { beatsPerBar: 4 });

describe('bar addressing', () => {
  it('counts bars across sections', () => {
    expect(totalBarCount(sections)).toBe(4);
  });

  it('finds the section and the bar inside it', () => {
    expect(locateBar(sections, 0)).toEqual({ sectionIdx: 0, barInSection: 0 });
    expect(locateBar(sections, 2)).toEqual({ sectionIdx: 1, barInSection: 0 });
    expect(locateBar(sections, 4)).toBeNull();
    expect(barAt(sections, 2).lyric).toBe('second line');
  });

  it('knows the beats of a bar from its section', () => {
    expect(beatsAtBar(sections, 1, 4)).toBe(4);
    expect(beatsAtBar(sections, 3, 4)).toBe(3);
  });

  it('changes one bar and leaves the rest alone', () => {
    const changed = updateBar(sections, 3, { lyric: 'new words' });
    expect(barAt(changed, 3).lyric).toBe('new words');
    expect(changed[0]).toBe(sections[0]);
    expect(barAt(sections, 3).lyric).toBe('');
  });
});

describe('readChartText', () => {
  it('round-trips the visual data through text without loss', () => {
    const text = formatChart(sections, { beatsPerBar: 4 });
    expect(readChartText(text, { beatsPerBar: 4 }).sections).toEqual(sections);
  });

  it('refuses text without bars', () => {
    expect(readChartText('# Verse\n', { beatsPerBar: 4 }).error).toMatch(/no bars/);
    expect(readChartText('   ', { beatsPerBar: 4 }).error).toMatch(/no bars/);
  });

  it('takes up to 16 chords in a bar, in any time signature', () => {
    expect(readChartText('# A ts=3\nC D E F', { beatsPerBar: 4 }).sections).toHaveLength(1);
    expect(readChartText(`# A\nC\n${'G '.repeat(17)}`, { beatsPerBar: 4 }).error).toBe('Bar 2 has more than 16 chords.');
  });

  it('spots a crowded chord field', () => {
    expect(tooManyChords('C '.repeat(17))).toBe(true);
    expect(tooManyChords('C G Am F Dm Em G7 C')).toBe(false);
  });
});
