import { beatSeconds } from './recorder.js';

export const gridDivisions = { '1/4': 1, '1/8': 2, '1/8T': 3, '1/16': 4, '1/16T': 6 };
export const autoGridOrder = ['1/4', '1/8', '1/8T', '1/16', '1/16T'];
export const autoFallbackGrid = '1/16';
export const gridPenaltyBeats = { '1/4': 0, '1/8': 0.01, '1/16': 0.02, '1/8T': 0.025, '1/16T': 0.035 };
export const autoSpreadLimit = 0.35;
export const autoSteadyOffsetLimit = 0.45;
export const rolledChordWindowMs = 50;
export const rolledChordMaxBeats = 0.15;
export const defaultQuantize = { grid: 'auto', strength: 100, lengthSnap: false };

export function gridStep(grid) {
  return 1 / gridDivisions[grid];
}

export function snapToGrid(beat, grid) {
  const divisions = gridDivisions[grid];
  return Math.round(beat * divisions) / divisions + 0;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function clusterOnsets(notes, windowBeats) {
  const clusters = [];
  [...notes].sort((first, second) => first.start - second.start).forEach((note) => {
    const current = clusters.at(-1);
    if (current && note.start - current.notes[0].start <= windowBeats) current.notes.push(note);
    else clusters.push({ notes: [note] });
  });
  return clusters.map((cluster) => ({ ...cluster, anchor: average(cluster.notes.map((note) => note.start)) }));
}

export function steadyOffset(anchors, grid) {
  return median(anchors.map((anchor) => anchor - snapToGrid(anchor, grid)));
}

export function gridCost(anchors, grid) {
  const step = gridStep(grid);
  const offset = steadyOffset(anchors, grid);
  const spread = anchors.map((anchor) => Math.abs(anchor - snapToGrid(anchor, grid) - offset));
  if (Math.abs(offset) > autoSteadyOffsetLimit * step || Math.max(...spread) > autoSpreadLimit * step) return Infinity;
  return average(spread) + gridPenaltyBeats[grid];
}

export function chooseAutoGrid(anchors) {
  if (anchors.length === 0) return autoGridOrder[0];
  let best = { grid: autoFallbackGrid, cost: Infinity };
  for (const grid of autoGridOrder) {
    const cost = gridCost(anchors, grid);
    if (cost < best.cost) best = { grid, cost };
  }
  return best.grid;
}

export function rolledChordWindow(bpm, step = Infinity) {
  return Math.min(rolledChordMaxBeats, step / 2, rolledChordWindowMs / 1000 / beatSeconds(bpm));
}

function finestStep() {
  return Math.min(...autoGridOrder.map(gridStep));
}

export function withTimingOffset(take, offsetMs) {
  if (!offsetMs) return take;
  const shift = offsetMs / 1000 / beatSeconds(take.bpm);
  const move = (beat) => beat - shift;
  return { ...take, notes: take.notes.map((note) => ({ ...note, start: move(note.start), end: move(note.end) })), pedal: take.pedal.map((change) => ({ ...change, beat: move(change.beat) })) };
}

function moveToward(value, target, strength) {
  return value + (target - value) * strength;
}

function snappedEnd(note, target, grid) {
  return Math.max(target + gridStep(grid), snapToGrid(note.end, grid));
}

function quantizeNote(note, target, grid, settings, lastBeat) {
  const strength = settings.strength / 100;
  const start = Math.max(0, moveToward(note.start, target, strength));
  const end = settings.lengthSnap ? moveToward(note.end, snappedEnd(note, target, grid), strength) : start + (note.end - note.start);
  return { ...note, start, end: Math.min(lastBeat, Math.max(end, start + 0.01)) };
}

function byStart(first, second) {
  return first.start - second.start || first.pitch - second.pitch;
}

export function quantizeTake(take, settings = defaultQuantize) {
  const autoClusters = settings.grid === 'auto' ? clusterOnsets(take.notes, rolledChordWindow(take.bpm, finestStep())) : [];
  const grid = settings.grid === 'auto' ? chooseAutoGrid(autoClusters.map((cluster) => cluster.anchor)) : settings.grid;
  const clusters = clusterOnsets(take.notes, rolledChordWindow(take.bpm, gridStep(grid)));
  const placed = clusters.map((cluster) => ({ notes: cluster.notes, target: Math.max(0, snapToGrid(cluster.anchor, grid)) }));
  const lastTarget = Math.max(0, ...placed.map((cluster) => cluster.target));
  const barCount = Math.max(take.barCount, Math.floor(lastTarget / take.beatsPerBar) + 1);
  const lastBeat = barCount * take.beatsPerBar;
  const notes = placed.flatMap(({ notes: clusterNotes, target }) => clusterNotes.map((note) => quantizeNote(note, target, grid, settings, lastBeat)));
  const chordNotes = placed.flatMap(({ notes: clusterNotes, target }) => clusterNotes.map((note) => ({ ...note, start: target, end: Math.min(lastBeat, snappedEnd(note, target, grid)) })));
  const pedal = take.pedal.map((change) => ({ ...change, beat: Math.max(0, change.beat) }));
  return { ...take, grid, barCount, pedal, notes: notes.sort(byStart), chordNotes: chordNotes.sort(byStart) };
}
