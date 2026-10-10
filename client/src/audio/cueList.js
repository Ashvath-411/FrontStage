import { annotationIsForInstrument } from '../engine/annotations.js';
import { annotationText, estimateSpeechMs, gapNoteText, nextUpText, sectionAheadText } from './cueText.js';

export const cueKinds = ['next-up', 'gap-note', 'gap-time', 'countdown', 'section-ahead', 'tempo-change', 'key-change', 'annotation', 'ending'];
export const cuePriorities = { 'next-up': 3, 'gap-note': 3, 'gap-time': 2, countdown: 4, 'section-ahead': 2, 'tempo-change': 3, annotation: 3, ending: 3 };
export const collisionMarginMs = 300;
const twoBarSections = /^(bridge|outro)\b/i;
const chorusSections = /chorus/i;
const longGapMs = 12000;

function cueEndingAt(kind, key, atMs, text) {
  return { id: `${kind}:${key}`, kind, atMs, text, priority: cuePriorities[kind] };
}

function cueStartingAt(kind, key, startMs, text, rate) {
  return cueEndingAt(kind, key, startMs + estimateSpeechMs(text, rate), text);
}

function sectionCues(timeline, itemIdx, barStart, kinds) {
  const sections = timeline.item.sections;
  return sections.slice(1).flatMap((section, index) => {
    const cues = [];
    const sectionIdx = index + 1;
    const barsAhead = twoBarSections.test(section.name) ? 2 : 1;
    if (kinds['section-ahead'] && section.firstBar - barsAhead >= 0) {
      cues.push(cueEndingAt('section-ahead', `${itemIdx}:${sectionIdx}`, barStart(section.firstBar - barsAhead), sectionAheadText(section.name, barsAhead)));
    }
    if (kinds['tempo-change'] && section.bpm !== sections[sectionIdx - 1].bpm) {
      const bpm = Math.round((section.bpm * timeline.tempoPct) / 100);
      cues.push(cueEndingAt('tempo-change', `${itemIdx}:${sectionIdx}`, barStart(section.firstBar - 1), `Tempo change, ${bpm}`));
    }
    return cues;
  });
}

function annotationCues(timeline, itemIdx, barStart, instrument) {
  return timeline.item.annotations
    .filter((annotation) => annotationIsForInstrument(annotation, instrument) && annotation.barIdx - annotation.leadInBars >= 0)
    .map((annotation, index) => cueEndingAt('annotation', `${itemIdx}:${annotation.barIdx}:${index}`, barStart(annotation.barIdx - annotation.leadInBars), annotationText(annotation, instrument)));
}

function endingCues(timeline, itemIdx, barStart) {
  const cues = [];
  const choruses = timeline.item.sections.filter((section) => chorusSections.test(section.name));
  const finalChorus = choruses.at(-1);
  if (choruses.length > 1 && finalChorus.firstBar >= 1) cues.push(cueEndingAt('ending', `${itemIdx}:last-chorus`, barStart(finalChorus.firstBar - 1), 'Last chorus'));
  const finalBar = timeline.barStartsMs.length - 1;
  if (finalBar >= 1) cues.push(cueEndingAt('ending', `${itemIdx}:final-bar`, barStart(finalBar - 1), 'Ending'));
  return cues;
}

function songCues(timeline, itemIdx, songStartMs, options) {
  const barStart = (barIdx) => songStartMs + timeline.barStartsMs[barIdx];
  const { kinds } = options;
  return [
    ...sectionCues(timeline, itemIdx, barStart, kinds),
    ...(kinds.annotation ? annotationCues(timeline, itemIdx, barStart, options.instrument) : []),
    ...(kinds.ending ? endingCues(timeline, itemIdx, barStart) : [])
  ];
}

function countdownLeadMs(gapMs, kinds) {
  return kinds.countdown ? Math.min(3, Math.floor(gapMs / 1000)) * 1000 : 0;
}

