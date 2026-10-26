import { describe, it, expect, afterEach } from 'vitest';
import { createPadPlayer, padStatusText } from './padPlayer.js';
import { createTestAudioContext } from './testAudioContext.js';
import { chordNotes } from '../engine/chordNotes.js';

const realFetch = globalThis.fetch;
const chordAction = (chord, atMs) => ({ kind: 'chord', atMs, chord, notes: chordNotes(chord) });

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('createPadPlayer', () => {
  it('plays a chord as soon as it is created, before any piano sample has loaded', () => {
    const context = createTestAudioContext();
    const player = createPadPlayer(context, 0.6);
    player.play(chordAction('C', 1000), 900, 0);
    expect(context.started.filter((source) => source.kind === 'oscillator').length).toBeGreaterThanOrEqual(4);
  });

  it('still sounds with a simple tone when every piano sample fails to load', async () => {
    const context = createTestAudioContext();
    const player = createPadPlayer(context, 0.6);
    globalThis.fetch = async () => ({ ok: false });
    expect(await player.load()).toEqual({ loaded: 0, failed: 12, total: 12 });
    player.play(chordAction('Am', 0), 0, 0);
    expect(context.started.length).toBeGreaterThan(0);
  });

  it('loads only the 12 samples the pad range needs', async () => {
    const context = createTestAudioContext();
    const requested = [];
    globalThis.fetch = async (url) => {
      requested.push(url);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
    };
    expect(await createPadPlayer(context, 0.6).load()).toEqual({ loaded: 12, failed: 0, total: 12 });
    expect(requested.length).toBe(12);
  });

  it('schedules the chord on the audio clock, including the output offset', () => {
    const context = createTestAudioContext();
    context.currentTime = 5;
    const player = createPadPlayer(context, 0.6);
    player.play(chordAction('G', 2100), 2000, 40);
    const starts = [...new Set(context.started.map((source) => source.startedAt))];
    expect(starts).toHaveLength(1);
    expect(starts[0]).toBeCloseTo(5.14, 6);
  });

  it('never schedules a late chord in the past', () => {
    const context = createTestAudioContext();
    context.currentTime = 5;
    createPadPlayer(context, 0.6).play(chordAction('G', 1000), 2000, 0);
    context.started.forEach((source) => expect(source.startedAt).toBe(5));
  });

  it('releases on a release and stops everything on a stop', () => {
    const context = createTestAudioContext();
    const player = createPadPlayer(context, 0.6);
    player.play(chordAction('C', 0), 0, 0);
    player.play({ kind: 'release', atMs: 500 }, 0, 0);
    context.started.forEach((source) => expect(source.stoppedAt).toBeGreaterThan(0.5));
    player.play(chordAction('F', 1000), 1000, 0);
    const fChord = context.started.filter((source) => source.stoppedAt === null);
    player.play({ kind: 'stop' }, 1200, 0);
    expect(fChord.length).toBeGreaterThan(0);
    fChord.forEach((source) => expect(source.stoppedAt).not.toBe(null));
  });
});

describe('padStatusText', () => {
  const base = { on: true, state: 'ready', running: true, loaded: 12, total: 12, chord: null };

  it('says what the pad is doing', () => {
    expect(padStatusText({ ...base, on: false })).toBe('Pad: off');
    expect(padStatusText({ ...base, running: false })).toBe('Pad: tap to start');
    expect(padStatusText({ ...base, state: 'loading', loaded: 3 })).toBe('Pad: loading 3 of 12');
    expect(padStatusText(base)).toBe('Pad: ready');
    expect(padStatusText({ ...base, chord: 'Am' })).toBe('Pad: playing Am');
  });

  it('shows an error when the browser has no sound or the piano did not load', () => {
    expect(padStatusText({ ...base, state: 'unsupported', on: false })).toMatch(/^Pad: error/);
    expect(padStatusText({ ...base, state: 'failed', loaded: 0 })).toMatch(/^Pad: error/);
  });

  it('asks for a tap before claiming to load or play', () => {
    expect(padStatusText({ ...base, running: false, state: 'loading', loaded: 3 })).toBe('Pad: tap to start');
    expect(padStatusText({ ...base, running: false, chord: 'C' })).toBe('Pad: tap to start');
  });
});
