import { useRef, useState } from 'react';
import { useMidiInput } from './useMidiInput.js';
import { useMidiLearn } from './useMidiLearn.js';
import { useToast } from '../toastContext.jsx';
import { acceptPress, emptyPressMemory, pressIsDiscrete, sessionActions, sessionCommand, sessionMidiAllowed, sessionMidiStoragePrefix } from '../midi/sessionMidi.js';

export function useSessionMidi({ session, position, timelines, controls, clockOffsetMs }) {
  const showToast = useToast();
  const allowed = sessionMidiAllowed(session);
  const pressRef = useRef(emptyPressMemory);
  const [lastDevice, setLastDevice] = useState(null);

  function run(action) {
    if (!session || !position || !timelines) return;
    const command = sessionCommand(action, { session, position, timelines, serverNow: Date.now() + clockOffsetMs });
    if (command?.toast) showToast(command.toast);
    if (command?.send) controls.send(...command.send);
  }

  function onAction(action, { pressed, message }) {
    const result = acceptPress(pressRef.current, action, { pressed, discrete: pressIsDiscrete(message), atMs: performance.now() });
    pressRef.current = result.memory;
    if (result.fire && allowed) run(action);
  }

  const learn = useMidiLearn(onAction, { actions: sessionActions, storagePrefix: sessionMidiStoragePrefix, allowSustain: true, releases: true });
  const midi = useMidiInput((message, source) => {
    if (!allowed) return;
    if (source.deviceName !== lastDevice) setLastDevice(source.deviceName);
    learn.handle(message, source.deviceName);
  }, { active: allowed });

  const learnDevice = midi.selectedName ?? lastDevice ?? midi.devices[0]?.name ?? null;
  return { allowed, ended: session?.state.playState === 'ended', midi, learn, learnDevice };
}
