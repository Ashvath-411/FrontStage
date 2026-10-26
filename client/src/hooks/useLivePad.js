import { useEffect, useRef, useState } from 'react';
import { useStoredPrefs } from './useStoredPrefs.js';
import { emptyPadMemory, padChordName, padTick, sessionElapsedMs } from '../engine/padSchedule.js';
import { createPadPlayer } from '../midi/padPlayer.js';

const tickMs = 25;
const lookAheadMs = 150;
const unlockEvents = ['pointerup', 'touchend', 'click', 'keydown'];
export const defaultPadPrefs = { on: false, volume: 0.6 };

function audioContextClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

export function useLivePad({ session, timelines, clockOffsetMs, clickOffsetMs }) {
  const [prefs, updatePrefs] = useStoredPrefs('setlist.padPrefs', defaultPadPrefs);
  const [status, setStatus] = useState({ state: 'off', loaded: 0, failed: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [chord, setChord] = useState(null);
  const playerRef = useRef(null);
  const memoryRef = useRef(emptyPadMemory);
  const timelinesRef = useRef({ timelines: null, content: '', generation: 0 });
  const inputRef = useRef(null);
  if (timelinesRef.current.timelines !== timelines) {
    const content = JSON.stringify((timelines ?? []).map((timeline) => timeline.item));
    const { generation } = timelinesRef.current;
    timelinesRef.current = { timelines, content, generation: content === timelinesRef.current.content ? generation : generation + 1 };
  }
  inputRef.current = { session, timelines, clockOffsetMs, clickOffsetMs: clickOffsetMs ?? 0, generation: timelinesRef.current.generation };

  function startAudio() {
    if (!playerRef.current) {
      const AudioContextClass = audioContextClass();
      if (!AudioContextClass) return setStatus((current) => ({ ...current, state: 'unsupported' }));
      const context = new AudioContextClass({ latencyHint: 'interactive' });
      const player = createPadPlayer(context, prefs.volume);
      playerRef.current = player;
      context.onstatechange = () => setRunning(context.state === 'running');
      setStatus({ state: 'loading', loaded: 0, failed: 0, total: 0 });
      player
        .load((progress) => setStatus({ state: 'loading', ...progress }))
        .then((result) => setStatus({ ...result, state: result.loaded === 0 ? 'failed' : 'ready' }))
        .catch(() => setStatus((current) => ({ ...current, state: 'failed' })));
    }
    const { context } = playerRef.current;
    context.resume().then(() => setRunning(context.state === 'running')).catch(() => {});
  }

  function silence() {
    playerRef.current?.silence();
    memoryRef.current = emptyPadMemory;
    setChord(null);
  }

  function setOn(on) {
    updatePrefs({ on });
    if (on) startAudio();
    else silence();
  }

  function setVolume(volume) {
    updatePrefs({ volume });
    playerRef.current?.setVolume(volume);
  }

  useEffect(() => {
    if (!prefs.on || running) return undefined;
    const unlock = () => startAudio();
    unlockEvents.forEach((name) => document.addEventListener(name, unlock));
    return () => unlockEvents.forEach((name) => document.removeEventListener(name, unlock));
  }, [prefs.on, running]);

  useEffect(() => {
    if (!prefs.on) return undefined;
    let shownChord = null;
    const timer = setInterval(() => {
      const player = playerRef.current;
      const { session: current, timelines: currentTimelines, clockOffsetMs: offsetMs, clickOffsetMs: outputOffsetMs, generation } = inputRef.current;
      if (!player || player.context.state !== 'running' || !current) return;
      const { state } = current;
      const nowMs = sessionElapsedMs(state, Date.now() + offsetMs);
      const key = [generation, state.version, state.itemIdx, state.anchorServerMs, state.anchorOffsetMs].join('|');
      const result = padTick(memoryRef.current, { playing: nowMs !== null, key, nowMs, lookAheadMs, timelines: currentTimelines, fromItem: state.itemIdx, autoAdvance: current.settings.autoAdvance });
      memoryRef.current = result.memory;
      result.actions.forEach((action) => player.play(action, nowMs, outputOffsetMs));
      const nextChord = padChordName(result, shownChord);
      if (nextChord !== shownChord) setChord(nextChord);
      shownChord = nextChord;
    }, tickMs);
    return () => {
      clearInterval(timer);
      silence();
    };
  }, [prefs.on]);

  useEffect(() => () => {
    playerRef.current?.silence();
    playerRef.current?.context.close();
  }, []);

  return { on: prefs.on, volume: prefs.volume, setOn, setVolume, status, running, chord };
}
