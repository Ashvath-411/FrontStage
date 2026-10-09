export function AnnotationLayer({ annotations, barIdx }) {
  if (annotations.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      {annotations.map((annotation, index) => {
        const barsAway = annotation.barIdx - barIdx;
        return (
          <p key={`${annotation.barIdx}-${index}`} className="flex flex-wrap items-baseline gap-x-3 rounded-[4px] border-l-4 border-cyan bg-surface px-4 py-2 text-lg">
            <span className="text-label font-semibold text-purple-text uppercase">{annotation.kind}</span>
            <span className="font-semibold">{annotation.text}</span>
            <span className="tabular text-label text-muted">{barsAway > 0 ? `in ${barsAway} bar${barsAway > 1 ? 's' : ''}` : 'now'}</span>
          </p>
        );
      })}
    </div>
  );
}
