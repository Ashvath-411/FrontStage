import { useState } from 'react';

function withPitch(held, pitch, isDown) {
  const next = new Set(held);
  if (isDown) next.add(pitch);
  else next.delete(pitch);
  return next;
}

export function useRecordMode() {
  const [held, setHeld] = useState(() => new Set());

  function noteOn(pitch) {
    setHeld((current) => withPitch(current, pitch, true));
  }

  function noteOff(pitch) {
    setHeld((current) => withPitch(current, pitch, false));
  }

  function handleMidi(message) {
    if (message.kind === 'noteOn') noteOn(message.note, message.velocity);
    if (message.kind === 'noteOff') noteOff(message.note);
  }

  return { held, noteOn, noteOff, handleMidi };
}
