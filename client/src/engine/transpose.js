export const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const flatMajorKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db'];
const flatMinorKeys = ['D', 'G', 'C', 'F', 'Bb', 'Eb'];
const letterSemitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const chordPattern = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

function noteIndex(noteName) {
  const accidental = noteName[1] === '#' ? 1 : noteName[1] === 'b' ? -1 : 0;
  return (letterSemitones[noteName[0]] + accidental + 12) % 12;
}

function shiftedIndex(noteName, semitones) {
  return (((noteIndex(noteName) + semitones) % 12) + 12) % 12;
}

function transposeNote(noteName, semitones, preferFlats) {
  const names = preferFlats ? flatNames : sharpNames;
  return names[shiftedIndex(noteName, semitones)];
}

export function canTranspose(chord) {
  return chordPattern.test(chord);
}

export function transposeChord(chord, semitones, preferFlats = false) {
  const match = chord.match(chordPattern);
  if (!match || semitones % 12 === 0) return chord;
  const [, root, quality, bass] = match;
  const bassPart = bass ? `/${transposeNote(bass, semitones, preferFlats)}` : '';
  return transposeNote(root, semitones, preferFlats) + quality + bassPart;
}

export function keyPrefersFlats(keyRoot, keyMode) {
  const flatKeys = keyMode === 'minor' ? flatMinorKeys : flatMajorKeys;
  return flatKeys.includes(keyRoot);
}

export function transposeKey(keyRoot, keyMode, semitones) {
  const index = shiftedIndex(keyRoot, semitones);
  if (keyPrefersFlats(flatNames[index], keyMode)) return { root: flatNames[index], preferFlats: true };
  return { root: sharpNames[index], preferFlats: false };
}
