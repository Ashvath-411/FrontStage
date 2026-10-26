import { describe, it, expect } from 'vitest';
import { autoGridOrder, chooseAutoGrid, clusterOnsets, gridStep, quantizeTake, rolledChordWindow, withTimingOffset } from './quantize.js';

const patterns = {
  '1/4': [0, 1, 2, 3, 4, 5, 6, 7],
  '1/8': [0, 0.5, 1, 2, 2.5, 3, 4, 4.5, 5.5, 6, 7, 7.5],
  '1/8T': [0, 1, 2, 4, 6, 7, 8, 9, 12, 13, 15, 18, 20, 21].map((third) => third / 3),
  '1/16': [0, 0.25, 0.5, 0.75, 1, 2, 2.25, 2.75, 3, 4, 4.5, 4.75, 5, 6, 6.25, 7],
  '1/16T': [0, 1, 2, 3, 4, 5, 6, 12, 13, 15, 18, 24, 25, 26, 30, 36, 39, 42].map((sixth) => sixth / 6)
};
const tempos = [80, 120];

function msToBeats(ms, bpm) {
  return ms / (60000 / bpm);
}

function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function takeFrom(starts, bpm, length = 0.1) {
  const notes = starts.map((start, index) => ({ pitch: 60 + (index % 7), velocity: 90, start, end: start + length }));
  return { bpm, beatsPerBar: 4, barCount: 2, pedal: [], notes };
}

function played(grid, bpm, timing) {
  const random = seeded(bpm * 7 + autoGridOrder.indexOf(grid));
  return patterns[grid].map((beat) => beat + msToBeats(timing(random), bpm));
}

const perfect = () => 0;
const jitter20 = (random) => (random() * 2 - 1) * 20;
const late50 = () => 50;

function starts(take, settings) {
  return quantizeTake(take, { strength: 100, lengthSnap: false, ...settings }).notes.map((note) => note.start);
}

function expectOnGrid(actual, expected) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((beat, index) => expect(beat).toBeCloseTo(expected[index], 9));
}

function lateBeyondHalfStep(grid, bpm) {
  return msToBeats(50, bpm) >= gridStep(grid) / 2;
}

describe.each(tempos)('synthetic takes at %i BPM', (bpm) => {
  describe.each(autoGridOrder)('grid %s', (grid) => {
    const pattern = patterns[grid];

    it('perfect timing stays exactly on the grid and auto finds the grid', () => {
      const take = takeFrom(played(grid, bpm, perfect), bpm);
      expectOnGrid(starts(take, { grid }), pattern);
      expect(quantizeTake(take).grid).toBe(grid);
    });

    it('20 ms jitter lands every note on its grid line and auto finds the grid', () => {
      const take = takeFrom(played(grid, bpm, jitter20), bpm);
      expectOnGrid(starts(take, { grid }), pattern);
      expect(quantizeTake(take).grid).toBe(grid);
    });

    it('50 ms constant lateness lands on the nearest grid line, and the timing offset removes it', () => {
      const take = takeFrom(played(grid, bpm, late50), bpm);
      const nearest = lateBeyondHalfStep(grid, bpm) ? pattern.map((beat) => beat + gridStep(grid)) : pattern;
      expectOnGrid(starts(take, { grid }), nearest);
      expectOnGrid(starts(withTimingOffset(take, 50), { grid }), pattern);
      expect(quantizeTake(withTimingOffset(take, 50)).grid).toBe(grid);
      if (!lateBeyondHalfStep(grid, bpm)) expect(quantizeTake(take).grid).toBe(grid);
    });

    it('rolled chords land all their notes on one grid line, even when the roll starts early', () => {
      const chordBeats = pattern.filter((_, index) => index % 2 === 0);
      const rollMs = [-20, -6, 8, 18];
      const notes = chordBeats.flatMap((beat, chordIdx) => rollMs.map((ms, noteIdx) => ({ pitch: 48 + noteIdx * 4 + (chordIdx % 3), velocity: 80, start: beat + msToBeats(ms, bpm), end: beat + 0.9 * gridStep(grid) })));
      const take = { bpm, beatsPerBar: 4, barCount: 2, pedal: [], notes };
      const result = quantizeTake(take, { grid, strength: 100, lengthSnap: false });
      expectOnGrid(result.notes.map((note) => note.start), chordBeats.flatMap((beat) => rollMs.map(() => beat)));
      expect(clusterOnsets(notes, rolledChordWindow(bpm, gridStep(grid)))).toHaveLength(chordBeats.length);
    });
  });
});

describe('Logic-style behaviour', () => {
  it('0% strength leaves notes untouched and lengths never change unless length snap is on', () => {
    const take = takeFrom(played('1/8', 120, jitter20).map((beat) => beat + 1), 120, 0.37);
    const untouched = quantizeTake(take, { grid: '1/8', strength: 0, lengthSnap: false });
    expect(untouched.notes.map((note) => [note.start, note.end])).toEqual(take.notes.map((note) => [note.start, note.end]));
    const full = quantizeTake(take, { grid: '1/8', strength: 100, lengthSnap: false });
    full.notes.forEach((note) => expect(note.end - note.start).toBeCloseTo(0.37, 9));
    expect(quantizeTake(take).notes.every((note) => Math.abs(note.end - note.start - 0.37) < 1e-9)).toBe(true);
  });

  it('a chord played slightly early does not land a step early', () => {
    const notes = [1.86, 1.9, 1.94, 1.95].map((start, index) => ({ pitch: 60 + index * 3, velocity: 80, start, end: 2.9 }));
    const result = quantizeTake({ bpm: 120, beatsPerBar: 4, barCount: 1, pedal: [], notes }, { grid: '1/16', strength: 100, lengthSnap: false });
    expect(result.notes.map((note) => note.start)).toEqual([2, 2, 2, 2]);
  });

  it('gives chord extraction fully snapped boundaries whatever the strength', () => {
    const take = takeFrom([0.04, 1.97], 120, 0.9);
    const result = quantizeTake(take, { grid: '1/4', strength: 40, lengthSnap: false });
    expect(result.notes[1].start).toBeCloseTo(1.982, 9);
    expect(result.chordNotes.map((note) => [note.start, note.end])).toEqual([[0, 1], [2, 3]]);
  });

  it('auto keeps a simple grid for players who are consistently late', () => {
    const random = seeded(5);
    const shapes = { '1/4': [0, 1, 2, 3, 4, 5, 6, 7], '1/8': [0, 1, 1.5, 2, 3, 3.5, 4, 5, 5.5] };
    let right = 0;
    let total = 0;
    for (const lateMs of [40, 70]) {
      for (const [grid, beats] of Object.entries(shapes)) {
        for (let round = 0; round < 100; round += 1) {
          total += 1;
          const anchors = beats.map((beat) => beat + msToBeats(lateMs + (random() * 2 - 1) * 10, 100));
          if (chooseAutoGrid(anchors) === grid) right += 1;
        }
      }
    }
    expect(right / total).toBeGreaterThan(0.95);
  });

  it('the timing offset moves the whole take earlier, pedal included', () => {
    const take = { ...takeFrom([1.1], 120, 0.5), pedal: [{ beat: 1.1, down: true }] };
    const shifted = withTimingOffset(take, 50);
    expect(shifted.notes[0].start).toBeCloseTo(1, 9);
    expect(shifted.notes[0].end).toBeCloseTo(1.5, 9);
    expect(shifted.pedal[0].beat).toBeCloseTo(1, 9);
    expect(withTimingOffset(take, 0)).toBe(take);
  });
});
