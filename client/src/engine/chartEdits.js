import { parseChart, chordTokens, splitBarLine } from './parseChart.js';
import { resolveSections } from './songTiming.js';
import { maxChordsPerBar } from './barChords.js';

export function totalBarCount(sections) {
  return sections.reduce((sum, section) => sum + section.bars.length, 0);
}

export function locateBar(sections, barIdx) {
  let firstBar = 0;
  for (let sectionIdx = 0; sectionIdx < sections.length; sectionIdx += 1) {
    const barCount = sections[sectionIdx].bars.length;
    if (barIdx >= firstBar && barIdx < firstBar + barCount) return { sectionIdx, barInSection: barIdx - firstBar };
    firstBar += barCount;
  }
  return null;
}

export function barAt(sections, barIdx) {
  const location = locateBar(sections, barIdx);
  return location ? sections[location.sectionIdx].bars[location.barInSection] : null;
}

export function beatsAtBar(sections, barIdx, defaultBeats) {
  const location = locateBar(sections, barIdx);
  if (!location) return defaultBeats;
  return resolveSections(sections, { beatsPerBar: defaultBeats })[location.sectionIdx].beatsPerBar;
}

export function updateBar(sections, barIdx, changes) {
  const location = locateBar(sections, barIdx);
  if (!location) return sections;
  return sections.map((section, sectionIdx) => {
    if (sectionIdx !== location.sectionIdx) return section;
    return { ...section, bars: section.bars.map((bar, index) => (index === location.barInSection ? { ...bar, ...changes } : bar)) };
  });
}

export function tooManyChords(chordText) {
  return chordTokens(chordText).length > maxChordsPerBar;
}

function crowdedBarNumber(text) {
  const barLines = text.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  const crowdedIdx = barLines.findIndex((line) => tooManyChords(splitBarLine(line).chordText));
  return crowdedIdx === -1 ? null : crowdedIdx + 1;
}

export function readChartText(text, defaults) {
  const sections = parseChart(text, defaults);
  if (totalBarCount(sections) === 0) return { error: 'The chart has no bars. Add at least one bar line.' };
  const crowdedBar = crowdedBarNumber(text);
  if (crowdedBar !== null) return { error: `Bar ${crowdedBar} has more than ${maxChordsPerBar} chords.` };
  return { sections };
}
