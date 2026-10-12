import { useState } from 'react';
import { readStored, writeStored } from '../storage.js';

function loadPrefs(storageKey, defaults) {
  try {
    return { ...defaults, ...JSON.parse(readStored(storageKey) ?? '{}') };
  } catch {
    return defaults;
  }
}

export function useStoredPrefs(storageKey, defaults) {
  const [prefs, setPrefs] = useState(() => loadPrefs(storageKey, defaults));

  function updatePrefs(changes) {
    setPrefs((current) => {
      const next = { ...current, ...changes };
      writeStored(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return [prefs, updatePrefs];
}
