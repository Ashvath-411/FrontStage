import { LabeledField } from '../ui/LabeledField.jsx';
import { instruments } from '../../musicOptions.js';

export function InstrumentSelect({ label, value, joinedInstrument, onChange }) {
  return (
    <LabeledField label={label}>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">My instrument{joinedInstrument ? ` (${joinedInstrument})` : ''}</option>
        <option value="all">Every instrument</option>
        {instruments.map((instrument) => <option key={instrument} value={instrument}>{instrument}</option>)}
      </select>
    </LabeledField>
  );
}
