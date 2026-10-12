import { useEffect, useState } from 'react';
import { englishVoices, speechAvailable } from '../audio/voiceCues.js';

export function useEnglishVoices() {
  const [voices, setVoices] = useState(() => englishVoices());
  useEffect(() => {
    if (!speechAvailable) return undefined;
    const refresh = () => setVoices(englishVoices());
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
    refresh();
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
  }, []);
  return voices;
}
