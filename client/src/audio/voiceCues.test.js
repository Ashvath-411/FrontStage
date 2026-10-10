import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCueScheduler } from './voiceCues.js';
import { cueKinds } from './cueList.js';
import { estimateSpeechMs } from './cueText.js';
import { buildTimeline } from '../engine/timeline.js';

const barMs = 2000;

function song(title, overrides = {}) {
  return {
    title, artist: '', keyRoot: 'C', keyMode: 'major', transpose: 0, tempoPct: 100, countInBars: 1,
    gapMode: 'countdown', gapSeconds: 8, note: '', annotations: [],
    sections: [{ name: 'Verse', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 4 }, { name: 'Chorus', bpm: 120, beatsPerBar: 4, firstBar: 4, barCount: 4 }],
    bars: Array.from({ length: 8 }, () => ({ chords: [], lyric: '' })),
    ...overrides
  };
}

const timelines = [song('Song One'), song('Song Two')].map(buildTimeline);
const settings = {
  on: true, rate: 1, volume: 1, instrument: 'keys',
  kinds: Object.fromEntries(cueKinds.map((kind) => [kind, kind !== 'gap-time'])),
  nextUpDetails: { artist: false, key: false, bpm: false }
};
const chorusCueStartMs = barMs + 3 * barMs - estimateSpeechMs('Chorus');
const gapStartMs = barMs + 8 * barMs;

let serverMs;
let plan;
let spoken;

function makePlan(state) {
  return { timelines, autoAdvance: true, serverNow: () => serverMs, state: { playState: 'playing', itemIdx: 0, anchorServerMs: 0, anchorOffsetMs: 0, version: 1, ...state } };
}

function startScheduler() {
  const scheduler = createCueScheduler(() => plan, () => settings, (text) => spoken.push(text));
  scheduler.start();
  return scheduler;
}

function playUntil(elapsedMs) {
  while (serverMs < elapsedMs) {
    serverMs += 100;
    vi.advanceTimersByTime(100);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  serverMs = 0;
  spoken = [];
  plan = makePlan({});
});

afterEach(() => vi.useRealTimers());

describe('cue scheduler', () => {
  it('speaks each cue once, when its speech has to start', () => {
    const scheduler = startScheduler();
    playUntil(chorusCueStartMs - 100);
    expect(spoken).toEqual([]);
    playUntil(chorusCueStartMs + 100);
    expect(spoken).toEqual(['Chorus']);
    playUntil(gapStartMs + 8000);
    expect(spoken).toEqual(['Chorus', 'Ending', 'Next up, Song Two.', '3', '2', '1']);
    scheduler.stop();
  });

  it('skips cues already in the past for a device that joins late', () => {
    serverMs = gapStartMs + 500;
    const scheduler = startScheduler();
    playUntil(gapStartMs + 8000);
    expect(spoken).toEqual(['3', '2', '1']);
    scheduler.stop();
  });

  it('drops pending cues and rebuilds from the new position after a state change', () => {
    const scheduler = startScheduler();
    playUntil(1000);
    plan = makePlan({ version: 2, anchorServerMs: 1000, anchorOffsetMs: gapStartMs - 200 });
    playUntil(1000 + 8500);
    expect(spoken).toEqual(['Next up, Song Two.', '3', '2', '1']);
    scheduler.stop();
  });

  it('never repeats a cue when the list is rebuilt in the same state version', () => {
    const scheduler = startScheduler();
    playUntil(chorusCueStartMs + 100);
    scheduler.rebuild();
    serverMs = chorusCueStartMs - 300;
    scheduler.rebuild();
    playUntil(chorusCueStartMs + 300);
    expect(spoken).toEqual(['Chorus']);
    scheduler.stop();
  });

  it('stays quiet while paused or when spoken cues are off', () => {
    plan = makePlan({ playState: 'paused' });
    const scheduler = startScheduler();
    playUntil(gapStartMs + 8000);
    settings.on = false;
    plan = makePlan({ version: 2 });
    serverMs = 0;
    playUntil(gapStartMs + 8000);
    settings.on = true;
    expect(spoken).toEqual([]);
    scheduler.stop();
  });
});
