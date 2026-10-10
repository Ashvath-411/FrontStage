import { buildCues } from './cueList.js';
import { estimateSpeechMs } from './cueText.js';

export const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
const tickMs = 100;
const lateLimitMs = 1500;

function elapsedNow(plan) {
  return plan.serverNow() - plan.state.anchorServerMs + plan.state.anchorOffsetMs;
}

function isPlaying(plan) {
  return plan?.state.playState === 'playing';
}

export function createCueScheduler(getPlan, getSettings, speakNow) {
  let pending = [];
  let spokenIds = new Set();
  let version = null;
  let timer = null;

  function rebuild() {
    const plan = getPlan();
    const settings = getSettings();
    if (plan && plan.state.version !== version) {
      version = plan.state.version;
      spokenIds = new Set();
    }
    if (!isPlaying(plan) || !settings.on) {
      pending = [];
      return;
    }
    const options = { kinds: settings.kinds, nextUpDetails: settings.nextUpDetails, instrument: settings.instrument, rate: settings.rate, fromMs: elapsedNow(plan) - tickMs };
    pending = buildCues(plan.timelines, plan.state.itemIdx, plan.autoAdvance, options).filter((cue) => !spokenIds.has(cue.id));
  }

  function tick() {
    const plan = getPlan();
    const settings = getSettings();
    if (plan && plan.state.version !== version) rebuild();
    if (!isPlaying(plan) || !settings.on || pending.length === 0) return;
    const nowMs = elapsedNow(plan);
    const startOf = (cue) => cue.atMs - estimateSpeechMs(cue.text, settings.rate);
    const due = pending.filter((cue) => startOf(cue) <= nowMs);
    if (due.length === 0) return;
    pending = pending.filter((cue) => !due.includes(cue));
    due.forEach((cue) => spokenIds.add(cue.id));
    const latest = due.at(-1);
    if (nowMs - startOf(latest) <= lateLimitMs) speakNow(latest.text, settings);
  }

  return {
    start() {
      rebuild();
      if (!timer) timer = setInterval(tick, tickMs);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      pending = [];
    },
    rebuild,
    pendingCues: () => pending
  };
}

export function englishVoices() {
  if (!speechAvailable) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
}

export function bestEnglishVoice(voices) {
  const quality = /premium|enhanced|natural|neural|google/i;
  return voices.find((voice) => voice.default) ?? voices.find((voice) => quality.test(voice.name)) ?? voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

function utteranceFor(text, settings) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = englishVoices();
  const voice = voices.find((candidate) => candidate.voiceURI === settings.voiceURI) ?? bestEnglishVoice(voices);
  utterance.lang = voice?.lang ?? 'en';
  if (voice) utterance.voice = voice;
  utterance.volume = settings.volume;
  utterance.rate = settings.rate;
  return utterance;
}

export function speak(text, settings) {
  if (!speechAvailable) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utteranceFor(text, settings));
}

export function unlockSpeech() {
  if (!speechAvailable) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
}

function chainFrom(texts, settings) {
  const [first, ...rest] = texts;
  const utterance = utteranceFor(first, settings);
  utterance.onend = () => {
    if (rest.length > 0) window.speechSynthesis.speak(chainFrom(rest, settings));
  };
  return utterance;
}

export function speakInOrder(texts, settings) {
  if (!speechAvailable || texts.length === 0) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(chainFrom(texts, settings));
}
