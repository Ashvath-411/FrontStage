import { buildTimeline } from './timeline.js';

export function resolveSections(sections, defaults) {
  let bpm = defaults.bpm;
  let beatsPerBar = defaults.beatsPerBar;
  let firstBar = 0;
  return sections.map((section) => {
    bpm = section.bpm ?? bpm;
    beatsPerBar = section.beatsPerBar ?? beatsPerBar;
    const resolved = { ...section, bpm, beatsPerBar, firstBar, barCount: section.bars.length };
    firstBar += section.bars.length;
    return resolved;
  });
}

export function itemDurationMs(song, setlistItem, isLastItem) {
  const sections = resolveSections(song.sections, { bpm: song.bpm, beatsPerBar: song.beatsPerBar })
    .filter((section) => section.barCount > 0);
  const timeline = buildTimeline({ ...setlistItem, bpm: song.bpm, beatsPerBar: song.beatsPerBar, sections, bars: song.sections.flatMap((section) => section.bars) });
  const gapMs = isLastItem ? 0 : timeline.gapMs ?? 0;
  return timeline.countInMs + timeline.songMs + gapMs;
}

export function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
