import { LabeledField } from './LabeledField.jsx';

export function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <LabeledField label={`${label}: ${format(value)}`}>
      <input type="range" className="h-12 w-full" style={{ accentColor: 'var(--color-cyan)' }} min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </LabeledField>
  );
}
