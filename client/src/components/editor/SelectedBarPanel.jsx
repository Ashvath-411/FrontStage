import { useEffect, useRef, useState } from 'react';
import { BarChordChips } from './BarChordChips.jsx';
import { LabeledField } from '../ui/LabeledField.jsx';
import { formatChordTokens, parseChordTokens } from '../../engine/parseChart.js';
import { tooManyChords } from '../../engine/chartEdits.js';
import { isReadableChord, unknownChords } from '../../engine/chordCheck.js';

function ChordWarning({ chords }) {
  const unknown = unknownChords(chords);
  if (unknown.length === 0) return null;
  const blocking = unknown.filter((chord) => !isReadableChord(chord));
  return (
    <p role="alert" className="text-label text-alert">
      Not a chord: {unknown.join(', ')}. Use a root from A to G, then for example m, 7, maj7, sus4 or /E.
      {blocking.length > 0 && ' The song cannot be saved until this is fixed.'}
    </p>
  );
}

function chordFieldText(bar, beatsPerBar) {
  return bar.chords.length === 0 ? '' : formatChordTokens(bar.chords, beatsPerBar);
}

export function SelectedBarPanel({ barIdx, bar, beatsPerBar, barCount, focusChord, chipIdx, onSelectChip, onChange, onSelect, onAddNote, children }) {
  const [chordText, setChordText] = useState(() => chordFieldText(bar, beatsPerBar));
  const chordFieldRef = useRef(null);
  const crowded = tooManyChords(chordText);
  const storedText = chordFieldText(bar, beatsPerBar);

  useEffect(() => {
    if (document.activeElement !== chordFieldRef.current) setChordText(storedText);
  }, [storedText]);

  function changeChords(text) {
    setChordText(text);
    if (!tooManyChords(text)) onChange({ chords: parseChordTokens(text, beatsPerBar) });
  }

  function moveOnTab(event, step) {
    const target = barIdx + step;
    if (event.key !== 'Tab' || event.shiftKey !== (step < 0) || target < 0 || target >= barCount) return;
    event.preventDefault();
    onSelect(target, true);
  }

  return (
    <section aria-label={`Bar ${barIdx + 1}`} className="flex flex-col gap-3 rounded-[4px] border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-pretitle font-extrabold">Bar {barIdx + 1}</h3>
        <div className="flex gap-2">
          <button type="button" className="pill pill-small pill-secondary" disabled={barIdx === 0} onClick={() => onSelect(barIdx - 1, false)}>Previous</button>
          <button type="button" className="pill pill-small pill-secondary" disabled={barIdx >= barCount - 1} onClick={() => onSelect(barIdx + 1, false)}>Next</button>
        </div>
      </div>
      <BarChordChips bar={bar} beatsPerBar={beatsPerBar} chipIdx={chipIdx} onSelectChip={onSelectChip} onChangeChords={(chords) => onChange({ chords })} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <LabeledField label="Chords as text" hint={crowded ? 'A bar holds at most 16 chords.' : 'Space between chords. Am*2 lasts twice as long. A dot holds the last chord.'}>
          <input
            ref={chordFieldRef}
            className={`field text-lg ${crowded ? 'border-alert' : ''}`}
            value={chordText}
            autoFocus={focusChord}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => changeChords(event.target.value)}
            onKeyDown={(event) => moveOnTab(event, -1)}
            placeholder="C G"
          />
        </LabeledField>
        <LabeledField label="Words">
          <input className="field" value={bar.lyric ?? ''} maxLength={300} onChange={(event) => onChange({ lyric: event.target.value })} onKeyDown={(event) => moveOnTab(event, 1)} />
        </LabeledField>
      </div>
      <ChordWarning chords={bar.chords} />
      {children}
      <div><button type="button" className="pill pill-small pill-secondary" onClick={onAddNote}>Add stage note</button></div>
    </section>
  );
}
