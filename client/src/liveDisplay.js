import { transposeChord, transposeKey } from './engine/transpose.js';

export function keyLabel(item) {
  const { root } = transposeKey(item.keyRoot, item.keyMode, item.transpose);
  return `${root}${item.keyMode === 'minor' ? 'm' : ''}`;
}

export function chordLabel(item, chord) {
  if (!chord) return '';
  const { preferFlats } = transposeKey(item.keyRoot, item.keyMode, item.transpose);
  return transposeChord(chord, item.transpose, preferFlats);
}

export function openingBpm(timeline) {
  return Math.round(timeline.openingBpm);
}

export function secondsLeft(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}
