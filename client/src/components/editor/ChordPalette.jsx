import { diatonicChords, paletteExtras } from '../../engine/chordPalette.js';
import { Toggle } from '../ui/Toggle.jsx';

function ChordButton({ chord, extra, onPick }) {
  return (
    <button
      type="button"
      className="pill pill-small pill-secondary font-chord"
      style={{ fontSize: '1.15rem', minWidth: '3.5rem', color: extra ? 'var(--color-muted)' : undefined }}
      onClick={(event) => onPick(chord, event.shiftKey)}
    >
      {chord}
    </button>
  );
}

export function ChordPalette({ meta, selectedChord, addToBar, onAddToBarChange, onPick }) {
  const diatonic = diatonicChords(meta.keyRoot, meta.keyMode);
  const extras = paletteExtras(meta.keyRoot, meta.keyMode, selectedChord);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-muted">Chords in {meta.keyRoot} {meta.keyMode}. Tap to fill this bar and move on, or to change the selected chord. Shift-tap adds to the bar.</p>
      <div className="flex flex-wrap gap-2">
        {diatonic.map((chord) => <ChordButton key={chord} chord={chord} onPick={onPick} />)}
        {extras.map((chord) => <ChordButton key={chord} chord={chord} extra onPick={onPick} />)}
      </div>
      <Toggle label="Add to this bar (stay on this bar)" checked={addToBar} onChange={onAddToBarChange} />
    </div>
  );
}
