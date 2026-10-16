import { useState } from 'react';
import { useMidiInput } from '../../hooks/useMidiInput.js';
import { useRecordMode } from '../../hooks/useRecordMode.js';
import { MidiDevicePanel } from './MidiDevicePanel.jsx';
import { PianoKeyboard } from './PianoKeyboard.jsx';
import { noteName } from '../../midi/midiMessages.js';

function soundText(sound) {
  if (sound.state === 'unsupported') return 'This browser cannot play sound.';
  if (sound.state === 'failed') return 'Piano sound could not load, so a simple tone plays instead. Recording still works.';
  if (sound.state === 'loading') return `Loading piano ${sound.loaded} of ${sound.total || '…'}. You can play now.`;
  return sound.failed > 0 ? `Piano ready (${sound.failed} notes use a simple tone).` : 'Piano ready.';
}

export function RecordPanel({ onClose }) {
  const record = useRecordMode();
  const midi = useMidiInput(record.handleMidi);
  const [firstPitch, setFirstPitch] = useState(60);
  const heldNames = [...record.held].sort((first, second) => first - second).map(noteName);

  return (
    <section aria-label="Record" className="flex flex-col gap-4 rounded-[4px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-accent text-xl font-extrabold">Record</h2>
        <button type="button" className="pill pill-small" onClick={onClose}>Close</button>
      </div>
      <MidiDevicePanel midi={midi} />
      <p role="status" className="text-label text-muted">{soundText(record.sound)}{record.pedal ? ' · Pedal down' : ''}</p>
      <p aria-live="polite" className="tabular min-h-6 text-muted">{heldNames.length > 0 ? heldNames.join(' ') : 'Play a note'}</p>
      <PianoKeyboard firstPitch={firstPitch} onFirstPitchChange={setFirstPitch} held={record.held} onNoteOn={record.noteOn} onNoteOff={record.noteOff} />
      <p className="text-label text-muted">Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0.</p>
    </section>
  );
}
