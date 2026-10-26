import { useEffect, useRef, useState } from 'react';
import { createPiano } from '../midi/piano.js';
import { createTransport } from '../midi/transport.js';
import { eventContextTime } from '../midi/recorder.js';

function audioContextClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

export function heardTime(context, perfMs) {
  const latencySeconds = (context.baseLatency ?? 0) + (context.outputLatency ?? 0);
  return eventContextTime(perfMs, context.getOutputTimestamp?.(), { currentTime: context.currentTime, latencySeconds, nowPerfMs: performance.now() });
}

export function usePianoSound() {
  const contextRef = useRef(null);
  const pianoRef = useRef(null);
  const transportRef = useRef(null);
  const [sound, setSound] = useState({ state: 'loading', loaded: 0, failed: 0, total: 0 });

  useEffect(() => {
    const AudioContextClass = audioContextClass();
    if (!AudioContextClass) {
      setSound((current) => ({ ...current, state: 'unsupported' }));
      return undefined;
    }
    const context = new AudioContextClass({ latencyHint: 'interactive' });
    const piano = createPiano(context);
    contextRef.current = context;
    pianoRef.current = piano;
    transportRef.current = createTransport(context, piano);
    let open = true;
    piano.load((progress) => open && setSound({ state: 'loading', ...progress }))
      .then((result) => open && setSound({ ...result, state: result.loaded === 0 ? 'failed' : 'ready' }));
    return () => {
      open = false;
      transportRef.current.stop();
      piano.allNotesOff();
      context.close();
    };
  }, []);

  function wake() {
    if (contextRef.current?.state === 'suspended') return contextRef.current.resume();
    return Promise.resolve();
  }

  return { contextRef, pianoRef, transportRef, sound, wake };
}
