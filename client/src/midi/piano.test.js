import { describe, it, expect } from 'vitest';
import { createPiano } from './piano.js';
import { createTestAudioContext } from './testAudioContext.js';
import { maxVoices } from './pianoTone.js';

function voicesFor(context, pitch) {
  return context.started.filter((source) => source.kind === 'oscillator' && source.type === 'triangle' && Math.abs(source.frequency.value - 440 * 2 ** ((pitch - 69) / 12)) < 0.01);
}

describe('createPiano', () => {
  it('plays a synth voice before samples load and releases it on note off', () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    piano.noteOn(60, 100, 0);
    const [voice] = voicesFor(context, 60);
    expect(voice.startedAt).toBe(0);
    expect(voice.stoppedAt).toBe(null);
    piano.noteOff(60, 1);
    expect(voice.stoppedAt).toBeGreaterThan(1);
  });

  it('holds released notes while the pedal is down', () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    piano.setPedal(true, 0);
    piano.noteOn(60, 100, 0);
    piano.noteOff(60, 0.5);
    const [voice] = voicesFor(context, 60);
    expect(voice.stoppedAt).toBe(null);
    piano.setPedal(false, 2);
    expect(voice.stoppedAt).toBeGreaterThan(2);
  });

  it('keeps a held key sounding when the pedal lifts', () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    piano.setPedal(true, 0);
    piano.noteOn(64, 90, 0);
    piano.setPedal(false, 1);
    expect(voicesFor(context, 64)[0].stoppedAt).toBe(null);
  });

  it('re-strikes a repeated note and caps polyphony', () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    piano.noteOn(60, 100, 0);
    piano.noteOn(60, 100, 0.5);
    const [first, second] = voicesFor(context, 60);
    expect(first.stoppedAt).toBeGreaterThan(0.5);
    expect(first.stoppedAt).toBeLessThan(0.7);
    expect(second.stoppedAt).toBe(null);
    for (let pitch = 30; pitch < 30 + maxVoices; pitch += 1) piano.noteOn(pitch, 80, 1);
    expect(second.stoppedAt).not.toBe(null);
  });

  it('uses loaded samples with the right playback rate', async () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    const result = await piano.load();
    expect(result).toEqual({ loaded: 29, failed: 0, total: 29 });
    piano.noteOn(61, 100, 0);
    const sample = context.started.find((source) => source.kind === 'buffer');
    expect(sample.playbackRate.value).toBeCloseTo(2 ** (1 / 12), 6);
  });

  it('reports samples that fail to load', async () => {
    const context = createTestAudioContext();
    const piano = createPiano(context);
    globalThis.fetch = async (url) => ({ ok: !url.includes('C8'), arrayBuffer: async () => new ArrayBuffer(8) });
    expect(await piano.load()).toEqual({ loaded: 28, failed: 1, total: 29 });
  });
});
