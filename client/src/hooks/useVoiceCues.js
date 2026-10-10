import { useEffect, useRef } from 'react';
import { createCueScheduler, speak, speechAvailable } from '../audio/voiceCues.js';

export function voiceSettings(prefs, instrument) {
  return {
    on: prefs.voiceOn,
    kinds: prefs.cueKinds,
    nextUpDetails: prefs.nextUpDetails,
    instrument,
    rate: prefs.voiceRate,
    volume: prefs.voiceVolume,
    voiceURI: prefs.voiceURI
  };
}

export function useVoiceCues({ enabled, prefs, getPlan, session, instrument }) {
  const settingsRef = useRef(null);
  const schedulerRef = useRef(null);
  settingsRef.current = voiceSettings(prefs, instrument);
  const cueChoices = JSON.stringify([prefs.voiceOn, prefs.voiceRate, prefs.cueKinds, prefs.nextUpDetails, instrument]);

  useEffect(() => {
    if (!enabled || !speechAvailable) return undefined;
    const scheduler = createCueScheduler(getPlan, () => settingsRef.current, speak);
    schedulerRef.current = scheduler;
    scheduler.start();
    return () => {
      scheduler.stop();
      schedulerRef.current = null;
    };
  }, [enabled, getPlan]);

  useEffect(() => {
    schedulerRef.current?.rebuild();
  }, [session?.state.version, session?.snapshot, session?.settings.autoAdvance, cueChoices]);
}
