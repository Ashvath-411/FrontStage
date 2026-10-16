import { LabeledField } from '../ui/LabeledField.jsx';
import { Slider } from '../ui/Slider.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { autoGridOrder } from '../../midi/quantize.js';

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

export function TakeReview({ quantized, quantize, onQuantizeChange, onDiscard, children }) {
  return (
    <section aria-label="Your take" className="flex flex-col gap-4 rounded-[4px] border border-cyan/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-pretitle font-extrabold">Your take</h3>
        <button type="button" className="pill pill-small pill-secondary" onClick={onDiscard}>Discard take</button>
      </div>
      <QuantizeControls quantize={quantize} onChange={onQuantizeChange} chosenGrid={quantized.grid} />
      <p className="text-label text-muted">Quantize always starts again from what you played, so you can change it as often as you like.</p>
      {children}
    </section>
  );
}
