import { describe, expect, it } from 'vitest';
import { applyLyrics } from './pasteLyrics.js';

const chart = ['# Verse', 'C', 'G / old words', '.', 'Am F', '# Chorus', 'F', 'C'].join('\n');

describe('applyLyrics', () => {
  it('puts one line on each bar and keeps chords and headers', () => {
    const result = applyLyrics(chart, 'first line\nsecond line', { startBar: 1, barsPerLine: 1 });
    expect(result.text.split('\n')).toEqual(['# Verse', 'C / first line', 'G / second line', '.', 'Am F', '# Chorus', 'F', 'C']);
    expect(result).toMatchObject({ placedLines: 2, unplacedLines: 0 });
  });

  it('puts each line on the first bar of its group and clears the rest of the group', () => {
    const result = applyLyrics(chart, 'first line\nsecond line', { startBar: 1, barsPerLine: 2 });
    expect(result.text.split('\n').slice(1, 5)).toEqual(['C / first line', 'G', '/ second line', 'Am F']);
  });

  it('starts at the chosen bar and counts bars across sections', () => {
    const result = applyLyrics(chart, 'first line\nsecond line', { startBar: 4, barsPerLine: 2 });
    expect(result.text.split('\n').slice(4)).toEqual(['Am F / first line', '# Chorus', 'F', 'C / second line']);
  });

  it('skips one group for a blank line', () => {
    const result = applyLyrics(chart, 'first line\n\nsecond line', { startBar: 1, barsPerLine: 1 });
    expect(result.text.split('\n').slice(1, 4)).toEqual(['C / first line', 'G / old words', '/ second line']);
  });

  it('counts the lines that run past the end', () => {
    const result = applyLyrics(chart, 'first line\nsecond line\nthird line\nfourth line\n\n', { startBar: 2, barsPerLine: 2 });
    expect(result).toMatchObject({ placedLines: 3, unplacedLines: 1 });
    expect(result.text.split('\n').at(-1)).toBe('C / third line');
  });

  it('leaves the chart unchanged for empty text', () => {
    expect(applyLyrics(chart, '\n\n', { startBar: 1, barsPerLine: 4 }).text).toBe(chart);
  });
});
