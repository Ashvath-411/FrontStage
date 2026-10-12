import { parseChordTokens } from './parseChart.js';
import { tooManyChords } from './chartEdits.js';
import { maxChordsPerBar } from './barChords.js';

export function loopBars(chordsText) {
  const bars = chordsText.split('|').map((bar) => bar.trim());
  return bars.every((bar) => bar === '') ? [] : bars;
}

export function fillLoop(chordsText, barCount) {
  const loop = loopBars(chordsText);
  if (loop.length === 0) return [];
  return Array.from({ length: Math.max(0, barCount) }, (_, index) => loop[index % loop.length]);
}

function lastBarWithWords(bars) {
  return bars.findLastIndex((bar) => bar.lyric?.trim());
}

export function applyLoopToSection(sections, sectionIdx, barTexts, beatsPerBar) {
  const section = sections[sectionIdx];
  if (!section) return { error: 'Pick a section.' };
  if (barTexts.length === 0) return { error: 'Type at least one bar, such as Am | F | C | G.' };
  const crowded = barTexts.find((text) => tooManyChords(text));
  if (crowded !== undefined) return { error: `"${crowded}" has more than ${maxChordsPerBar} chords.` };
  const neededBars = lastBarWithWords(section.bars) + 1;
  if (barTexts.length < neededBars) return { error: `That would remove bars with words. Fill at least ${neededBars} bars.` };
  const bars = barTexts.map((text, index) => ({ lyric: '', ...section.bars[index], chords: parseChordTokens(text, beatsPerBar) }));
  return { sections: sections.map((candidate, index) => (index === sectionIdx ? { ...candidate, bars } : candidate)) };
}
