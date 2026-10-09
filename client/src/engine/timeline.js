function barDurationMs(beatsPerBar, bpm, tempoPct) {
  return (beatsPerBar * 60000) / ((bpm * tempoPct) / 100);
}

function gapLengthMs(item) {
  if (item.gapMode === 'manual') return null;
  if (item.gapMode === 'immediate') return 0;
  return (item.gapSeconds ?? 0) * 1000;
}

function flattenChords(bars) {
  return bars.flatMap((bar, barIdx) =>
    [...bar.chords].sort((a, b) => a.beat - b.beat).map((entry) => ({ barIdx, beat: entry.beat, chord: entry.chord }))
  );
}

function openingTempo(item) {
  const firstSection = item.sections.find((section) => section.barCount > 0) ?? item.sections[0];
  return firstSection ?? { bpm: item.bpm ?? 120, beatsPerBar: item.beatsPerBar ?? 4 };
}

export function buildTimeline(item) {
  const tempoPct = item.tempoPct ?? 100;
  const barStartsMs = [];
  const barDurationsMs = [];
  const barBeats = [];
  const barSectionIdx = [];
  let cursorMs = 0;
  item.sections.forEach((section, sectionIdx) => {
    const durationMs = barDurationMs(section.beatsPerBar, section.bpm, tempoPct);
    for (let bar = 0; bar < section.barCount; bar += 1) {
      barStartsMs.push(cursorMs);
      barDurationsMs.push(durationMs);
      barBeats.push(section.beatsPerBar);
      barSectionIdx.push(sectionIdx);
      cursorMs += durationMs;
    }
  });
  const opening = openingTempo(item);
  const openingBarMs = barDurationMs(opening.beatsPerBar, opening.bpm, tempoPct);
  return {
    item,
    tempoPct,
    barStartsMs,
    barDurationsMs,
    barBeats,
    barSectionIdx,
    chords: flattenChords(item.bars),
    openingBpm: (opening.bpm * tempoPct) / 100,
    openingBeats: opening.beatsPerBar,
    openingBeatMs: openingBarMs / opening.beatsPerBar,
    countInMs: (item.countInBars ?? 0) * openingBarMs,
    songMs: cursorMs,
    gapMs: gapLengthMs(item)
  };
}

export function lastIndexWhere(list, isAtOrBefore) {
  let low = 0;
  let high = list.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (isAtOrBefore(list[middle])) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

function emptyPosition(phase, itemIdx, bpmNow) {
  return { phase, itemIdx, barIdx: 0, sectionIdx: 0, beat: 0, beatInBar: 0, chordIdx: -1, bpmNow, msToPhaseEnd: null, msToNextSong: null };
}

function openingBeatPosition(timeline, elapsedMs) {
  const beat = (elapsedMs / timeline.openingBeatMs) % timeline.openingBeats;
  return { beat, beatInBar: Math.floor(beat) + 1 };
}

function countInPosition(timeline, itemIdx, elapsedMs) {
  return {
    ...emptyPosition('countin', itemIdx, timeline.openingBpm),
    ...openingBeatPosition(timeline, elapsedMs),
    msToPhaseEnd: timeline.countInMs - elapsedMs
  };
}

function timeAfterSong(timelines, itemIdx) {
  const gapMs = timelines[itemIdx].gapMs;
  if (itemIdx === timelines.length - 1 || gapMs === null) return null;
  return gapMs;
}

function songPosition(timelines, itemIdx, elapsedMs) {
  const timeline = timelines[itemIdx];
  const barIdx = lastIndexWhere(timeline.barStartsMs, (startMs) => startMs <= elapsedMs);
  const beatMs = timeline.barDurationsMs[barIdx] / timeline.barBeats[barIdx];
  const beat = Math.min((elapsedMs - timeline.barStartsMs[barIdx]) / beatMs, timeline.barBeats[barIdx] - 1e-9);
  const beatInBar = Math.floor(beat) + 1;
  const chordIdx = lastIndexWhere(
    timeline.chords,
    (entry) => entry.barIdx < barIdx || (entry.barIdx === barIdx && entry.beat <= beat + 1 + 1e-9)
  );
  const sectionIdx = timeline.barSectionIdx[barIdx];
  const msToPhaseEnd = timeline.songMs - elapsedMs;
  const gapMs = timeAfterSong(timelines, itemIdx);
  return {
    phase: 'song',
    itemIdx,
    barIdx,
    sectionIdx,
    beat,
    beatInBar,
    chordIdx,
    bpmNow: (timeline.item.sections[sectionIdx].bpm * timeline.tempoPct) / 100,
    msToPhaseEnd,
    msToNextSong: gapMs === null ? null : msToPhaseEnd + gapMs
  };
}

function gapPosition(timelines, itemIdx, elapsedMs) {
  const nextTimeline = timelines[itemIdx + 1];
  const msToPhaseEnd = timelines[itemIdx].gapMs - elapsedMs;
  return {
    ...emptyPosition('gap', itemIdx, nextTimeline.openingBpm),
    ...openingBeatPosition(nextTimeline, elapsedMs),
    msToPhaseEnd,
    msToNextSong: msToPhaseEnd
  };
}

export function positionAt(timelines, fromItem, elapsedMs, autoAdvance) {
  if (fromItem >= timelines.length) return emptyPosition('finished', Math.max(0, timelines.length - 1), 0);
  if (elapsedMs < 0) {
    return { ...emptyPosition('starting', fromItem, timelines[fromItem].openingBpm), msToPhaseEnd: -elapsedMs };
  }
  let remainingMs = elapsedMs;
  for (let itemIdx = fromItem; itemIdx < timelines.length; itemIdx += 1) {
    const timeline = timelines[itemIdx];
    if (remainingMs < timeline.countInMs) return countInPosition(timeline, itemIdx, remainingMs);
    remainingMs -= timeline.countInMs;
    if (remainingMs < timeline.songMs) return songPosition(timelines, itemIdx, remainingMs);
    remainingMs -= timeline.songMs;
    if (itemIdx === timelines.length - 1) break;
    if (timeline.gapMs === null) return emptyPosition('waiting', itemIdx, 0);
    if (remainingMs < timeline.gapMs) return gapPosition(timelines, itemIdx, remainingMs);
    remainingMs -= timeline.gapMs;
    if (!autoAdvance) return emptyPosition('waiting', itemIdx, 0);
  }
  return emptyPosition('finished', timelines.length - 1, 0);
}

export function nextChordChange(timeline, chordIdx) {
  const currentChord = timeline.chords[chordIdx]?.chord;
  return timeline.chords.slice(chordIdx + 1).find((entry) => entry.chord !== currentChord) ?? null;
}
