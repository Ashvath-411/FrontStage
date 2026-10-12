import { useStoredPrefs } from './useStoredPrefs.js';
import { presetKinds } from '../audio/cuePresets.js';

export const defaultSoundPrefs = {
  clickOn: null,
  clickVolume: 0.8,
  clickOnlyCountIn: false,
  clickInGap: false,
  clickOffsetMs: 0,
  voiceOn: true,
  voiceVolume: 1,
  voiceRate: 1,
  voiceURI: '',
  cueKinds: presetKinds('standard'),
  nextUpDetails: { artist: true, key: true, bpm: true }
};

export function useSoundPrefs(sessionClickDefault) {
  const [stored, updatePrefs] = useStoredPrefs('setlist.soundPrefs', defaultSoundPrefs);
  const prefs = {
    ...stored,
    cueKinds: { ...defaultSoundPrefs.cueKinds, ...stored.cueKinds },
    nextUpDetails: { ...defaultSoundPrefs.nextUpDetails, ...stored.nextUpDetails },
    clickOn: stored.clickOn ?? sessionClickDefault
  };
  return [prefs, updatePrefs];
}
