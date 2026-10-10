import { describe, expect, it } from 'vitest';
import { formatChordTokens, parseChordTokens } from './parseChart.js';
import { buildTimeline, positionAt } from './timeline.js';
import { beatsBetween } from './beats.js';
import { transposeChord } from './transpose.js';
import { chordsFromWeighted, moveChordAt, removeChordAt, setWeightAt, weightedChords } from './barChords.js';

const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'A7', 'B7'];
const beatsOf = (text, beatsPerBar) => parseChordTokens(text, beatsPerBar).map((entry) => entry.beat);

describe('any number of chords in a bar', () => {
  it('splits a 4/4 bar evenly for 1, 2, 3, 4, 6 and 16 chords', () => {
    expect(beatsOf('C', 4)).toEqual([1]);
    expect(beatsOf('C G', 4)).toEqual([1, 3]);
    expect(beatsOf('C G Am', 4)).toEqual([1, 2.3333, 3.6667]);
    expect(beatsOf('C G Am F', 4)).toEqual([1, 2, 3, 4]);
    expect(beatsOf('C G Am F Dm Em', 4)).toEqual([1, 1.6667, 2.3333, 3, 3.6667, 4.3333]);
    expect(beatsOf(names.join(' '), 4)).toEqual(Array.from({ length: 16 }, (_, index) => 1 + index / 4));
  });

  it('splits a 6/8 bar for 3 and 6 chords', () => {
    expect(beatsOf('C G Am', 6)).toEqual([1, 3, 5]);
    expect(beatsOf('C G Am F Dm Em', 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('reads weights', () => {
    expect(parseChordTokens('Am*3 G', 4)).toEqual([{ beat: 1, chord: 'Am' }, { beat: 4, chord: 'G' }]);
    expect(parseChordTokens('Am*2 G F', 4)).toEqual([{ beat: 1, chord: 'Am' }, { beat: 3, chord: 'G' }, { beat: 4, chord: 'F' }]);
    expect(parseChordTokens('.*2 C*2', 4)).toEqual([{ beat: 3, chord: 'C' }]);
    expect(parseChordTokens('.*2 C', 4)).toEqual([{ beat: 3.6667, chord: 'C' }]);
  });

  it('round-trips text to data to text', () => {
    const cases = [['Am Dm G C', 4], ['Am*3 G', 4], ['C G Am', 4], ['C G Am F Dm Em', 4], [names.join(' '), 4], ['F . C G', 4], ['. C', 4], ['Am*2 G F Em', 4], ['C G Am', 6], ['C*3 G*2 F', 4]];
    for (const [text, beatsPerBar] of cases) {
      const data = parseChordTokens(text, beatsPerBar);
      const formatted = formatChordTokens(data, beatsPerBar);
      expect(parseChordTokens(formatted, beatsPerBar)).toEqual(data);
    }
    expect(formatChordTokens(parseChordTokens('Am*3 G', 4), 4)).toBe('Am . . G');
    expect(formatChordTokens(parseChordTokens('C G Am', 4), 4)).toBe('C G Am');
    expect(formatChordTokens(parseChordTokens('C*3 G*2 F', 4), 4)).toBe('C*3 G*2 F');
  });

  it('transposes every chord in a busy bar', () => {
    const transposed = parseChordTokens('Am Dm G C E7 F/A', 4).map((entry) => transposeChord(entry.chord, 2));
    expect(transposed).toEqual(['Bm', 'Em', 'A', 'D', 'F#7', 'G/B']);
  });

  it('keeps old one and two chord data and its timing unchanged', () => {
    const old = [{ beat: 1, chord: 'C' }, { beat: 4, chord: 'G' }];
    expect(formatChordTokens(old, 4)).toBe('C . . G');
    expect(parseChordTokens(formatChordTokens(old, 4), 4)).toEqual(old);
    const oldHalf = [{ beat: 1, chord: 'C' }, { beat: 3, chord: 'G' }];
    expect(parseChordTokens(formatChordTokens(oldHalf, 4), 4)).toEqual(oldHalf);
    const oldThirds = [{ beat: 1, chord: 'C' }, { beat: 2, chord: 'D' }, { beat: 3, chord: 'E' }];
    expect(parseChordTokens(formatChordTokens(oldThirds, 4), 4)).toEqual(oldThirds);
  });

  it('edits chips: weight, move and remove', () => {
    const entries = weightedChords(parseChordTokens('C G Am F', 4), 4);
    expect(chordsFromWeighted(setWeightAt(entries, 0, 2), 4).map((entry) => entry.beat)).toEqual([1, 2.6, 3.4, 4.2]);
    expect(chordsFromWeighted(moveChordAt(entries, 3, -1), 4).map((entry) => entry.chord)).toEqual(['C', 'G', 'F', 'Am']);
    expect(chordsFromWeighted(removeChordAt(entries, 1), 4)).toEqual([{ beat: 1, chord: 'C' }, { beat: 2.3333, chord: 'Am' }, { beat: 3.6667, chord: 'F' }]);
    expect(weightedChords([], 4)).toEqual([{ chord: null, weight: 1 }]);
  });
});

function item(chordText, tempoPct = 100) {
  return {
    tempoPct,
    countInBars: 0,
    gapMode: 'countdown',
    gapSeconds: 4,
    sections: [{ name: 'A', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 2 }],
    bars: [{ chords: parseChordTokens(chordText, 4) }, { chords: parseChordTokens('Em', 4) }]
  };
}

describe('timing with many chords', () => {
  it('finds the current chord inside a 4-chord bar at 50% and 200% tempo', () => {
    for (const tempoPct of [50, 200]) {
      const timelines = [buildTimeline(item('C G Am F', tempoPct))];
      const beatMs = 500 / (tempoPct / 100);
      const chordsAt = [0, 1, 2, 3, 4].map((beat) => timelines[0].chords[positionAt(timelines, 0, beat * beatMs + beatMs / 2, true).chordIdx].chord);
      expect(chordsAt).toEqual(['C', 'G', 'Am', 'F', 'Em']);
    }
  });

  it('finds chords that start between beats', () => {
    const timelines = [buildTimeline(item('C G Am'))];
    const chordAt = (ms) => timelines[0].chords[positionAt(timelines, 0, ms, true).chordIdx].chord;
    expect([chordAt(600), chordAt(700), chordAt(1300), chordAt(1400)]).toEqual(['C', 'G', 'G', 'Am']);
  });

  it('clicks the same beats for a bar with 4 chords as for a bar with 1', () => {
    const busy = [buildTimeline(item('C G Am F'))];
    const plain = [buildTimeline(item('C'))];
    expect(beatsBetween(busy, 0, true, 0, 4000)).toEqual(beatsBetween(plain, 0, true, 0, 4000));
  });
});
