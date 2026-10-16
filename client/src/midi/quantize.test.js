import { describe, it, expect } from 'vitest';
import { chooseAutoGrid, clusterOnsets, gridCost, quantizeTake, rolledChordWindow, snapToGrid } from './quantize.js';

function takeOf(starts, { length = 0.4, bpm = 120 } = {}) {
  return { bpm, beatsPerBar: 4, barCount: 4, pedal: [], notes: starts.map((start, index) => ({ pitch: 60 + (index % 5), velocity: 90, start, end: start + length })) };
}

const jitter = [0.03, -0.04, 0.02, -0.01, 0.05, -0.03, 0.01, -0.02];
const humanize = (beats) => beats.map((beat, index) => beat + jitter[index % jitter.length]);

describe('snapping and clusters', () => {
  it('snaps to the nearest grid line', () => {
    expect(snapToGrid(1.12, 0.25)).toBe(1);
    expect(snapToGrid(1.13, 0.25)).toBe(1.25);
    expect(snapToGrid(0.3, 1 / 3)).toBeCloseTo(1 / 3, 9);
  });

  it('groups a rolled chord into one cluster but keeps fast notes apart', () => {
    const notes = [0.02, 0.06, 0.1, 0.5].map((start) => ({ start }));
    expect(clusterOnsets(notes, rolledChordWindow(120)).map((cluster) => cluster.notes.length)).toEqual([3, 1]);
    expect(rolledChordWindow(120)).toBeCloseTo(0.15, 9);
    expect(rolledChordWindow(60)).toBeCloseTo(0.08, 9);
  });
});

describe('auto grid', () => {
  it('picks the coarsest grid that fits the playing', () => {
    expect(chooseAutoGrid(humanize([0, 1, 2, 3, 4, 5, 6, 7]))).toBe('1/4');
    expect(chooseAutoGrid(humanize([0, 1, 2, 3.5, 4, 5, 6, 7.5]))).toBe('1/8');
    expect(chooseAutoGrid(humanize([0, 1 / 3, 2 / 3, 1, 4 / 3, 5 / 3, 2, 7 / 3]))).toBe('1/8T');
    expect(chooseAutoGrid(humanize([0, 0.25, 0.5, 0.75, 1, 1.75, 2, 2.25]))).toBe('1/16');
    expect(chooseAutoGrid([0, 1 / 6, 0.5, 5 / 6, 1, 1 + 1 / 6])).toBe('1/16T');
    expect(chooseAutoGrid([0, 1, 2, 2.75, 3, 4])).toBe('1/16');
    expect(chooseAutoGrid([])).toBe('1/4');
  });

  it('rejects a grid that would move a note almost half a step', () => {
    expect(gridCost([0, 1, 2.5], '1/4')).toBe(Infinity);
    expect(gridCost([0, 1, 2], '1/4')).toBe(0);
    expect(gridCost([0, 1, 2], '1/8')).toBe(0.01);
  });

  it('recognises the grid in simulated human playing', () => {
    let seed = 11;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const timingError = (spreadMs, bpm) => ((random() + random() + random() - 1.5) * spreadMs * 2) / (60000 / bpm);
    const patterns = { '1/4': [0, 1, 2, 3, 4, 5], '1/8': [0, 1, 1.5, 2, 3, 3.5], '1/8T': [0, 1 / 3, 2 / 3, 1, 2, 7 / 3], '1/16': [0, 0.25, 0.5, 0.75, 1, 2] };
    let right = 0;
    let total = 0;
    for (const [grid, beats] of Object.entries(patterns)) {
      for (let round = 0; round < 100; round += 1) {
        total += 1;
        if (chooseAutoGrid(beats.map((beat) => beat + timingError(15, 100))) === grid) right += 1;
      }
    }
    expect(right / total).toBeGreaterThan(0.9);
  });
});

describe('quantizeTake', () => {
  it('moves every note onto the auto grid and reports the grid', () => {
    const result = quantizeTake(takeOf(humanize([0, 1, 2, 3])));
    expect(result.grid).toBe('1/4');
    expect(result.notes.map((note) => note.start)).toEqual([0, 1, 2, 3]);
  });

  it('aligns all notes of a rolled chord to one beat', () => {
    const take = takeOf([1.96, 2.02, 2.08, 3.01]);
    const result = quantizeTake(take, { grid: '1/16', strength: 100, lengthSnap: false });
    expect(result.notes.map((note) => note.start)).toEqual([2, 2, 2, 3]);
  });

  it('applies strength as a fraction of the distance', () => {
    const result = quantizeTake(takeOf([1.2]), { grid: '1/4', strength: 50, lengthSnap: false });
    expect(result.notes[0].start).toBeCloseTo(1.1, 9);
    expect(result.notes[0].end).toBeCloseTo(1.5, 9);
  });

  it('snaps note ends when length snap is on, never shorter than one step', () => {
    const take = takeOf([0.02, 1.01], { length: 0.93 });
    const snapped = quantizeTake(take, { grid: '1/4', strength: 100, lengthSnap: true });
    expect(snapped.notes.map((note) => [note.start, note.end])).toEqual([[0, 1], [1, 2]]);
    const short = quantizeTake(takeOf([0], { length: 0.1 }), { grid: '1/8', strength: 100, lengthSnap: true });
    expect(short.notes[0].end).toBe(0.5);
  });

  it('never changes the raw take, so re-quantizing starts from the original', () => {
    const take = takeOf(humanize([0, 1, 2, 3]));
    const before = JSON.stringify(take);
    quantizeTake(take, { grid: '1/16', strength: 100, lengthSnap: true });
    quantizeTake(take, { grid: '1/4', strength: 30, lengthSnap: false });
    expect(JSON.stringify(take)).toBe(before);
  });

  it('moves pickups to bar 1 and keeps notes inside the take', () => {
    const take = { ...takeOf([-0.3, 15.9], { length: 1 }), pedal: [{ beat: -0.2, down: true }] };
    const result = quantizeTake(take, { grid: '1/4', strength: 100, lengthSnap: false });
    expect(result.notes[0].start).toBe(0);
    expect(result.notes[1].end).toBe(16);
    expect(result.pedal[0].beat).toBe(0);
  });
});
