export function CountIn({ beat, beats }) {
  return (
    <div className="flex flex-col items-center gap-2" role="status" aria-live="assertive">
      <span className="text-label text-muted uppercase">Count-in</span>
      <span className="font-chord tabular leading-none font-bold text-alert" style={{ fontSize: 'clamp(8rem, 40vw, 22rem)' }}>{beat}</span>
      <span className="tabular text-muted">of {beats}</span>
    </div>
  );
}
