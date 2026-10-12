import { useStoredPrefs } from './useStoredPrefs.js';

export const defaultViewPrefs = { textSize: 'normal', instrument: '', hideLyrics: false, hideChords: false, chordsPosition: 'below' };

export function useViewPrefs() {
  return useStoredPrefs('setlist.viewPrefs', defaultViewPrefs);
}
