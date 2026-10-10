export function DraftPrompt({ draft, onRestore, onDiscard }) {
  if (!draft) return null;
  const time = new Date(draft.savedAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <section aria-label="Unsaved draft" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-cyan bg-cyan/10 p-3">
      <p>There is an unsaved draft of this song from {time}.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pill pill-primary" onClick={onRestore}>Restore draft</button>
        <button type="button" className="pill pill-secondary" onClick={onDiscard}>Discard</button>
      </div>
    </section>
  );
}
