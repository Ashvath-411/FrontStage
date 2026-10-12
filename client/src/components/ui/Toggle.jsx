export function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-b border-line">
      <span>{label}</span>
      <input type="checkbox" className="h-5 w-5" style={{ accentColor: "var(--color-cyan)" }} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
