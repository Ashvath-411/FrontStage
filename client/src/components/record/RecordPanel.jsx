import { useMemo, useState } from 'react';
import { useMidiInput } from '../../hooks/useMidiInput.js';
import { useRecordMode } from '../../hooks/useRecordMode.js';
import { MidiDevicePanel } from './MidiDevicePanel.jsx';
import { TakeReview } from './TakeReview.jsx';
import { defaultQuantize, quantizeTake } from '../../midi/quantize.js';
import { chordsByBar, extractChords, writeTakeToChart } from '../../midi/chordExtraction.js';
import { PianoKeyboard } from './PianoKeyboard.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { noteName } from '../../midi/midiMessages.js';
import { keySpelling, nameNotes } from '../../midi/chordNaming.js';
import { resolveSections } from '../../engine/songTiming.js';
import { totalBarCount } from '../../engine/chartEdits.js';

function soundText(sound) {
  if (sound.state === 'unsupported') return 'This browser cannot play sound.';
  if (sound.state === 'failed') return 'Piano sound could not load, so a simple tone plays instead. Recording still works.';
  if (sound.state === 'loading') return `Loading piano ${sound.loaded} of ${sound.total || '…'}. You can play now.`;
  return sound.failed > 0 ? `Piano ready (${sound.failed} notes use a simple tone).` : 'Piano ready.';
}

function tempoAtBar(editor, barIdx) {
  const sections = resolveSections(editor.sections, editor.defaults);
  const section = sections.find((candidate) => barIdx >= candidate.firstBar && barIdx < candidate.firstBar + candidate.barCount);
  return { bpm: section?.bpm ?? editor.defaults.bpm, beatsPerBar: section?.beatsPerBar ?? editor.defaults.beatsPerBar };
}

function statusText(record) {
  if (record.mode === 'recording' && record.position?.countIn) return `Count-in ${record.position.countIn}`;
  if (record.mode === 'recording') return record.position ? `Recording · bar ${record.position.bar} beat ${record.position.beat}` : 'Recording';
  if (record.take) return `Take ready: ${record.take.barCount} bar${record.take.barCount === 1 ? '' : 's'}, ${record.take.notes.length} notes`;
  return 'Press Record. You hear a count-in, then play.';
}

function RecordSettings({ settings, onChange, barCount, tempo, disabled }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <LabeledField label="Write chords from bar">
        <select className="field tabular" disabled={disabled} value={settings.startBar} onChange={(event) => onChange({ ...settings, startBar: Number(event.target.value) })}>
          {Array.from({ length: barCount }, (_, barIdx) => <option key={barIdx} value={barIdx}>{barIdx + 1}</option>)}
        </select>
      </LabeledField>
      <LabeledField label="Count-in">
        <select className="field" disabled={disabled} value={settings.countInBars} onChange={(event) => onChange({ ...settings, countInBars: Number(event.target.value) })}>
          <option value={0}>None</option>
          <option value={1}>1 bar</option>
          <option value={2}>2 bars</option>
        </select>
      </LabeledField>
      <div className="flex flex-col justify-end">
        <Toggle label="Click while recording" checked={settings.clickOn} onChange={(clickOn) => onChange({ ...settings, clickOn })} />
      </div>
      <p className="tabular text-label text-muted sm:col-span-3">{tempo.bpm} BPM · {tempo.beatsPerBar} beats per bar. Change them in the song details.</p>
    </div>
  );
}

export function RecordPanel({ editor, startBar, onApply, onClose }) {
  const record = useRecordMode();
  const midi = useMidiInput(record.handleMidi);
  const [firstPitch, setFirstPitch] = useState(60);
  const barCount = Math.max(1, totalBarCount(editor.sections));
  const [settings, setSettings] = useState({ startBar: Math.min(startBar ?? 0, barCount - 1), countInBars: 1, clickOn: true });
  const [quantize, setQuantize] = useState(defaultQuantize);
  const quantized = useMemo(() => (record.take ? quantizeTake(record.take, quantize) : null), [record.take, quantize]);
  const spelling = keySpelling(editor.meta.keyRoot, editor.meta.keyMode);
  const preview = quantized && writeTakeToChart(editor.sections, settings.startBar, chordsByBar(extractChords(quantized.notes, spelling), quantized.barCount, quantized.beatsPerBar), editor.defaults.beatsPerBar);
  const tempo = tempoAtBar(editor, settings.startBar);
  const busy = record.mode !== 'idle';
  const heldPitches = [...record.held].sort((first, second) => first - second);
  const heldChord = nameNotes(heldPitches.map((pitch) => ({ pitch })), spelling);

  return (
    <section aria-label="Record" className="flex flex-col gap-4 rounded-[4px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-accent text-xl font-extrabold">Record</h2>
        <button type="button" className="pill pill-small" onClick={onClose}>Close</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="pill pill-primary" disabled={busy} onClick={() => record.record({ ...tempo, countInBars: settings.countInBars, clickOn: settings.clickOn })}>
          <span aria-hidden="true" className="h-3 w-3 rounded-full bg-alert" />Record
        </button>
        <button type="button" className="pill pill-secondary" disabled={!busy} onClick={record.stop}>Stop</button>
        <p role="status" className={`tabular font-semibold ${record.mode === 'recording' ? 'text-alert' : 'text-text'}`}>{statusText(record)}</p>
      </div>
      {quantized && !busy && (
        <TakeReview
          quantized={quantized}
          quantize={quantize}
          onQuantizeChange={setQuantize}
          preview={preview}
          onApply={() => {
            onApply(preview.sections, preview.changes);
            record.setTake(null);
          }}
          onCancel={() => record.setTake(null)}
        />
      )}
      <p className="text-label text-muted">{soundText(record.sound)}{record.pedal ? ' · Pedal down' : ''}</p>
      <div className="flex min-h-20 items-baseline gap-4">
        <p aria-live="polite" aria-label={heldChord ? `Chord ${heldChord}` : 'No chord'} className="font-chord text-5xl font-semibold text-cyan">{heldChord ?? '–'}</p>
        <p className="tabular text-muted">{heldPitches.length > 0 ? heldPitches.map(noteName).join(' ') : 'Play a chord to see its name'}</p>
      </div>
      <PianoKeyboard firstPitch={firstPitch} onFirstPitchChange={setFirstPitch} held={record.held} onNoteOn={record.noteOn} onNoteOff={record.noteOff} />
      <RecordSettings settings={settings} onChange={setSettings} barCount={barCount} tempo={tempo} disabled={busy} />
      <MidiDevicePanel midi={midi} />
      <p className="text-label text-muted">Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0.</p>
    </section>
  );
}
