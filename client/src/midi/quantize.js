import { beatSeconds } from './recorder.js';

export const gridSteps = { '1/4': 1, '1/8': 1 / 2, '1/8T': 1 / 3, '1/16': 1 / 4, '1/16T': 1 / 6 };
export const autoGridOrder = ['1/4', '1/8', '1/8T', '1/16', '1/16T'];
export const autoFallbackGrid = '1/16';
export const gridPenaltyBeats = { '1/4': 0, '1/8': 0.01, '1/16': 0.02, '1/8T': 0.025, '1/16T': 0.035 };
export const autoWorstLimit = 0.45;
export const rolledChordWindowMs = 80;
export const rolledChordMaxBeats = 0.15;
export const defaultQuantize = { grid: 'auto', strength: 100, lengthSnap: true };

export function snapToGrid(beat, step) {
  return Math.round(beat / step) * step;
}

export function clusterOnsets(notes, windowBeats) {
  const clusters = [];
  [...notes].sort((first, second) => first.start - second.start).forEach((note) => {
    const current = clusters.at(-1);
    if (current && note.start - current.anchor <= windowBeats) current.notes.push(note);
    else clusters.push({ anchor: note.start, notes: [note] });
  });
  return clusters;
}

export function gridCost(anchors, grid) {
  const step = gridSteps[grid];
  const errors = anchors.map((anchor) => Math.abs(anchor - snapToGrid(anchor, step)));
  if (Math.max(...errors) > autoWorstLimit * step) return Infinity;
  return errors.reduce((sum, error) => sum + error, 0) / errors.length + gridPenaltyBeats[grid];
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

export function rolledChordWindow(bpm) {
  return Math.min(rolledChordMaxBeats, rolledChordWindowMs / 1000 / beatSeconds(bpm));
}

function moveToward(value, target, strength) {
  return value + (target - value) * strength;
}

function quantizeNote(note, target, step, settings, lastBeat) {
  const strength = settings.strength / 100;
  const start = Math.max(0, moveToward(note.start, target, strength));
  const snappedEnd = Math.max(target + step, snapToGrid(note.end, step));
  const end = settings.lengthSnap ? moveToward(note.end, snappedEnd, strength) : start + (note.end - note.start);
  return { ...note, start, end: Math.min(lastBeat, Math.max(end, start + 0.01)) };
}

export function quantizeTake(take, settings = defaultQuantize) {
  const clusters = clusterOnsets(take.notes, rolledChordWindow(take.bpm));
  const grid = settings.grid === 'auto' ? chooseAutoGrid(clusters.map((cluster) => cluster.anchor)) : settings.grid;
  const step = gridSteps[grid];
  const lastBeat = take.barCount * take.beatsPerBar;
  const notes = clusters.flatMap((cluster) => {
    const target = snapToGrid(cluster.anchor, step);
    return cluster.notes.map((note) => quantizeNote(note, target, step, settings, lastBeat));
  });
  const pedal = take.pedal.map((change) => ({ ...change, beat: Math.max(0, change.beat) }));
  return { ...take, grid, pedal, notes: notes.sort((first, second) => first.start - second.start || first.pitch - second.pitch) };
}
