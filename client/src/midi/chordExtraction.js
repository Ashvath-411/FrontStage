import { bestChord, chordName, passingToneLevel, pitchClassWeights } from './chordNaming.js';
import { pitchClass } from './midiMessages.js';
import { maxChordsPerBar, roundBeat } from '../engine/barChords.js';
import { barAt, beatsAtBar, totalBarCount, updateBar } from '../engine/chartEdits.js';

export const shortestChordBeats = 0.5;
const changedNotesForNewChord = 2;

export function soundingSegments(notes) {
  const edges = [...new Set(notes.flatMap((note) => [note.start, note.end]))].sort((first, second) => first - second);
  return edges.slice(0, -1).map((start, index) => ({
    start,
    end: edges[index + 1],
    notes: notes.filter((note) => note.start <= start && note.end > start)
  }));
}

function pitchClasses(notes) {
  return new Set(notes.map((note) => pitchClass(note.pitch)));
}

function lowestPitchClass(notes) {
  return pitchClass(Math.min(...notes.map((note) => note.pitch)));
}

export function isNewChord(core, segment) {
  const before = pitchClasses(core);
  const after = pitchClasses(segment.notes);
  const changed = [...before].filter((pc) => !after.has(pc)).length + [...after].filter((pc) => !before.has(pc)).length;
  return changed >= changedNotesForNewChord || lowestPitchClass(core) !== lowestPitchClass(segment.notes);
}

export function chordRegions(segments) {
  const regions = [];
  segments.forEach((segment) => {
    const current = regions.at(-1);
    if (segment.notes.length === 0) {
      if (current) current.end = segment.end;
      return;
    }
    if (current && !isNewChord(current.core, segment)) current.end = segment.end;
    else regions.push({ start: segment.start, end: segment.end, core: segment.notes });
  });
  return regions;
}

export function mergeShortRegions(regions) {
  const merged = [];
  regions.forEach((region) => {
    const previous = merged.at(-1);
    if (previous && region.end - region.start < shortestChordBeats) previous.end = region.end;
    else merged.push({ ...region });
  });
  if (merged.length > 1 && merged[0].end - merged[0].start < shortestChordBeats) {
    merged[1].start = merged[0].start;
    merged.shift();
  }
  return merged;
}

function notesInRegion(notes, region) {
  return notes
    .map((note) => ({ pitch: note.pitch, weight: Math.min(note.end, region.end) - Math.max(note.start, region.start) }))
    .filter((note) => note.weight > 0);
}

export function regionChord(notes, region, spelling) {
  const weighted = notesInRegion(notes, region);
  if (weighted.length === 0) return null;
  const longest = Math.max(...weighted.map((note) => note.weight));
  const bassPitch = Math.min(...weighted.filter((note) => note.weight >= longest * passingToneLevel).map((note) => note.pitch));
  const chord = bestChord(pitchClassWeights(weighted), pitchClass(bassPitch));
  return chord ? chordName(chord, spelling) : null;
}

export function extractChords(notes, spelling) {
  const events = [];
  mergeShortRegions(chordRegions(soundingSegments(notes))).forEach((region) => {
    const chord = regionChord(notes, region, spelling) ?? (events.length === 0 ? chordName({ root: lowestPitchClass(notesInRegion(notes, region)), quality: '', bassPc: null }, spelling) : null);
    if (chord && chord !== events.at(-1)?.chord) events.push({ beat: roundBeat(region.start), chord });
  });
  return events;
}

export function chordsByBar(events, barCount, beatsPerBar) {
  const bars = Array.from({ length: barCount }, () => []);
  let carried = null;
  bars.forEach((bar, barIdx) => {
    const barStart = barIdx * beatsPerBar;
    const inBar = events.filter((event) => event.beat >= barStart && event.beat < barStart + beatsPerBar);
    if (carried && !inBar.some((event) => event.beat === barStart)) bar.push({ beat: 1, chord: carried });
    inBar.forEach((event) => bar.push({ beat: roundBeat(event.beat - barStart + 1), chord: event.chord }));
    carried = bar.at(-1)?.chord ?? carried;
  });
  return bars.map((bar) => (bar.length > maxChordsPerBar ? bar.slice(0, maxChordsPerBar) : bar));
}

function withExtraBars(sections, extraBars) {
  const blankBars = Array.from({ length: extraBars }, () => ({ chords: [], lyric: '' }));
  if (sections.length === 0) return [{ name: 'Song', bars: blankBars }];
  return sections.map((section, index) => (index === sections.length - 1 ? { ...section, bars: [...section.bars, ...blankBars] } : section));
}

export function writeTakeToChart(sections, startBar, barChords, defaultBeats) {
  const firstPlayedBar = barChords.findIndex((chords) => chords.length > 0);
  if (firstPlayedBar === -1) return { sections, changes: [] };
  const extraBars = startBar + barChords.length - totalBarCount(sections);
  let next = extraBars > 0 ? withExtraBars(sections, extraBars) : sections;
  const changes = [];
  barChords.slice(firstPlayedBar).forEach((chords, offset) => {
    const barIdx = startBar + firstPlayedBar + offset;
    const fitting = chords.filter((entry) => entry.beat < beatsAtBar(next, barIdx, defaultBeats) + 1);
    changes.push({ barIdx, before: barAt(sections, barIdx)?.chords ?? null, after: fitting, beatsPerBar: beatsAtBar(next, barIdx, defaultBeats) });
    next = updateBar(next, barIdx, { chords: fitting });
  });
  return { sections: next, changes };
}
