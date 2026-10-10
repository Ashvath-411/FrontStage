import { beatsBetween } from '../engine/beats.js';

const tickMs = 25;
const lookAheadMs = 150;
const lateLimitSeconds = 0.02;
const accentHz = 1600;
const beatHz = 1000;
const clickSeconds = 0.05;

export function playClick(context, startAt, accent, volume) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.frequency.value = accent ? accentHz : beatHz;
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.002);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + clickSeconds);
  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + clickSeconds + 0.01);
  return oscillator;
}

function elapsedNow(plan) {
  return plan.serverNow() - plan.state.anchorServerMs + plan.state.anchorOffsetMs;
}

function wantedBeats(plan, settings, fromMs, toMs) {
  const beats = beatsBetween(plan.timelines, plan.state.itemIdx, plan.autoAdvance, fromMs, toMs, settings.clickInGap);
  return settings.clickOnlyCountIn ? beats.filter((beat) => beat.phase === 'countin') : beats;
}

export function createClickScheduler(context, getPlan, getSettings) {
  let scheduledUntilMs = null;
  let sources = [];
  let timer = null;

  function schedule(beat, nowMs, settings) {
    const audioTime = context.currentTime + (beat.atMs - nowMs) / 1000 + settings.clickOffsetMs / 1000;
    if (audioTime < context.currentTime - lateLimitSeconds) return;
    const source = playClick(context, Math.max(audioTime, context.currentTime), beat.accent, settings.clickVolume);
    sources.push(source);
    source.onended = () => {
      sources = sources.filter((candidate) => candidate !== source);
    };
  }

  function tick() {
    const plan = getPlan();
    const settings = getSettings();
    if (!plan || !settings.clickOn || plan.state.playState !== 'playing' || context.state !== 'running') return;
    const nowMs = elapsedNow(plan);
    const firstAudibleMs = nowMs - settings.clickOffsetMs;
    const fromMs = scheduledUntilMs ?? firstAudibleMs;
    const toMs = firstAudibleMs + lookAheadMs;
    if (toMs <= fromMs) return;
    wantedBeats(plan, settings, fromMs, toMs).forEach((beat) => schedule(beat, nowMs, settings));
    scheduledUntilMs = toMs;
  }

  function reset() {
    sources.forEach((source) => source.stop());
    sources = [];
    scheduledUntilMs = null;
  }

  return {
    start() {
      if (!timer) timer = setInterval(tick, tickMs);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      reset();
    },
    reset
  };
}

export function playTestClicks(context, volume) {
  const beatSeconds = 60 / 100;
  const firstAt = context.currentTime + 0.1;
  for (let beat = 0; beat < 4; beat += 1) playClick(context, firstAt + beat * beatSeconds, beat === 0, volume);
}
