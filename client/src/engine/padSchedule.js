import { positionAt } from './timeline.js';
import { chordNotes } from './chordNotes.js';

export const emptyPadMemory = { key: null, scheduledUntilMs: null, sounding: false };

export function sessionElapsedMs(state, serverNow) {
  if (state.playState !== 'playing') return null;
  return serverNow - state.anchorServerMs + state.anchorOffsetMs;
}

function chordEvent(timeline, itemIdx, atMs, chord) {
  const notes = chord ? chordNotes(chord, timeline.item.transpose ?? 0) : null;
  return { atMs, itemIdx, chord: notes ? chord : null, notes };
}

function songEvents(timeline, itemIdx, songStartMs) {
  const changes = timeline.chords
    .filter((entry) => entry.beat - 1 < timeline.barBeats[entry.barIdx])
    .map((entry) => {
      const beatMs = timeline.barDurationsMs[entry.barIdx] / timeline.barBeats[entry.barIdx];
      return chordEvent(timeline, itemIdx, songStartMs + timeline.barStartsMs[entry.barIdx] + (entry.beat - 1) * beatMs, entry.chord);
    });
  return [...changes, chordEvent(timeline, itemIdx, songStartMs + timeline.songMs, null)];
}

export function padChangesBetween(timelines, fromItem, autoAdvance, fromMs, toMs) {
  const events = [];
  let itemStartMs = 0;
  for (let itemIdx = fromItem; itemIdx < timelines.length && itemStartMs <= toMs; itemIdx += 1) {
    const timeline = timelines[itemIdx];
    const songStartMs = itemStartMs + timeline.countInMs;
    events.push(...songEvents(timeline, itemIdx, songStartMs).filter((event) => event.atMs > fromMs && event.atMs <= toMs));
    if (!autoAdvance || timeline.gapMs === null) break;
    itemStartMs = songStartMs + timeline.songMs + timeline.gapMs;
  }
  return events;
}

export function padChordAt(timelines, fromItem, elapsedMs, autoAdvance) {
  const position = positionAt(timelines, fromItem, elapsedMs, autoAdvance);
  if (position.phase !== 'song') return null;
  const timeline = timelines[position.itemIdx];
  const entry = timeline.chords[position.chordIdx];
  if (!entry) return null;
  const event = chordEvent(timeline, position.itemIdx, elapsedMs, entry.chord);
  return event.notes ? event : null;
}

function stopAction(memory) {
  return memory.sounding ? [{ kind: 'stop' }] : [];
}

export function padTick(memory, { playing, key, nowMs, lookAheadMs, timelines, fromItem, autoAdvance }) {
  if (!playing) return { memory: emptyPadMemory, actions: stopAction(memory) };
  const actions = [];
  let next = memory;
  if (memory.key !== key) {
    actions.push(...stopAction(memory));
    const current = padChordAt(timelines, fromItem, nowMs, autoAdvance);
    if (current) actions.push({ kind: 'chord', ...current });
    next = { key, scheduledUntilMs: nowMs, sounding: Boolean(current) };
  }
  const untilMs = nowMs + lookAheadMs;
  if (untilMs <= next.scheduledUntilMs) return { memory: next, actions };
  const changes = padChangesBetween(timelines, fromItem, autoAdvance, next.scheduledUntilMs, untilMs);
  changes.forEach((change) => actions.push(change.notes ? { kind: 'chord', ...change } : { kind: 'release', atMs: change.atMs, itemIdx: change.itemIdx }));
  const sounding = changes.length > 0 ? Boolean(changes.at(-1).notes) : next.sounding;
  return { memory: { key, scheduledUntilMs: untilMs, sounding }, actions };
}

export function padChordName({ memory, actions }, shownChord) {
  const start = memory.sounding ? shownChord : null;
  return actions.reduce((current, action) => (action.kind === 'chord' ? action.chord : null), start);
}
