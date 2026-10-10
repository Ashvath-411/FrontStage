export function SaveBar({ dirty, savedAt, busy, onSave }) {
  const status = dirty ? 'Unsaved changes. A draft is kept on this device.' : savedAt ? `Saved at ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No unsaved changes';
  return (
    <div className="sticky bottom-0 z-20 -mx-[var(--page-padding)] mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg/95 px-[var(--page-padding)] py-3">
      <p role="status" className={dirty ? 'text-text' : 'text-muted'}>{status}</p>
      <button type="button" className="pill pill-primary" disabled={busy} onClick={onSave}>Save song</button>
    </div>
  );
}
