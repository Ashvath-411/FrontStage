import { useState } from 'react';
import { appendChord, chordsFromWeighted, maxChordsPerBar, moveChordAt, removeChordAt, replaceChordAt, setWeightAt, weightedChords } from '../../engine/barChords.js';

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" className="pill pill-small pill-secondary px-0" style={{ width: 48 }} aria-label={label} disabled={disabled} onClick={onClick}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

function ChordNameField({ label, initial, onCommit }) {
  const [draft, setDraft] = useState(initial);
  function update(value) {
    setDraft(value);
    if (value.trim()) onCommit(value.trim());
  }
  return (
    <label className="flex w-28 flex-col gap-1">
      <span className="text-label text-muted">{label}</span>
      <input className="field" value={draft} placeholder="Am" autoCapitalize="none" spellCheck={false} onChange={(event) => update(event.target.value)} />
    </label>
  );
}

function NewChordField({ entries, change }) {
  const [draft, setDraft] = useState('');
  function add(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    change(appendChord(entries, draft.trim()), 'new');
    setDraft('');
  }
  return (
    <form onSubmit={add} className="flex flex-wrap items-end gap-2">
      <label className="flex w-28 flex-col gap-1">
        <span className="text-label text-muted">New chord</span>
        <input className="field" value={draft} placeholder="Am" autoCapitalize="none" spellCheck={false} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button type="submit" className="pill pill-small pill-secondary" disabled={!draft.trim()}>Add</button>
      <span className="text-label text-muted">or tap a chord below.</span>
    </form>
  );
}

function SelectedChipTools({ entries, chipIdx, change }) {
  const entry = entries[chipIdx];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <ChordNameField key={chipIdx} label="Chord" initial={entry.chord ?? ''} onCommit={(chord) => change(replaceChordAt(entries, chipIdx, chord), chipIdx)} />
      <div className="flex items-center gap-1" role="group" aria-label="Length">
        <IconButton label="Shorter" disabled={entry.weight <= 1} onClick={() => change(setWeightAt(entries, chipIdx, entry.weight - 1), chipIdx)}>−</IconButton>
        <span className="tabular min-w-16 text-center text-label">length {entry.weight}</span>
        <IconButton label="Longer" disabled={entry.weight >= 4} onClick={() => change(setWeightAt(entries, chipIdx, entry.weight + 1), chipIdx)}>+</IconButton>
      </div>
      <IconButton label="Move chord left" disabled={chipIdx === 0} onClick={() => change(moveChordAt(entries, chipIdx, -1), chipIdx - 1)}>←</IconButton>
      <IconButton label="Move chord right" disabled={chipIdx === entries.length - 1} onClick={() => change(moveChordAt(entries, chipIdx, 1), chipIdx + 1)}>→</IconButton>
      <IconButton label="Remove chord" onClick={() => change(removeChordAt(entries, chipIdx), null)}>✕</IconButton>
    </div>
  );
}

export function BarChordChips({ bar, beatsPerBar, chipIdx, onSelectChip, onChangeChords }) {
  const entries = weightedChords(bar.chords, beatsPerBar);
  const selected = Number.isInteger(chipIdx) && chipIdx < entries.length ? chipIdx : null;

  function change(nextEntries, nextChipIdx) {
    onChangeChords(chordsFromWeighted(nextEntries, beatsPerBar));
    onSelectChip(nextChipIdx);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chords in this bar">
        {entries.map((entry, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={selected === index}
            className={`pill pill-small font-chord ${selected === index ? 'pill-selected' : 'pill-secondary'}`}
            style={{ fontSize: '1.15rem', minWidth: '3.5rem' }}
            onClick={() => onSelectChip(selected === index ? null : index)}
          >
            {entry.chord ?? (entries.length === 1 ? 'Empty' : 'hold')}
            {entry.weight > 1 && <span className="text-label font-body text-muted">×{entry.weight}</span>}
          </button>
        ))}
        <button type="button" aria-pressed={chipIdx === 'new'} className={`pill pill-small ${chipIdx === 'new' ? 'pill-selected' : 'pill-secondary'}`} aria-label="Add a chord to this bar" disabled={bar.chords.length >= maxChordsPerBar} onClick={() => onSelectChip(chipIdx === 'new' ? null : 'new')}>+</button>
      </div>
      {selected !== null && <SelectedChipTools entries={entries} chipIdx={selected} change={change} />}
      {chipIdx === 'new' && <NewChordField entries={entries} change={change} />}
      {selected === null && chipIdx !== 'new' && <p className="text-label text-muted">Tap a chord to change, lengthen, move or remove it. + adds one.</p>}
    </div>
  );
}
