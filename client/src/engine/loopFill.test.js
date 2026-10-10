import { describe, expect, it } from 'vitest';
import { applyLoopToSection, fillLoop, loopBars } from './loopFill.js';
import { remapAnnotations, withBarKeys, withoutBarKeys } from './barKeys.js';

describe('fillLoop', () => {
  it('reads bars separated by bars lines', () => {
    expect(loopBars('Am | Em | F Dm | G')).toEqual(['Am', 'Em', 'F Dm', 'G']);
    expect(loopBars(' | ')).toEqual([]);
  });

  it('repeats the loop when the section has more bars than the loop', () => {
    expect(fillLoop('Am | F Dm | G', 7)).toEqual(['Am', 'F Dm', 'G', 'Am', 'F Dm', 'G', 'Am']);
  });

  it('cuts the loop when it is longer than the section', () => {
    expect(fillLoop('C | G | Am | F | Dm | E', 4)).toEqual(['C', 'G', 'Am', 'F']);
  });

  it('gives nothing for an empty loop', () => {
    expect(fillLoop('', 4)).toEqual([]);
  });
});

describe('applyLoopToSection', () => {
  const sections = [
    { name: 'Intro', bars: [{ chords: [], lyric: '' }] },
    { name: 'Verse', bars: [{ chords: [{ beat: 1, chord: 'C' }], lyric: 'first line' }, { chords: [], lyric: '' }, { chords: [], lyric: '' }] }
  ];

  it('replaces the chords and keeps the words', () => {
    const result = applyLoopToSection(sections, 1, fillLoop('Am | F G', 3), 4);
    expect(result.sections[1].bars).toEqual([
      { chords: [{ beat: 1, chord: 'Am' }], lyric: 'first line' },
      { chords: [{ beat: 1, chord: 'F' }, { beat: 3, chord: 'G' }], lyric: '' },
      { chords: [{ beat: 1, chord: 'Am' }], lyric: '' }
    ]);
    expect(result.sections[0]).toBe(sections[0]);
  });

  it('grows the section with empty bars', () => {
    expect(applyLoopToSection(sections, 1, fillLoop('Am', 5), 4).sections[1].bars).toHaveLength(5);
  });

  it('refuses to drop bars that have words', () => {
    expect(applyLoopToSection(sections, 1, [], 4).error).toMatch(/at least one bar/);
    const wordy = [{ name: 'Verse', bars: [{ chords: [], lyric: '' }, { chords: [], lyric: 'second line' }] }];
    expect(applyLoopToSection(wordy, 0, ['C'], 4).error).toBe('That would remove bars with words. Fill at least 2 bars.');
  });

  it('takes any number of chords in a loop bar, up to 16', () => {
    const loop = fillLoop('Am Dm G C | Em | F', 3);
    const bars = applyLoopToSection(sections, 1, loop, 4).sections[1].bars;
    expect(bars[0].chords.map((entry) => [entry.chord, entry.beat])).toEqual([['Am', 1], ['Dm', 2], ['G', 3], ['C', 4]]);
    expect(bars[2].chords).toEqual([{ beat: 1, chord: 'F' }]);
    expect(applyLoopToSection(sections, 1, ['C '.repeat(17)], 3).error).toMatch(/more than 16 chords/);
  });
});

describe('stage notes follow their bars', () => {
  it('moves notes when an earlier section grows and drops notes on removed bars', () => {
    const keyed = withBarKeys([{ name: 'A', bars: [{ chords: [] }, { chords: [] }] }, { name: 'B', bars: [{ chords: [] }] }]);
    const grown = [{ ...keyed[0], bars: [...keyed[0].bars, { chords: [] }] }, keyed[1]];
    const notes = [{ barIdx: 2, text: 'cue' }, { barIdx: 1, text: 'other' }];
    expect(remapAnnotations(notes, grown)).toEqual([{ barIdx: 3, text: 'cue' }, { barIdx: 1, text: 'other' }]);
    expect(remapAnnotations(notes, [keyed[1]])).toEqual([{ barIdx: 0, text: 'cue' }]);
    expect(withoutBarKeys(grown)[0].bars[0]).toEqual({ chords: [] });
  });
});
