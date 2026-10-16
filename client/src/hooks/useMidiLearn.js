import { useState } from 'react';
import { readStored, writeStored } from '../storage.js';
import { bindingFromMessage, boundAction, readBindings } from '../midi/midiMessages.js';

const storagePrefix = 'frontstage.midiLearn.';

export function useMidiLearn(onAction) {
  const [byDevice, setByDevice] = useState({});
  const [learning, setLearning] = useState(null);

  function bindingsFor(deviceName) {
    return byDevice[deviceName] ?? readBindings(readStored(storagePrefix + deviceName));
  }

  function saveBindings(deviceName, bindings) {
    writeStored(storagePrefix + deviceName, JSON.stringify(bindings));
    setByDevice((current) => ({ ...current, [deviceName]: bindings }));
  }

  function handle(message, deviceName) {
    if (learning) {
      const binding = bindingFromMessage(message);
      if (!binding) return false;
      saveBindings(deviceName, { ...bindingsFor(deviceName), [learning]: binding });
      setLearning(null);
      return true;
    }
    const match = boundAction(bindingsFor(deviceName), message);
    if (!match) return false;
    if (match.pressed) onAction(match.action);
    return true;
  }

  function clear(deviceName, action) {
    const { [action]: removed, ...rest } = bindingsFor(deviceName);
    if (removed) saveBindings(deviceName, rest);
  }

  return { learning, startLearning: setLearning, cancelLearning: () => setLearning(null), bindingsFor, handle, clear };
}
