import { cueKinds } from './cueList.js';

export const cueKindInfo = [
  { kind: 'next-up', label: 'Next song', example: 'Next up, Song Two, Band Two. Key of G, 100 beats per minute.' },
  { kind: 'gap-note', label: 'Setlist note for the next song', example: 'Note, Capo two.' },
  { kind: 'gap-time', label: 'Time left in long gaps', example: 'Ten seconds' },
  { kind: 'countdown', label: 'Count 3, 2, 1 into the count-in', example: '3, 2, 1' },
  { kind: 'section-ahead', label: 'Next section, a bar early', example: 'Chorus' },
  { kind: 'tempo-change', label: 'Tempo changes inside a song', example: 'Tempo change, 132' },
  { kind: 'key-change', label: 'Transposed songs', example: 'Key of A, transposed up 2.' },
  { kind: 'annotation', label: 'Stage notes for my instrument', example: 'Keys, Pad in' },
  { kind: 'ending', label: 'Last chorus and ending', example: 'Last chorus' }
];

const presetKindLists = {
  minimal: ['next-up', 'countdown'],
  standard: cueKinds.filter((kind) => kind !== 'gap-time'),
  full: cueKinds
};

export const cuePresetNames = [['minimal', 'Minimal'], ['standard', 'Standard'], ['full', 'Full']];

export function presetKinds(presetName) {
  const enabled = presetKindLists[presetName] ?? presetKindLists.standard;
  return Object.fromEntries(cueKinds.map((kind) => [kind, enabled.includes(kind)]));
}

export function matchingPreset(kinds) {
  return cuePresetNames.map(([name]) => name).find((name) => cueKinds.every((kind) => presetKinds(name)[kind] === Boolean(kinds[kind]))) ?? null;
}

export function previewSamples(kinds, instrumentLabel) {
  return cueKindInfo
    .filter(({ kind }) => kinds[kind])
    .map(({ kind, example }) => (kind === 'annotation' ? `${instrumentLabel}, Pad in` : example));
}
