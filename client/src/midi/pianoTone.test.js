import { describe, it, expect } from 'vitest';
import { frequencyOf, loadOrder, nearestSample, playbackRate, sampleFiles, synthDecaySeconds, velocityCutoff, velocityGain } from './pianoTone.js';

describe('piano samples', () => {
  it('lists one sample every minor third from C1 to C8', () => {
    const files = sampleFiles();
    expect(files).toHaveLength(29);
    expect(files[0]).toEqual({ pitch: 24, file: 'C1.mp3' });
    expect(files.find((entry) => entry.pitch === 63)).toEqual({ pitch: 63, file: 'Ds4.mp3' });
    expect(files.find((entry) => entry.pitch === 69)).toEqual({ pitch: 69, file: 'A4.mp3' });
    expect(files.at(-1)).toEqual({ pitch: 108, file: 'C8.mp3' });
  });

  it('loads the middle of the keyboard first', () => {
    const order = loadOrder(sampleFiles()).map((entry) => entry.file);
    expect(order[0]).toBe('Fs4.mp3');
    expect(order.slice(1, 3).sort()).toEqual(['A4.mp3', 'Ds4.mp3']);
    expect(order.at(-1)).toBe('C8.mp3');
  });

  it('picks the closest loaded sample so no note shifts more than 1.5 semitones', () => {
    const all = sampleFiles().map((entry) => entry.pitch);
    for (let pitch = 24; pitch <= 108; pitch += 1) expect(Math.abs(nearestSample(pitch, all) - pitch)).toBeLessThanOrEqual(1.5);
    expect(nearestSample(61, [60, 72])).toBe(60);
    expect(nearestSample(61, [])).toBe(null);
  });
});

describe('tone math', () => {
  it('shifts pitch by playback rate', () => {
    expect(playbackRate(72, 60)).toBe(2);
    expect(playbackRate(60, 60)).toBe(1);
    expect(playbackRate(59, 60)).toBeCloseTo(0.9439, 4);
    expect(frequencyOf(69)).toBe(440);
  });

  it('makes louder velocities louder and brighter', () => {
    expect(velocityGain(127)).toBe(1);
    expect(velocityGain(64)).toBeLessThan(0.4);
    expect(velocityGain(64)).toBeGreaterThan(velocityGain(32));
    expect(velocityGain(0)).toBeGreaterThan(0);
    expect(velocityCutoff(127, 60)).toBe(16000);
    expect(velocityCutoff(40, 60)).toBeLessThan(velocityCutoff(100, 60));
    expect(velocityCutoff(1, 96)).toBeGreaterThanOrEqual(frequencyOf(96) * 4);
  });

  it('lets low synth notes ring longer than high ones', () => {
    expect(synthDecaySeconds(36)).toBeGreaterThan(synthDecaySeconds(84));
    expect(synthDecaySeconds(120)).toBe(0.8);
  });
});
