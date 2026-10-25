import { useEffect, useRef, useState } from 'react';
import { useStoredPrefs } from './useStoredPrefs.js';
import { emptyPadMemory, padTick, sessionElapsedMs } from '../engine/padSchedule.js';

const tickMs = 25;
const lookAheadMs = 150;
const toneVelocity = 58;
const bassVelocity = 68;
const padSampleRange = { low: 36, high: 69 };
export const defaultPadPrefs = { on: false, volume: 0.6 };

function audioContextClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

function wantedSample(pitch) {
  return pitch >= padSampleRange.low && pitch <= padSampleRange.high;
}

function playAction(audio, action, nowMs, offsetMs) {
  const { context, piano } = audio;
  const at = (atMs) => Math.max(context.currentTime, context.currentTime + (atMs - nowMs + offsetMs) / 1000);
  if (action.kind === 'stop') {
    piano.allNotesOff();
    audio.sounding = [];
    return;
  }
  const when = at(action.atMs);
  const next = action.kind === 'chord' ? action.notes.pitches : [];
  audio.sounding.filter((pitch) => !next.includes(pitch)).forEach((pitch) => piano.noteOff(pitch, when));
  next.forEach((pitch, index) => piano.noteOn(pitch, index === 0 ? bassVelocity : toneVelocity, when));
  audio.sounding = next;
}

export function useLivePad({ session, timelines, clockOffsetMs, clickOffsetMs }) {
  const [prefs, updatePrefs] = useStoredPrefs('setlist.padPrefs', defaultPadPrefs);
  const [status, setStatus] = useState({ state: 'off', loaded: 0, failed: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const audioRef = useRef(null);
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
    if (!audioRef.current) {
      const AudioContextClass = audioContextClass();
      if (!AudioContextClass) return setStatus((current) => ({ ...current, state: 'unsupported' }));
      const context = new AudioContextClass({ latencyHint: 'interactive' });
      const volume = context.createGain();
      volume.gain.value = prefs.volume;
      volume.connect(context.destination);
      const audio = { context, volume, piano: null, sounding: [] };
      audioRef.current = audio;
      context.onstatechange = () => setRunning(context.state === 'running');
      setStatus({ state: 'loading', loaded: 0, failed: 0, total: 0 });
      import('../midi/piano.js')
        .then(({ createPiano }) => {
          audio.piano = createPiano(context, volume);
          return audio.piano.load((progress) => setStatus({ state: 'loading', ...progress }), wantedSample);
        })
        .then((result) => setStatus({ ...result, state: result.loaded === 0 ? 'failed' : 'ready' }))
        .catch(() => setStatus((current) => ({ ...current, state: 'failed' })));
    }
    audioRef.current.context.resume().then(() => setRunning(audioRef.current?.context.state === 'running')).catch(() => {});
  }

  function silence() {
    audioRef.current?.piano?.allNotesOff();
    if (audioRef.current) audioRef.current.sounding = [];
    memoryRef.current = emptyPadMemory;
  }

  function setOn(on) {
    updatePrefs({ on });
    if (on) startAudio();
    else silence();
  }

  function setVolume(volume) {
    updatePrefs({ volume });
    const audio = audioRef.current;
    audio?.volume.gain.setTargetAtTime(volume, audio.context.currentTime, 0.02);
  }

  useEffect(() => {
    if (!prefs.on || running) return undefined;
    const unlock = () => startAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [prefs.on, running]);

  useEffect(() => {
    if (!prefs.on) return undefined;
    const timer = setInterval(() => {
      const audio = audioRef.current;
      const { session: current, timelines: currentTimelines, clockOffsetMs: offsetMs, clickOffsetMs: outputOffsetMs, generation } = inputRef.current;
      if (!audio?.piano || audio.context.state !== 'running' || !current) return;
      const { state } = current;
      const nowMs = sessionElapsedMs(state, Date.now() + offsetMs);
      const key = [generation, state.version, state.itemIdx, state.anchorServerMs, state.anchorOffsetMs].join('|');
      const result = padTick(memoryRef.current, { playing: nowMs !== null, key, nowMs, lookAheadMs, timelines: currentTimelines, fromItem: state.itemIdx, autoAdvance: current.settings.autoAdvance });
      memoryRef.current = result.memory;
      result.actions.forEach((action) => playAction(audio, action, nowMs, outputOffsetMs));
    }, tickMs);
    return () => {
      clearInterval(timer);
      silence();
    };
  }, [prefs.on]);

  useEffect(() => () => {
    audioRef.current?.piano?.allNotesOff();
    audioRef.current?.context.close();
  }, []);

  return { on: prefs.on, volume: prefs.volume, setOn, setVolume, status, running };
}
