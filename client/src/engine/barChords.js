export const maxChordsPerBar = 16;
const closeEnough = 1e-6;

function isWhole(value) {
  return Math.abs(value - Math.round(value)) < 1e-3;
}

export function roundBeat(value) {
  return Math.round(value * 10000) / 10000;
}

export function simplestWeights(lengths) {
  const smallest = Math.min(...lengths);
  const ratios = lengths.map((length) => length / smallest);
  for (let multiplier = 1; multiplier <= 12; multiplier += 1) {
    if (ratios.every((ratio) => isWhole(ratio * multiplier))) return ratios.map((ratio) => Math.round(ratio * multiplier));
  }
  return ratios.map((ratio) => Math.round(ratio * 100) / 100);
}

export function weightedChords(chords, beatsPerBar) {
  const sorted = [...chords].sort((first, second) => first.beat - second.beat);
  if (sorted.length === 0) return [{ chord: null, weight: 1 }];
  const starts = sorted.map((entry) => entry.beat);
  const lengths = sorted.map((entry, index) => (starts[index + 1] ?? beatsPerBar + 1) - entry.beat);
  const leadIn = starts[0] - 1;
  const entries = sorted.map((entry) => ({ chord: entry.chord }));
  const allLengths = leadIn > closeEnough ? [leadIn, ...lengths] : lengths;
  const allEntries = leadIn > closeEnough ? [{ chord: null }, ...entries] : entries;
  const weights = simplestWeights(allLengths.map((length) => Math.max(length, closeEnough)));
  return allEntries.map((entry, index) => ({ ...entry, weight: weights[index] }));
}

export function chordsFromWeighted(entries, beatsPerBar) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let usedWeight = 0;
  return entries.flatMap((entry) => {
    const beat = roundBeat(1 + (beatsPerBar * usedWeight) / totalWeight);
    usedWeight += entry.weight;
    return entry.chord ? [{ beat, chord: entry.chord }] : [];
  });
}

export function appendChord(entries, chord) {
  const real = entries.filter((entry) => entry.chord || entries.length > 1);
  if (real.length >= maxChordsPerBar) return entries;
  return [...real, { chord, weight: 1 }];
}

export function replaceChordAt(entries, index, chord) {
  return entries.map((entry, position) => (position === index ? { ...entry, chord } : entry));
}

export function removeChordAt(entries, index) {
  const remaining = entries.filter((_, position) => position !== index);
  return remaining.length > 0 ? remaining : [{ chord: null, weight: 1 }];
}

export function moveChordAt(entries, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= entries.length) return entries;
  const moved = [...entries];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

export function setWeightAt(entries, index, weight) {
  const clamped = Math.min(4, Math.max(1, Math.round(weight)));
  return entries.map((entry, position) => (position === index ? { ...entry, weight: clamped } : entry));
}
