import { positionAt } from '../engine/timeline.js';
import { callerCanControl } from '../sessionRoles.js';

export const sessionActions = ['playPause', 'next', 'prev', 'nextSection', 'prevSection'];
export const sessionActionLabels = { playPause: 'Play / pause', next: 'Next song', prev: 'Previous song', nextSection: 'Next section', prevSection: 'Previous section' };
export const sessionMidiStoragePrefix = 'frontstage.sessionMidi.';
export const pressDebounceMs = 150;
export const emptyPressMemory = {};

export const sessionMidiNotices = {
  notStarted: 'Start the session first.',
  lastSong: 'This is the last song.',
  firstSong: 'This is the first song.',
  lastSection: 'This is the last section.',
  firstSection: 'This is the first section.',
  betweenSongs: 'Between songs. Use next or previous song.'
};

export function sessionMidiAllowed(session) {
  return Boolean(session) && session.state.playState !== 'ended' && callerCanControl(session);
}

export function acceptPress(memory, action, { pressed, discrete, atMs }) {
  const last = memory[action] ?? { down: false, firedAtMs: -Infinity };
  if (!pressed) return { memory: { ...memory, [action]: { ...last, down: false } }, fire: false };
  const held = !discrete && last.down;
  const bounced = atMs - last.firedAtMs < pressDebounceMs;
  const fire = !held && !bounced;
  return { memory: { ...memory, [action]: { down: true, firedAtMs: fire ? atMs : last.firedAtMs } }, fire };
}

export function pressIsDiscrete(message) {
  return message.kind !== 'control';
}

function playPauseCommand(state, position) {
  if (state.playState === 'idle') return { send: ['start', {}] };
  if (state.playState === 'paused') return { send: ['resume', {}] };
  if (position.phase === 'waiting') return { send: ['next', { itemIdx: position.itemIdx }] };
  return { send: ['pause', {}] };
}

function songCommand(action, position, songCount) {
  if (action === 'next') return position.itemIdx >= songCount - 1 ? { toast: sessionMidiNotices.lastSong } : { send: ['next', { itemIdx: position.itemIdx }] };
  return position.itemIdx <= 0 ? { toast: sessionMidiNotices.firstSong } : { send: ['prev', { itemIdx: position.itemIdx }] };
}

export function targetElapsedMs(state, serverNow) {
  if (state.playState !== 'playing') return state.anchorOffsetMs;
  return Math.max(state.anchorOffsetMs, serverNow - state.anchorServerMs + state.anchorOffsetMs);
}

function sectionFirstBar(timeline, sectionIdx) {
  return timeline.barSectionIdx.indexOf(sectionIdx);
}

function sectionTarget(action, timeline, position) {
  const current = position.phase === 'song' ? position.sectionIdx : -1;
  if (action === 'nextSection') return sectionFirstBar(timeline, current + 1) >= 0 ? current + 1 : null;
  if (current < 0) return null;
  return position.barIdx > sectionFirstBar(timeline, current) ? current : current - 1;
}

function sectionCommand(action, state, timelines, autoAdvance, elapsedMs) {
  const position = positionAt(timelines, state.itemIdx, elapsedMs, autoAdvance);
  if (!['song', 'countin'].includes(position.phase)) return { toast: sessionMidiNotices.betweenSongs };
  const timeline = timelines[position.itemIdx];
  const target = sectionTarget(action, timeline, position);
  if (target === null || target < 0) return { toast: action === 'nextSection' ? sessionMidiNotices.lastSection : sessionMidiNotices.firstSection };
  const offsetMs = timeline.countInMs + timeline.barStartsMs[sectionFirstBar(timeline, target)];
  return { send: ['seek', { itemIdx: position.itemIdx, offsetMs }] };
}

export function sessionCommand(action, { session, position, timelines, serverNow }) {
  const { state } = session;
  if (state.playState === 'ended') return null;
  if (action === 'playPause') return playPauseCommand(state, position);
  if (state.playState === 'idle') return { toast: sessionMidiNotices.notStarted };
  if (action === 'next' || action === 'prev') return songCommand(action, position, timelines.length);
  return sectionCommand(action, state, timelines, session.settings.autoAdvance, targetElapsedMs(state, serverNow));
}