function nextUpBlock(timelines, itemIdx, songStartMs, songEndMs, waitsAfterGap, options) {
  const { kinds, rate } = options;
  const timeline = timelines[itemIdx];
  const nextTimeline = timelines[itemIdx + 1];
  const texts = [];
  if (kinds['next-up']) texts.push(['next-up', nextUpText(nextTimeline.item, nextTimeline.openingBpm, options.nextUpDetails, kinds['key-change'])]);
  if (kinds['gap-note'] && nextTimeline.item.note?.trim()) texts.push(['gap-note', gapNoteText(nextTimeline.item.note)]);
  if (texts.length === 0) return [];
  const blockMs = texts.reduce((total, [, text]) => total + estimateSpeechMs(text, rate), (texts.length - 1) * collisionMarginMs);
  const lastBarStartMs = songStartMs + timeline.barStartsMs.at(-1);
  const wantedStartMs = timeline.gapMs === 0 ? lastBarStartMs : songEndMs;
  const endByMs = waitsAfterGap ? Infinity : songEndMs + timeline.gapMs - countdownLeadMs(timeline.gapMs, kinds) - collisionMarginMs;
  let startMs = Math.min(wantedStartMs, endByMs - blockMs);
  return texts.map(([kind, text]) => {
    const cue = cueStartingAt(kind, String(itemIdx), startMs, text, rate);
    startMs = cue.atMs + collisionMarginMs;
    return cue;
  });
}

function gapClockCues(timeline, itemIdx, songEndMs, options) {
  const { kinds, rate } = options;
  const gapEndMs = songEndMs + timeline.gapMs;
  const cues = [];
  if (kinds['gap-time'] && timeline.gapMs > longGapMs) {
    cues.push(cueStartingAt('gap-time', `${itemIdx}:10`, gapEndMs - 10000, 'Ten seconds', rate));
    cues.push(cueStartingAt('gap-time', `${itemIdx}:5`, gapEndMs - 5000, 'Five', rate));
  }
  for (const secondsLeft of [3, 2, 1]) {
    const markMs = gapEndMs - secondsLeft * 1000;
    if (kinds.countdown && markMs >= songEndMs) cues.push(cueStartingAt('countdown', `${itemIdx}:${secondsLeft}`, markMs, String(secondsLeft), rate));
  }
  return cues;
}

function gapCues(timelines, itemIdx, songStartMs, songEndMs, autoAdvance, options) {
  const timeline = timelines[itemIdx];
  if (itemIdx === timelines.length - 1) return [];
  const waitsAfterGap = timeline.gapMs === null || !autoAdvance;
  const block = nextUpBlock(timelines, itemIdx, songStartMs, songEndMs, waitsAfterGap, options);
  if (waitsAfterGap || timeline.gapMs === 0) return block;
  return [...block, ...gapClockCues(timeline, itemIdx, songEndMs, options)];
}

function speechStartMs(cue, rate) {
  return cue.atMs - estimateSpeechMs(cue.text, rate);
}

function overlapsCountIn(cue, countIns, rate) {
  const startMs = speechStartMs(cue, rate);
  return countIns.some(([countInStartMs, songStartMs]) => startMs < songStartMs && cue.atMs > countInStartMs);
}

export function cuesCollide(first, second, rate = 1) {
  return speechStartMs(first, rate) < second.atMs + collisionMarginMs && speechStartMs(second, rate) < first.atMs + collisionMarginMs;
}

export function resolveCollisions(cues, rate = 1) {
  const byImportance = [...cues].sort((first, second) => second.priority - first.priority || first.atMs - second.atMs);
  const kept = [];
  for (const cue of byImportance) {
    if (!kept.some((keptCue) => cuesCollide(cue, keptCue, rate))) kept.push(cue);
  }
  return kept.sort((first, second) => first.atMs - second.atMs);
}

export function buildCues(timelines, fromItem, autoAdvance, options) {
  const settings = { rate: 1, nextUpDetails: { artist: true, key: true, bpm: true }, ...options };
  const cues = [];
  const countIns = [];
  let itemStartMs = 0;
  for (let itemIdx = fromItem; itemIdx < timelines.length; itemIdx += 1) {
    const timeline = timelines[itemIdx];
    const songStartMs = itemStartMs + timeline.countInMs;
    const songEndMs = songStartMs + timeline.songMs;
    countIns.push([itemStartMs, songStartMs]);
    cues.push(...songCues(timeline, itemIdx, songStartMs, settings), ...gapCues(timelines, itemIdx, songStartMs, songEndMs, autoAdvance, settings));
    if (timeline.gapMs === null || !autoAdvance) break;
    itemStartMs = songEndMs + timeline.gapMs;
  }
  const playable = cues.filter((cue) => cue.kind === 'countdown' || !overlapsCountIn(cue, countIns, settings.rate));
  const fromMs = settings.fromMs ?? -Infinity;
  return resolveCollisions(playable, settings.rate).filter((cue) => speechStartMs(cue, settings.rate) >= fromMs);
}
