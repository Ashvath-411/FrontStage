import { createPiano } from './piano.js';

const toneVelocity = 76;
const bassVelocity = 84;
const padSampleRange = { low: 36, high: 69 };

function wantedSample(pitch) {
  return pitch >= padSampleRange.low && pitch <= padSampleRange.high;
}

export function createPadPlayer(context, volumeLevel) {
  const volume = context.createGain();
  volume.gain.value = volumeLevel;
  volume.connect(context.destination);
  const piano = createPiano(context, volume);
  let sounding = [];

  function audioTime(atMs, nowMs, offsetMs) {
    return Math.max(context.currentTime, context.currentTime + (atMs - nowMs + offsetMs) / 1000);
  }

  function silence() {
    piano.allNotesOff();
    sounding = [];
  }

  function play(action, nowMs, offsetMs) {
    if (action.kind === 'stop') return silence();
    const when = audioTime(action.atMs, nowMs, offsetMs);
    const next = action.kind === 'chord' ? action.notes.pitches : [];
    sounding.filter((pitch) => !next.includes(pitch)).forEach((pitch) => piano.noteOff(pitch, when));
    next.forEach((pitch, index) => piano.noteOn(pitch, index === 0 ? bassVelocity : toneVelocity, when));
    sounding = next;
  }

  function setVolume(level) {
    volume.gain.setTargetAtTime(level, context.currentTime, 0.02);
  }

  function load(onProgress) {
    return piano.load(onProgress, wantedSample);
  }

  return { context, play, silence, setVolume, load };
}

export function padStatusText({ on, state, running, loaded, total, chord }) {
  if (state === 'unsupported') return 'Pad: error, this browser cannot play sound';
  if (!on) return 'Pad: off';
  if (!running) return 'Pad: tap to start';
  if (state === 'loading') return `Pad: loading ${loaded} of ${total || '…'}`;
  if (state === 'failed') return 'Pad: error, piano sound did not load, playing a simple tone';
  if (chord) return `Pad: playing ${chord}`;
  return 'Pad: ready';
}
