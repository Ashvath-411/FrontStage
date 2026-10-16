import { frequencyOf, loadOrder, maxVoices, nearestSample, playbackRate, releaseSeconds, restrikeSeconds, sampleFiles, synthDecaySeconds, velocityCutoff, velocityGain } from './pianoTone.js';

const samplesPath = '/piano/';
const loadBatchSize = 6;
const masterLevel = 1.5;
const synthLevel = 0.35;
const limiterSettings = { threshold: -6, knee: 4, ratio: 20, attack: 0.003, release: 0.25 };

function sampleSource(context, buffer, pitch, samplePitch) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate(pitch, samplePitch);
  return { sources: [source], input: source };
}

function synthSource(context, pitch, when) {
  const body = context.createOscillator();
  const shimmer = context.createOscillator();
  const shimmerLevel = context.createGain();
  const decay = context.createGain();
  body.type = 'triangle';
  body.frequency.value = frequencyOf(pitch);
  shimmer.frequency.value = frequencyOf(pitch) * 2;
  shimmerLevel.gain.value = 0.25;
  decay.gain.setValueAtTime(synthLevel, when);
  decay.gain.exponentialRampToValueAtTime(0.0001, when + synthDecaySeconds(pitch));
  body.connect(decay);
  shimmer.connect(shimmerLevel).connect(decay);
  return { sources: [body, shimmer], input: decay };
}

function fadeOut(context, voice, when, seconds) {
  const at = Math.max(when, context.currentTime);
  voice.gain.gain.cancelScheduledValues(at);
  voice.gain.gain.setTargetAtTime(0, at, seconds / 3);
  voice.sources.forEach((source) => source.stop(at + seconds * 2));
  voice.released = true;
}

export function createPiano(context) {
  const buffers = new Map();
  const output = context.createGain();
  const limiter = context.createDynamicsCompressor();
  let voices = [];
  let pedalDown = false;
  const keysDown = new Set();
  output.gain.value = masterLevel;
  Object.entries(limiterSettings).forEach(([name, value]) => {
    limiter[name].value = value;
  });
  output.connect(limiter).connect(context.destination);

  function startVoice(pitch, velocity, when) {
    const samplePitch = nearestSample(pitch, buffers.keys());
    const sound = samplePitch === null ? synthSource(context, pitch, when) : sampleSource(context, buffers.get(samplePitch), pitch, samplePitch);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = velocityCutoff(velocity, pitch);
    gain.gain.setValueAtTime(velocityGain(velocity), when);
    sound.input.connect(filter).connect(gain).connect(output);
    sound.sources.forEach((source) => source.start(when));
    const voice = { pitch, sources: sound.sources, gain, released: false, held: true };
    sound.sources[0].onended = () => {
      voices = voices.filter((candidate) => candidate !== voice);
    };
    return voice;
  }

  function noteOn(pitch, velocity, when = context.currentTime) {
    keysDown.add(pitch);
    voices.filter((voice) => voice.pitch === pitch && !voice.released).forEach((voice) => fadeOut(context, voice, when, restrikeSeconds));
    const playing = voices.filter((voice) => !voice.released);
    if (playing.length >= maxVoices) fadeOut(context, playing[0], when, restrikeSeconds);
    voices.push(startVoice(pitch, velocity, when));
  }

  function noteOff(pitch, when = context.currentTime) {
    keysDown.delete(pitch);
    voices.filter((voice) => voice.pitch === pitch && voice.held && !voice.released).forEach((voice) => {
      voice.held = false;
      if (!pedalDown) fadeOut(context, voice, when, releaseSeconds);
    });
  }

  function setPedal(down, when = context.currentTime) {
    pedalDown = down;
    if (down) return;
    voices.filter((voice) => !voice.held && !voice.released && !keysDown.has(voice.pitch)).forEach((voice) => fadeOut(context, voice, when, releaseSeconds));
  }

  function allNotesOff() {
    keysDown.clear();
    pedalDown = false;
    voices.filter((voice) => !voice.released).forEach((voice) => fadeOut(context, voice, context.currentTime, restrikeSeconds));
  }

  async function loadOne({ pitch, file }) {
    const response = await fetch(samplesPath + file);
    if (!response.ok) throw new Error(`Missing piano sample ${file}`);
    buffers.set(pitch, await context.decodeAudioData(await response.arrayBuffer()));
  }

  async function load(onProgress) {
    const files = loadOrder(sampleFiles());
    let failed = 0;
    for (let start = 0; start < files.length; start += loadBatchSize) {
      const results = await Promise.allSettled(files.slice(start, start + loadBatchSize).map(loadOne));
      failed += results.filter((result) => result.status === 'rejected').length;
      onProgress?.({ loaded: buffers.size, failed, total: files.length });
    }
    return { loaded: buffers.size, failed, total: files.length };
  }

  return { noteOn, noteOff, setPedal, allNotesOff, load };
}
