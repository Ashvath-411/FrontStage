export function LabeledField({ label, hint, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-label text-muted">{label}</span>
      {children}
      {hint && <span className="text-label text-muted">{hint}</span>}
    </label>
  );
}
