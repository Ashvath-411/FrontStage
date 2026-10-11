import { useEffect, useRef } from 'react';

export function Panel({ title, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    panelRef.current?.focus();
    const closeOnEscape = (event) => event.key === 'Escape' && !document.querySelector('dialog[open]') && closeRef.current();
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-label={title}
      className="relative z-30 flex max-h-[60dvh] min-h-0 shrink flex-col overflow-hidden rounded-t-[12px] border border-b-0 border-line bg-surface outline-none min-[900px]:max-h-none min-[900px]:w-[360px] min-[900px]:shrink-0 min-[900px]:rounded-none min-[900px]:border-y-0 min-[900px]:border-r-0"
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted/50 min-[900px]:hidden" />
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-2 pb-1">
        <h2 className="font-accent text-xl font-extrabold">{title}</h2>
        <button type="button" className="pill pill-small" onClick={onClose}>Close</button>
      </div>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-5">{children}</div>
    </aside>
  );
}

export function PanelBackdrop({ onClose }) {
  return <button type="button" tabIndex={-1} aria-label="Close panel" className="absolute inset-0 z-20 cursor-default bg-black/35 min-[900px]:hidden" onClick={onClose} />;
}
