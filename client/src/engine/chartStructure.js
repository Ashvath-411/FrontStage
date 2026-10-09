import { resolveSections } from './songTiming.js';

const maxSectionBars = 64;

function emptyBars(barCount) {
  return Array.from({ length: barCount }, () => ({ chords: [], lyric: '' }));
}

export function addSection(sections, { name, barCount, bpm }) {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: 'Give the section a name.' };
  if (!Number.isInteger(barCount) || barCount < 1 || barCount > maxSectionBars) return { error: `A section has 1 to ${maxSectionBars} bars.` };
  if (bpm !== undefined && (bpm < 20 || bpm > 300)) return { error: 'Tempo must be between 20 and 300 BPM.' };
  const section = { name: trimmedName, bars: emptyBars(barCount) };
  if (bpm !== undefined) section.bpm = bpm;
  return { sections: [...sections, section] };
}

export function moveSection(sections, sectionIdx, direction) {
  const targetIdx = sectionIdx + direction;
  if (targetIdx < 0 || targetIdx >= sections.length) return { sections };
  const moved = [...sections];
  [moved[sectionIdx], moved[targetIdx]] = [moved[targetIdx], moved[sectionIdx]];
  return { sections: moved };
}

export function duplicateSection(sections, sectionIdx, withLyrics) {
  const original = sections[sectionIdx];
  const bars = original.bars.map((bar) => (withLyrics ? { ...bar } : { ...bar, lyric: '' }));
  return { sections: [...sections.slice(0, sectionIdx + 1), { ...original, bars }, ...sections.slice(sectionIdx + 1)] };
}

export function deleteSection(sections, sectionIdx) {
  return { sections: sections.filter((_, index) => index !== sectionIdx) };
}

export function chartDurationMs(sections, defaults) {
  return resolveSections(sections, defaults).reduce((total, section) => total + (section.barCount * section.beatsPerBar * 60000) / section.bpm, 0);
}
