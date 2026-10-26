import { useEffect, useRef, useState } from 'react';
import { heardTime, usePianoSound } from './usePianoSound.js';
import { isSustainMessage, pedalIsDown } from '../midi/midiMessages.js';
import { beatSeconds, finishTake, positionLabel, startTake, takeNoteOff, takeNoteOn, takePedal, trustedEventTime } from '../midi/recorder.js';

const startLeadSeconds = 0.15;

function withPitch(held, pitch, isDown) {
  const next = new Set(held);
  if (isDown) next.add(pitch);
  else next.delete(pitch);
  return next;
}

function usePosition(mode, getBeat, beatsPerBar) {
  const [position, setPosition] = useState(null);
  useEffect(() => {
    if (mode === 'idle') {
      setPosition(null);
      return undefined;
    }
    let frame = requestAnimationFrame(function update() {
      const next = positionLabel(getBeat(), beatsPerBar);
      setPosition((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      frame = requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, beatsPerBar]);
  return position;
}

export function useRecordMode() {
  const { contextRef, pianoRef, transportRef, sound, wake } = usePianoSound();
  const [held, setHeld] = useState(() => new Set());
  const [pedal, setPedal] = useState(false);
  const [mode, setMode] = useState('idle');
  const [take, setTake] = useState(null);
  const [nothingRecorded, setNothingRecorded] = useState(false);
  const recordingRef = useRef(null);
  const clockRef = useRef(null);
  const position = usePosition(mode, () => {
    const clock = clockRef.current;
    return clock ? (heardTime(contextRef.current, performance.now()) - clock.beatZero) / clock.beatSeconds : 0;
  }, clockRef.current?.beatsPerBar ?? 4);

  function recordEvent(change, timeStamp) {
    if (!recordingRef.current) return;
    recordingRef.current = change(recordingRef.current, heardTime(contextRef.current, trustedEventTime(timeStamp, performance.now())));
  }

  function noteOn(pitch, velocity, timeStamp) {
    wake();
    pianoRef.current?.noteOn(pitch, velocity);
    recordEvent((current, time) => takeNoteOn(current, pitch, velocity, time), timeStamp);
    setHeld((current) => withPitch(current, pitch, true));
  }

  function noteOff(pitch, timeStamp) {
    pianoRef.current?.noteOff(pitch);
    recordEvent((current, time) => takeNoteOff(current, pitch, time), timeStamp);
    setHeld((current) => withPitch(current, pitch, false));
  }

  function pedalChange(down, timeStamp) {
    pianoRef.current?.setPedal(down);
    recordEvent((current, time) => takePedal(current, down, time), timeStamp);
    setPedal(down);
  }

  function handleMidi(message, { timeStamp } = {}) {
    if (message.kind === 'noteOn') noteOn(message.note, message.velocity, timeStamp);
    if (message.kind === 'noteOff') noteOff(message.note, timeStamp);
    if (isSustainMessage(message)) pedalChange(pedalIsDown(message.value), timeStamp);
  }

  async function record({ bpm, beatsPerBar, countInBars, clickOn }) {
    if (!transportRef.current) return;
    await wake();
    const context = contextRef.current;
    const started = startTake({ bpm, beatsPerBar, countInBars, startTime: context.currentTime + startLeadSeconds });
    recordingRef.current = started;
    setNothingRecorded(false);
    clockRef.current = { beatZero: started.beatZero, beatSeconds: beatSeconds(bpm), beatsPerBar };
    transportRef.current.start({ beatZero: started.beatZero, beatSeconds: beatSeconds(bpm), fromBeat: -started.countInBeats, endBeat: Infinity, click: { countInBeats: started.countInBeats, beatsPerBar, clickOn } });
    setMode('recording');
  }

  function stop() {
    transportRef.current?.stop();
    if (recordingRef.current) {
      const finished = finishTake(recordingRef.current, heardTime(contextRef.current, performance.now()));
      recordingRef.current = null;
      setTake(finished.notes.length > 0 ? finished : null);
      setNothingRecorded(finished.notes.length === 0);
    }
    setMode('idle');
  }

  async function play(playable, clickOn) {
    if (!transportRef.current || !playable) return;
    await wake();
    const context = contextRef.current;
    const beatZero = context.currentTime + startLeadSeconds;
    clockRef.current = { beatZero, beatSeconds: beatSeconds(playable.bpm), beatsPerBar: playable.beatsPerBar };
    transportRef.current.start({
      beatZero,
      beatSeconds: beatSeconds(playable.bpm),
      fromBeat: 0,
      endBeat: playable.barCount * playable.beatsPerBar,
      click: { countInBeats: 0, beatsPerBar: playable.beatsPerBar, clickOn },
      take: playable,
      onEnd: () => setMode('idle')
    });
    setMode('playing');
  }

  return { held, pedal, sound, mode, position, take, setTake, nothingRecorded, noteOn, noteOff, handleMidi, record, stop, play };
}
