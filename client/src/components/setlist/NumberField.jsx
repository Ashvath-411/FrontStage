export function NumberField({ label, value, min, max, disabled, onChange }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label text-muted">{label}</span>
      <input
        className="field tabular"
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
