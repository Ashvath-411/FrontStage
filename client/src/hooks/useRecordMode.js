import { useEffect, useRef, useState } from 'react';
import { createPiano } from '../midi/piano.js';
import { isSustainMessage, pedalIsDown } from '../midi/midiMessages.js';

function withPitch(held, pitch, isDown) {
  const next = new Set(held);
  if (isDown) next.add(pitch);
  else next.delete(pitch);
  return next;
}

function audioContextClass() {
  return window.AudioContext ?? window.webkitAudioContext ?? null;
}

function usePianoSound() {
  const contextRef = useRef(null);
  const pianoRef = useRef(null);
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
    let open = true;
    piano.load((progress) => open && setSound({ state: 'loading', ...progress }))
      .then((result) => open && setSound({ ...result, state: result.loaded === 0 ? 'failed' : 'ready' }));
    return () => {
      open = false;
      piano.allNotesOff();
      context.close();
    };
  }, []);

  function wake() {
    if (contextRef.current?.state === 'suspended') contextRef.current.resume();
  }

  return { contextRef, pianoRef, sound, wake };
}

export function useRecordMode() {
  const [held, setHeld] = useState(() => new Set());
  const [pedal, setPedal] = useState(false);
  const { pianoRef, sound, wake, contextRef } = usePianoSound();

  function noteOn(pitch, velocity) {
    wake();
    pianoRef.current?.noteOn(pitch, velocity);
    setHeld((current) => withPitch(current, pitch, true));
  }

  function noteOff(pitch) {
    pianoRef.current?.noteOff(pitch);
    setHeld((current) => withPitch(current, pitch, false));
  }

  function pedalChange(down) {
    pianoRef.current?.setPedal(down);
    setPedal(down);
  }

  function handleMidi(message) {
    if (message.kind === 'noteOn') noteOn(message.note, message.velocity);
    if (message.kind === 'noteOff') noteOff(message.note);
    if (isSustainMessage(message)) pedalChange(pedalIsDown(message.value));
  }

  return { held, pedal, sound, contextRef, noteOn, noteOff, handleMidi };
}
