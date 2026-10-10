export function AnnotationList({ annotations, onRemove }) {
  if (annotations.length === 0) {
    return <p className="text-muted">Stage notes will be listed here. Select a bar in the chart and tap "Add stage note".</p>;
  }
  return (
    <ul className="flex flex-col">
      {annotations.map((annotation, index) => (
        <li key={`${annotation.barIdx}-${index}`} className="flex items-center justify-between gap-4 border-b border-line py-2">
          <span>
            <span className="tabular text-label mr-3 text-muted">Bar {annotation.barIdx + 1}</span>
            <span className="text-label mr-2 text-purple-text uppercase">{annotation.kind}</span>
            {annotation.text}
            <span className="text-label ml-2 text-muted">({annotation.audience.join(', ')})</span>
          </span>
          <button type="button" className="pill pill-small pill-danger" onClick={() => onRemove(index)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
