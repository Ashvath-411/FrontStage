import { chordsFromWeighted, weightedChords } from './barChords.js';

const lyricSeparator = /(?:^|\s)\/(?:\s|$)/;
const sectionSetting = /^(bpm|ts)=(\d+)$/i;

function parseSectionHeader(line) {
  const section = { name: '', bars: [] };
  const nameWords = [];
  for (const word of line.slice(1).trim().split(/\s+/).filter(Boolean)) {
    const setting = word.match(sectionSetting);
    if (!setting) nameWords.push(word);
    else if (setting[1].toLowerCase() === 'bpm') section.bpm = Number(setting[2]);
    else section.beatsPerBar = Number(setting[2]);
  }
  section.name = nameWords.join(' ') || 'Section';
  return section;
}

function chordBeat(tokenIdx, tokenCount, beatsPerBar) {
  return Math.floor((tokenIdx * beatsPerBar) / tokenCount) + 1;
}

export function chordTokens(chordText) {
  return chordText.trim().split(/\s+/).filter(Boolean);
}

const weightedToken = /^(.+?)\*(\d+(?:\.\d+)?)$/;

export function readChordToken(token) {
  const match = token.match(weightedToken);
  const weight = match ? Number(match[2]) : 1;
  const name = match ? match[1] : token;
  return { chord: name === '.' ? null : name, weight: weight > 0 ? weight : 1 };
}

export function parseChordTokens(chordText, beatsPerBar) {
  return chordsFromWeighted(chordTokens(chordText).map(readChordToken), beatsPerBar);
}

export function splitBarLine(line) {
  const separator = line.match(lyricSeparator);
  const chordText = separator ? line.slice(0, separator.index) : line;
  const lyric = separator ? line.slice(separator.index + separator[0].length).trim() : '';
  return { chordText, lyric };
}

function parseBar(line, beatsPerBar) {
  const { chordText, lyric } = splitBarLine(line);
  return { chords: parseChordTokens(chordText, beatsPerBar), lyric };
}

export function parseChart(text, defaults = {}) {
  const sections = [];
  let beatsPerBar = defaults.beatsPerBar ?? 4;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const section = parseSectionHeader(line);
      beatsPerBar = section.beatsPerBar ?? beatsPerBar;
      sections.push(section);
      continue;
    }
    if (sections.length === 0) sections.push({ name: defaults.sectionName ?? 'Song', bars: [] });
    sections.at(-1).bars.push(parseBar(line, beatsPerBar));
  }
  return sections;
}

function formatSectionHeader(section) {
  const parts = ['#', section.name];
  if (section.bpm) parts.push(`bpm=${section.bpm}`);
  if (section.beatsPerBar) parts.push(`ts=${section.beatsPerBar}`);
  return parts.join(' ');
}

function slotTokens(chords, beatsPerBar) {
  for (let tokenCount = 1; tokenCount <= beatsPerBar; tokenCount += 1) {
    const slotBeats = Array.from({ length: tokenCount }, (_, tokenIdx) => chordBeat(tokenIdx, tokenCount, beatsPerBar));
    const fitsSlots = chords.every((entry) => slotBeats.includes(entry.beat));
    const sameTiming = fitsSlots && JSON.stringify(parseChordTokens(slotBeats.map((beat) => chords.find((entry) => entry.beat === beat)?.chord ?? '.').join(' '), beatsPerBar)) === JSON.stringify(chords);
    if (sameTiming) return slotBeats.map((beat) => chords.find((entry) => entry.beat === beat)?.chord ?? '.').join(' ');
  }
  return null;
}

function weightedTokens(chords, beatsPerBar) {
  return weightedChords(chords, beatsPerBar)
    .map((entry) => `${entry.chord ?? '.'}${entry.weight === 1 ? '' : `*${entry.weight}`}`)
    .join(' ');
}

export function formatChordTokens(chords, beatsPerBar) {
  if (chords.length === 0) return '.';
  const sorted = [...chords].sort((first, second) => first.beat - second.beat);
  return slotTokens(sorted, beatsPerBar) ?? weightedTokens(sorted, beatsPerBar);
}

export function formatBar(bar, beatsPerBar) {
  const chordTokens = formatChordTokens(bar.chords, beatsPerBar);
  if (!bar.lyric) return chordTokens;
  return chordTokens === '.' ? `/ ${bar.lyric}` : `${chordTokens} / ${bar.lyric}`;
}

export function formatChart(sections, defaults = {}) {
  let beatsPerBar = defaults.beatsPerBar ?? 4;
  const lines = [];
  for (const section of sections) {
    beatsPerBar = section.beatsPerBar ?? beatsPerBar;
    lines.push(formatSectionHeader(section));
    section.bars.forEach((bar) => lines.push(formatBar(bar, beatsPerBar)));
  }
  return lines.join('\n');
}
