import { keyPrefersFlats, transposeChord } from './transpose.js';
import { appendChord, chordsFromWeighted, maxChordsPerBar, replaceChordAt, weightedChords } from './barChords.js';

const majorScaleChords = [[0, ''], [2, 'm'], [4, 'm'], [5, ''], [7, ''], [9, 'm'], [11, 'dim']];
const minorScaleChords = [[0, 'm'], [2, 'dim'], [3, ''], [5, 'm'], [7, 'm'], [8, ''], [10, '']];

function spellsWithFlats(keyRoot, keyMode) {
  return keyRoot.includes('b') || keyPrefersFlats(keyRoot, keyMode);
}

function chordOnDegree(keyRoot, keyMode, semitones, quality) {
  if (semitones === 0) return keyRoot + quality;
  return transposeChord(keyRoot + quality, semitones, spellsWithFlats(keyRoot, keyMode));
}

export function diatonicChords(keyRoot, keyMode) {
  const scaleChords = keyMode === 'minor' ? minorScaleChords : majorScaleChords;
  return scaleChords.map(([semitones, quality]) => chordOnDegree(keyRoot, keyMode, semitones, quality));
}

export function chordRoot(chord) {
  return chord?.match(/^[A-G][#b]?/)?.[0] ?? null;
}

export function paletteExtras(keyRoot, keyMode, selectedChord) {
  const extras = keyMode === 'minor' ? [chordOnDegree(keyRoot, keyMode, 7, '')] : [];
  const root = chordRoot(selectedChord);
  if (root) extras.push(`${root}sus2`, `${root}sus4`, `${root}7`);
  const diatonic = diatonicChords(keyRoot, keyMode);
  return extras.filter((chord, index) => !diatonic.includes(chord) && extras.indexOf(chord) === index);
}

export function addChordToBar(bar, chord, beatsPerBar, { append = false, chipIdx = null } = {}) {
  const entries = weightedChords(bar.chords, beatsPerBar);
  if (chipIdx !== null && chipIdx < entries.length) return { chords: chordsFromWeighted(replaceChordAt(entries, chipIdx, chord), beatsPerBar), advance: false };
  if (!append) return { chords: [{ beat: 1, chord }], advance: true };
  const full = bar.chords.length >= maxChordsPerBar;
  return { chords: full ? bar.chords : chordsFromWeighted(appendChord(entries, chord), beatsPerBar), advance: false };
}
