import { flatNames, sharpNames } from '../engine/transpose.js';

const chordShapes = [
  { quality: '', tones: [0, 4, 7] },
  { quality: 'm', tones: [0, 3, 7] },
  { quality: '5', tones: [0, 7] },
  { quality: 'dim', tones: [0, 3, 6] },
  { quality: 'aug', tones: [0, 4, 8] },
  { quality: 'sus2', tones: [0, 2, 7] },
  { quality: 'sus4', tones: [0, 5, 7] },
  { quality: '7', tones: [0, 4, 7, 10] },
  { quality: 'maj7', tones: [0, 4, 7, 11] },
  { quality: 'm7', tones: [0, 3, 7, 10] },
  { quality: 'm7b5', tones: [0, 3, 6, 10] },
  { quality: 'dim7', tones: [0, 3, 6, 9] },
  { quality: '6', tones: [0, 4, 7, 9] },
  { quality: 'm6', tones: [0, 3, 7, 9] },
  { quality: 'add9', tones: [0, 2, 4, 7] },
  { quality: '9', tones: [0, 2, 4, 7, 10] },
  { quality: 'maj9', tones: [0, 2, 4, 7, 11] },
  { quality: 'm9', tones: [0, 2, 3, 7, 10] }
];
const extraNotePenalty = 1;
const missingNotePenalty = 0.6;
const missingFifthPenalty = 0.2;
const sizePenalty = 0.05;
const bassIsRootBonus = 0.3;
export const passingToneLevel = 0.25;

export function pitchClassWeights(notes) {
  const weights = Array(12).fill(0);
  notes.forEach((note) => {
    weights[((note.pitch % 12) + 12) % 12] += note.weight ?? 1;
  });
  const strongest = Math.max(...weights);
  if (strongest === 0) return weights;
  return weights.map((weight) => (weight / strongest < passingToneLevel ? 0 : weight / strongest));
}

function shapeScore(weights, root, shape, bassPc) {
  const inShape = new Set(shape.tones.map((tone) => (root + tone) % 12));
  let score = 0;
  weights.forEach((weight, pc) => {
    if (weight > 0) score += inShape.has(pc) ? weight : -extraNotePenalty * weight;
  });
  shape.tones.forEach((tone) => {
    if (weights[(root + tone) % 12] > 0) return;
    score -= tone === 7 ? missingFifthPenalty : missingNotePenalty;
  });
  score -= sizePenalty * shape.tones.length;
  return root === bassPc ? score + bassIsRootBonus : score;
}

export function bestChord(weights, bassPc) {
  if (weights.filter((weight) => weight > 0).length < 2) return null;
  let best = null;
  for (let root = 0; root < 12; root += 1) {
    if (weights[root] === 0) continue;
    for (const shape of chordShapes) {
      const score = shapeScore(weights, root, shape, bassPc);
      if (!best || score > best.score) best = { root, quality: shape.quality, bassPc, score };
    }
  }
  return best;
}

export function chordName(chord, preferFlats) {
  const names = preferFlats ? flatNames : sharpNames;
  const bass = chord.bassPc !== null && chord.bassPc !== chord.root ? `/${names[chord.bassPc]}` : '';
  return names[chord.root] + chord.quality + bass;
}

export function nameNotes(notes, preferFlats = false) {
  if (notes.length === 0) return null;
  const bassPitch = Math.min(...notes.map((note) => note.pitch));
  const chord = bestChord(pitchClassWeights(notes), ((bassPitch % 12) + 12) % 12);
  return chord ? chordName(chord, preferFlats) : null;
}
