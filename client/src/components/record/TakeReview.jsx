import { LabeledField } from '../ui/LabeledField.jsx';
import { Slider } from '../ui/Slider.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { autoGridOrder } from '../../midi/quantize.js';
import { formatChordTokens } from '../../engine/parseChart.js';

const gridLabels = { '1/4': '1/4 note', '1/8': '1/8 note', '1/8T': '1/8 triplet', '1/16': '1/16 note', '1/16T': '1/16 triplet' };

function QuantizeControls({ quantize, onChange, chosenGrid }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <LabeledField label="Quantize grid">
        <select className="field" value={quantize.grid} onChange={(event) => onChange({ ...quantize, grid: event.target.value })}>
          <option value="auto">Auto{quantize.grid === 'auto' ? ` (${gridLabels[chosenGrid]})` : ''}</option>
          {autoGridOrder.map((grid) => <option key={grid} value={grid}>{gridLabels[grid]}</option>)}
        </select>
      </LabeledField>
      <Slider label="Strength" value={quantize.strength} min={0} max={100} step={5} format={(value) => `${value}%`} onChange={(strength) => onChange({ ...quantize, strength })} />
      <div className="flex flex-col justify-end">
        <Toggle label="Snap note lengths" checked={quantize.lengthSnap} onChange={(lengthSnap) => onChange({ ...quantize, lengthSnap })} />
      </div>
    </div>
  );
}

function chordText(chords, beatsPerBar) {
  if (chords === null) return 'new bar';
  return chords.length === 0 ? 'empty' : formatChordTokens(chords, beatsPerBar);
}

function ChordPreview({ changes }) {
  if (changes.length === 0) return <p role="status" className="text-alert">No chords found in this take. Hold at least two different notes together, then record again.</p>;
  return (
    <div className="max-h-72 overflow-y-auto rounded-[4px] border border-line">
      <table className="w-full text-left">
        <caption className="sr-only">Chord changes</caption>
        <thead className="text-label text-muted">
          <tr><th scope="col" className="p-2">Bar</th><th scope="col" className="p-2">Now</th><th scope="col" className="p-2">New</th></tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.barIdx} className="border-t border-line">
              <th scope="row" className="tabular p-2 font-normal text-muted">{change.barIdx + 1}</th>
              <td className="p-2 font-chord text-lg text-muted">{chordText(change.before, change.beatsPerBar)}</td>
              <td className="p-2 font-chord text-lg font-semibold text-cyan">{chordText(change.after, change.beatsPerBar)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TakeReview({ quantized, quantize, onQuantizeChange, preview, onApply, onCancel }) {
  return (
    <section aria-label="Your take" className="flex flex-col gap-4 rounded-[4px] border border-cyan/40 p-3">
      <h3 className="text-pretitle font-extrabold">Your take</h3>
      <QuantizeControls quantize={quantize} onChange={onQuantizeChange} chosenGrid={quantized.grid} />
      <p className="text-label text-muted">Quantize always starts again from what you played, so you can change it as often as you like.</p>
      <ChordPreview changes={preview.changes} />
      <div className="flex flex-wrap gap-3">
        <button type="button" className="pill pill-primary" disabled={preview.changes.length === 0} onClick={onApply}>Apply to chart</button>
        <button type="button" className="pill pill-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
