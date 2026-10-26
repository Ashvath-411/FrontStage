import { useState } from 'react';
import { readStored, writeStored } from '../storage.js';
import { bindingFromMessage, boundAction, learnableActions, readBindings } from '../midi/midiMessages.js';

const recordStoragePrefix = 'frontstage.midiLearn.';

export function useMidiLearn(onAction, { actions = learnableActions, storagePrefix = recordStoragePrefix, allowSustain = false, releases = false } = {}) {
  const [byDevice, setByDevice] = useState({});
  const [learning, setLearning] = useState(null);

  function bindingsFor(deviceName) {
    return byDevice[deviceName] ?? readBindings(readStored(storagePrefix + deviceName), actions);
  }

  function saveBindings(deviceName, bindings) {
    writeStored(storagePrefix + deviceName, JSON.stringify(bindings));
    setByDevice((current) => ({ ...current, [deviceName]: bindings }));
  }

  function handle(message, deviceName) {
    if (learning) {
      const binding = bindingFromMessage(message, { allowSustain });
      if (!binding) return false;
      saveBindings(deviceName, { ...bindingsFor(deviceName), [learning]: binding });
      setLearning(null);
      return true;
    }
    const match = boundAction(bindingsFor(deviceName), message, actions);
    if (!match) return false;
    if (match.pressed) onAction(match.action, { pressed: true, message });
    else if (releases) onAction(match.action, { pressed: false, message });
    return true;
  }

  function clear(deviceName, action) {
    const { [action]: removed, ...rest } = bindingsFor(deviceName);
    if (removed) saveBindings(deviceName, rest);
  }

  function resetAll(deviceName) {
    saveBindings(deviceName, {});
  }

  return { learning, startLearning: setLearning, cancelLearning: () => setLearning(null), bindingsFor, handle, clear, resetAll };
}
