import { useEffect, useRef, useState } from 'react';

export function UserMenu({ name, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    const closeOnOutside = (event) => !menuRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutside);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutside);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button type="button" className="text-label inline-flex min-h-12 cursor-pointer items-center gap-1 text-muted hover:text-text" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {name || 'Account'} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-44 rounded-[4px] border border-line bg-surface p-1">
          <button type="button" role="menuitem" className="flex min-h-12 w-full cursor-pointer items-center px-3 text-left hover:text-cyan" onClick={onSignOut}>Log out</button>
        </div>
      )}
    </div>
  );
}
