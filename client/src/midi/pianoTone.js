const sampleNames = ['C', 'Ds', 'Fs', 'A'];
export const middlePitch = 66;
export const maxVoices = 32;
export const releaseSeconds = 0.25;
export const restrikeSeconds = 0.04;
const velocityCurve = 1.7;
const quietestGain = 0.02;
const darkestCutoffHz = 900;
const brightestCutoffHz = 16000;

export function sampleFiles() {
  const files = [];
  for (let octave = 1; octave <= 7; octave += 1) {
    sampleNames.forEach((name, index) => files.push({ pitch: (octave + 1) * 12 + index * 3, file: `${name}${octave}.mp3` }));
  }
  files.push({ pitch: 108, file: 'C8.mp3' });
  return files;
}

export function loadOrder(files) {
  return [...files].sort((first, second) => Math.abs(first.pitch - middlePitch) - Math.abs(second.pitch - middlePitch));
}

export function nearestSample(pitch, loadedPitches) {
  let best = null;
  for (const candidate of loadedPitches) {
    if (best === null || Math.abs(candidate - pitch) < Math.abs(best - pitch)) best = candidate;
  }
  return best;
}

export function playbackRate(pitch, samplePitch) {
  return 2 ** ((pitch - samplePitch) / 12);
}

export function frequencyOf(pitch) {
  return 440 * 2 ** ((pitch - 69) / 12);
}

export function velocityGain(velocity) {
  const level = Math.min(127, Math.max(1, velocity)) / 127;
  return Math.max(quietestGain, level ** velocityCurve);
}

export function velocityCutoff(velocity, pitch) {
  const level = Math.min(127, Math.max(1, velocity)) / 127;
  const cutoff = darkestCutoffHz * (brightestCutoffHz / darkestCutoffHz) ** level;
  return Math.min(brightestCutoffHz, Math.max(cutoff, frequencyOf(pitch) * 4));
}

export function synthDecaySeconds(pitch) {
  return Math.min(6, Math.max(0.8, 6 - (pitch - 36) * 0.07));
}
