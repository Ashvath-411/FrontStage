import { useEffect, useRef, useState } from 'react';
import { createClickScheduler, playTestClicks } from '../audio/clickScheduler.js';
import { speakInOrder, speechAvailable, unlockSpeech } from '../audio/voiceCues.js';
import { useSoundPrefs } from './useSoundPrefs.js';
import { useVoiceCues, voiceSettings } from './useVoiceCues.js';

function audioContextClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

function useBackgroundNotice(enabled) {
  const [notice, setNotice] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    let wasHidden = false;
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') wasHidden = true;
      else if (wasHidden) setNotice(true);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [enabled]);
  return [notice, () => setNotice(false)];
}

export function useSound({ session, timelines, clockOffsetMs, instrument }) {
  const [prefs, updatePrefs] = useSoundPrefs(Boolean(session?.settings.audioClick));
  const contextRef = useRef(null);
  const schedulerRef = useRef(null);
  const planRef = useRef(null);
  const getPlan = useRef(() => planRef.current).current;
  const prefsRef = useRef(prefs);
  const [contextState, setContextState] = useState('off');
  const enabled = contextState === 'running';
  const [backgroundNotice, dismissBackgroundNotice] = useBackgroundNotice(enabled);

  planRef.current = session && {
    timelines,
    state: session.state,
    autoAdvance: session.settings.autoAdvance,
    serverNow: () => Date.now() + clockOffsetMs
  };
  prefsRef.current = prefs;

  async function enable() {
    unlockSpeech();
    const AudioContextClass = audioContextClass();
    if (!AudioContextClass) return setContextState('unsupported');
    if (!contextRef.current) {
      contextRef.current = new AudioContextClass();
      contextRef.current.onstatechange = () => setContextState(contextRef.current.state);
      schedulerRef.current = createClickScheduler(contextRef.current, () => planRef.current, () => prefsRef.current);
    }
    await contextRef.current.resume();
    setContextState(contextRef.current.state);
    schedulerRef.current.start();
  }

  useEffect(() => () => {
    schedulerRef.current?.stop();
    contextRef.current?.close();
  }, []);

  useEffect(() => {
    schedulerRef.current?.reset();
  }, [session?.state.version, prefs.clickOn, prefs.clickOffsetMs, prefs.clickInGap, prefs.clickOnlyCountIn]);

  useVoiceCues({ enabled, prefs, getPlan, session, instrument });

  function audioDebug() {
    const context = contextRef.current;
    return {
      state: context?.state ?? contextState,
      baseLatency: context?.baseLatency,
      outputLatency: context?.outputLatency,
      clickOffsetMs: prefs.clickOffsetMs
    };
  }

  return {
    prefs,
    updatePrefs,
    contextState,
    enabled,
    enable,
    voiceAvailable: speechAvailable,
    testClick: () => enabled && playTestClicks(contextRef.current, prefs.clickVolume),
    previewCues: (texts) => speakInOrder(texts, voiceSettings(prefs, instrument)),
    instrument,
    audioDebug,
    backgroundNotice,
    dismissBackgroundNotice
  };
}
