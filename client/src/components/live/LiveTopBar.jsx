export function LiveTopBar({ session, connected, onBack, onOpenPanel }) {
  return (
    <header className="flex items-center gap-2 border-b border-line py-1">
      <button type="button" className="pill pill-small shrink-0 px-0" style={{ width: 48 }} aria-label="Back" onClick={onBack}>
        <span aria-hidden="true">←</span>
      </button>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h1 className="font-accent truncate text-base font-extrabold">{session.name}</h1>
        <span className="font-chord text-lg tracking-widest text-muted">{session.code}</span>
      </div>
      {!connected && <span className="text-label shrink-0 rounded-full border border-alert px-2 py-1 text-alert" role="status">Reconnecting…</span>}
      {session.state.playState === 'paused' && <span className="text-label shrink-0 rounded-full border border-purple px-2 py-1 text-purple-text">Paused</span>}
      <button type="button" className="pill pill-small shrink-0" aria-haspopup="dialog" onClick={() => onOpenPanel('menu')}>
        <span aria-hidden="true">☰</span> Menu
      </button>
    </header>
  );
}
