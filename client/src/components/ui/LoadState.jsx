export function LoadingRows({ label, rows = 3 }) {
  return (
    <div role="status" aria-live="polite" className="flex max-w-4xl flex-col gap-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} aria-hidden="true" className="skeleton h-12 rounded-[4px]" style={{ width: `${90 - index * 15}%` }} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex max-w-xl flex-col gap-3 rounded-[4px] border border-alert p-4">
      <p className="text-alert">{message || 'Something went wrong.'}</p>
      <p className="text-label text-muted">Check your connection, then try again.</p>
      {onRetry && <div><button type="button" className="pill pill-secondary" onClick={onRetry}>Retry</button></div>}
    </div>
  );
}
