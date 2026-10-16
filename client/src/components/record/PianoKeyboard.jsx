import { useEffect, useRef } from 'react';
import { keyboardKeys, shiftOctave, typedPitch, typingVelocity, velocityFromTouch } from '../../midi/keyboardLayout.js';
import { noteName } from '../../midi/midiMessages.js';

const blackKeyWidth = 'max(48px, 9%)';

function isTypingInField(target) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

function keyUnderPointer(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const pitch = element?.closest('[data-pitch]')?.dataset.pitch;
  if (pitch === undefined) return null;
  const box = element.closest('[data-pitch]').getBoundingClientRect();
  return { pitch: Number(pitch), velocity: velocityFromTouch((event.clientY - box.top) / box.height) };
}

function OctaveBlock({ firstPitch, held, className }) {
  const keys = keyboardKeys(firstPitch, 1);
  return (
    <div className={`relative h-44 min-w-0 flex-1 ${className}`}>
      <div className="flex h-full">
        {keys.filter((key) => !key.black).map((key) => (
          <div key={key.pitch} data-pitch={key.pitch} aria-hidden="true" className={`flex flex-1 items-end justify-center rounded-b-[6px] border border-black/60 pb-2 text-label ${held.has(key.pitch) ? 'bg-cyan text-black' : 'bg-text text-black/50'}`}>
            {key.pitch % 12 === 0 ? noteName(key.pitch) : ''}
          </div>
        ))}
      </div>
      {keys.filter((key) => key.black).map((key) => (
        <div
          key={key.pitch}
          data-pitch={key.pitch}
          aria-hidden="true"
          className={`absolute top-0 h-[60%] rounded-b-[6px] border border-black ${held.has(key.pitch) ? 'bg-cyan' : 'bg-surface-2'}`}
          style={{ left: `calc(${((key.whiteIndex + 1) * 100) / 7}% - ${blackKeyWidth} / 2)`, width: blackKeyWidth }}
        />
      ))}
    </div>
  );
}

export function PianoKeyboard({ firstPitch, onFirstPitchChange, held, onNoteOn, onNoteOff }) {
  const pointers = useRef(new Map());
  const typed = useRef(new Map());
  const handlers = useRef({ onNoteOn, onNoteOff, firstPitch, onFirstPitchChange });
  handlers.current = { onNoteOn, onNoteOff, firstPitch, onFirstPitchChange };

  useEffect(() => {
    function down(event) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || isTypingInField(event.target)) return;
      const { firstPitch: base, onFirstPitchChange: changeBase } = handlers.current;
      if (event.key === 'z' || event.key === 'x') return changeBase(shiftOctave(base, event.key === 'z' ? -1 : 1));
      const pitch = typedPitch(event.key, base);
      if (pitch === null || typed.current.has(event.key)) return;
      typed.current.set(event.key, pitch);
      handlers.current.onNoteOn(pitch, typingVelocity, event.timeStamp);
    }
    function up(event) {
      const pitch = typed.current.get(event.key);
      if (pitch === undefined) return;
      typed.current.delete(event.key);
      handlers.current.onNoteOff(pitch, event.timeStamp);
    }
    function releaseAll() {
      typed.current.forEach((pitch) => handlers.current.onNoteOff(pitch, performance.now()));
      typed.current.clear();
      pointers.current.forEach((pitch) => pitch !== null && handlers.current.onNoteOff(pitch, performance.now()));
      pointers.current.clear();
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
      releaseAll();
    };
  }, []);

  function press(event) {
    const key = keyUnderPointer(event);
    const current = pointers.current.get(event.pointerId);
    if (current === (key?.pitch ?? null)) return;
    if (current !== undefined && current !== null) onNoteOff(current, event.timeStamp);
    pointers.current.set(event.pointerId, key?.pitch ?? null);
    if (key) onNoteOn(key.pitch, key.velocity, event.timeStamp);
  }

  function release(event) {
    const current = pointers.current.get(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (current !== undefined && current !== null) onNoteOff(current, event.timeStamp);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="pill pill-small pill-secondary" aria-label="Octave down" onClick={() => onFirstPitchChange(shiftOctave(firstPitch, -1))}>Octave −</button>
        <span className="tabular text-label text-muted">{noteName(firstPitch)} and up · keys A to K, Z and X change octave</span>
        <button type="button" className="pill pill-small pill-secondary" aria-label="Octave up" onClick={() => onFirstPitchChange(shiftOctave(firstPitch, 1))}>Octave +</button>
      </div>
      <div
        role="group"
        aria-label="On-screen piano. Play with mouse or touch, or with the letter keys A to K."
        className="-mx-4 flex touch-none select-none overflow-hidden min-[900px]:mx-0 min-[900px]:rounded-[4px]"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          press(event);
        }}
        onPointerMove={(event) => pointers.current.has(event.pointerId) && press(event)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <OctaveBlock firstPitch={firstPitch} held={held} />
        <OctaveBlock firstPitch={firstPitch + 12} held={held} className="hidden min-[900px]:block" />
      </div>
    </div>
  );
}
