import { lastIndexWhere } from './timeline.js';

function evenBeats(startMs, beatMs, beatCount, beatsPerBar, phase, window) {
  const beats = [];
  const firstBeat = Math.max(0, Math.floor((window.fromMs - startMs) / beatMs) - 1);
  for (let beat = firstBeat; beat < beatCount; beat += 1) {
    const atMs = startMs + beat * beatMs;
    if (atMs >= window.toMs) break;
    if (atMs >= window.fromMs) beats.push({ atMs, accent: beat % beatsPerBar === 0, phase });
  }
  return beats;
}

function songBeats(timeline, songStartMs, window) {
  const beats = [];
  const firstBar = Math.max(0, lastIndexWhere(timeline.barStartsMs, (startMs) => songStartMs + startMs <= window.fromMs));
  for (let bar = firstBar; bar < timeline.barStartsMs.length; bar += 1) {
    const barStartMs = songStartMs + timeline.barStartsMs[bar];
    if (barStartMs >= window.toMs) break;
    const beatCount = timeline.barBeats[bar];
    beats.push(...evenBeats(barStartMs, timeline.barDurationsMs[bar] / beatCount, beatCount, beatCount, 'song', window));
  }
  return beats;
}

function countInBeats(timeline, startMs, window) {
  const beatCount = Math.round(timeline.countInMs / timeline.openingBeatMs);
  return evenBeats(startMs, timeline.openingBeatMs, beatCount, timeline.openingBeats, 'countin', window);
}

function gapBeats(nextTimeline, gapStartMs, gapMs, window) {
  const gapWindow = { fromMs: window.fromMs, toMs: Math.min(window.toMs, gapStartMs + gapMs) };
  return evenBeats(gapStartMs, nextTimeline.openingBeatMs, Infinity, nextTimeline.openingBeats, 'gap', gapWindow);
}

export function beatsBetween(timelines, fromItem, autoAdvance, fromMs, toMs, includeGap = false) {
  const window = { fromMs, toMs };
  const beats = [];
  let itemStartMs = 0;
  for (let itemIdx = fromItem; itemIdx < timelines.length && itemStartMs < toMs; itemIdx += 1) {
    const timeline = timelines[itemIdx];
    const songStartMs = itemStartMs + timeline.countInMs;
    const songEndMs = songStartMs + timeline.songMs;
    if (songEndMs > fromMs) beats.push(...countInBeats(timeline, itemStartMs, window), ...songBeats(timeline, songStartMs, window));
    if (itemIdx === timelines.length - 1 || timeline.gapMs === null) break;
    if (includeGap) beats.push(...gapBeats(timelines[itemIdx + 1], songEndMs, timeline.gapMs, window));
    if (!autoAdvance) break;
    itemStartMs = songEndMs + timeline.gapMs;
  }
  return beats;
}
