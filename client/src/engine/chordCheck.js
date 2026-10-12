import { canTranspose } from './transpose.js';

const noChord = /^N\.?C\.?$/i;
const quality = '(?:maj|min|m|dim|aug|\\+)?';
const extension = '(?:maj7|maj9|maj11|maj13|add9|add11|add13|add2|add4|sus2|sus4|sus|6\\/9|6|7|9|11|13|5|[b#](?:5|9|11|13))*';
const chordShape = new RegExp(`^[A-G][#b]?${quality}${extension}(?:\\/[A-G][#b]?)?$`);

export function isValidChord(text) {
  return noChord.test(text) || chordShape.test(text);
}

export function isReadableChord(text) {
  return noChord.test(text) || canTranspose(text);
}

function allChords(sections) {
  return sections.flatMap((section) => section.bars.flatMap((bar) => bar.chords.map((entry) => entry.chord)));
}

export function unreadableChords(sections) {
  return [...new Set(allChords(sections).filter((chord) => !isReadableChord(chord)))];
}

export function unknownChords(chords) {
  return chords.map((entry) => entry.chord).filter((chord) => !isValidChord(chord));
}
