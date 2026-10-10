import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClickScheduler } from './clickScheduler.js';
import { buildTimeline } from '../engine/timeline.js';

function fakeAudioContext() {
  const context = { currentTime: 100, state: 'running', destination: {}, clicks: [] };
  context.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (next) => next });
  context.createOscillator = () => {
    const oscillator = { frequency: { value: 0 }, stopped: false };
    oscillator.connect = (next) => next;
    oscillator.start = (at) => context.clicks.push({ at, hz: oscillator.frequency.value, oscillator });
    oscillator.stop = () => {
      oscillator.stopped = true;
    };
    return oscillator;
  };
  return context;
}

const timeline = buildTimeline({
  sections: [{ name: 'A', bpm: 120, beatsPerBar: 4, firstBar: 0, barCount: 16 }],
  bars: Array.from({ length: 16 }, () => ({ chords: [] })),
  countInBars: 0,
  tempoPct: 100,
  gapMode: 'countdown',
  gapSeconds: 4
});

const settings = { clickOn: true, clickVolume: 1, clickOffsetMs: 0, clickInGap: false, clickOnlyCountIn: false };
let serverMs;
let context;
let plan;

function startScheduler(settingsOverride = {}) {
  const scheduler = createClickScheduler(context, () => plan, () => ({ ...settings, ...settingsOverride }));
  scheduler.start();
  return scheduler;
}

function advance(ms) {
  for (let step = 0; step < ms; step += 25) {
    serverMs += 25;
    context.currentTime += 0.025;
    vi.advanceTimersByTime(25);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  serverMs = 10000;
  context = fakeAudioContext();
  plan = { timelines: [timeline], autoAdvance: true, serverNow: () => serverMs, state: { playState: 'playing', itemIdx: 0, anchorServerMs: 10000, anchorOffsetMs: 0, version: 1 } };
});

afterEach(() => vi.useRealTimers());

describe('click scheduler', () => {
  it('clicks every 500 ms at 120 BPM with a higher pitch on beat 1, each beat once', () => {
    plan.state = { ...plan.state, anchorServerMs: 11000 };
    startScheduler();
    advance(3500);
    expect(context.clicks[0].at).toBeCloseTo(101, 6);
    const gaps = context.clicks.slice(1).map((click, index) => click.at - context.clicks[index].at);
    expect(context.clicks.length).toBeGreaterThanOrEqual(4);
    gaps.forEach((gap) => expect(gap).toBeCloseTo(0.5, 6));
    expect(context.clicks.map((click) => click.hz).slice(0, 5)).toEqual([1600, 1000, 1000, 1000, 1600]);
  });

  it('joins mid-song without a burst of past beats', () => {
    serverMs = 10000 + 5250;
    startScheduler();
    advance(300);
    expect(context.clicks).toHaveLength(1);
    expect(context.clicks[0].at).toBeCloseTo(100.25, 6);
  });

  it('schedules nothing while paused or idle', () => {
    plan.state = { ...plan.state, playState: 'paused' };
    startScheduler();
    advance(1000);
    expect(context.clicks).toHaveLength(0);
  });

  it('stops future clicks on reset and reschedules from the new state', () => {
    plan.state = { ...plan.state, anchorServerMs: 10100 };
    const scheduler = startScheduler();
    advance(100);
    const scheduledBefore = context.clicks.length;
    advance(380);
    const future = context.clicks.filter((click) => click.at > context.currentTime);
    expect(future.length).toBeGreaterThan(0);
    plan.state = { ...plan.state, playState: 'paused', version: 2 };
    scheduler.reset();
    future.forEach((click) => expect(click.oscillator.stopped).toBe(true));
    advance(1000);
    expect(context.clicks.length).toBe(scheduledBefore + future.length);
  });

  it('moves clicks by the offset and still reaches early beats with a negative offset', () => {
    serverMs = 10000 + 400;
    startScheduler({ clickOffsetMs: -200 });
    advance(300);
    expect(context.clicks).toHaveLength(1);
    expect(context.clicks[0].at).toBeCloseTo(100.4, 6);
  });
});
