import { useEffect, useRef } from 'react';

function keepFocusInside(event) {
  if (event.key !== 'Tab') return;
  const focusable = [...event.currentTarget.querySelectorAll('button:not([disabled])')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function ConfirmDialog({ request, onAnswer }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!request || !dialog) return undefined;
    const opener = document.activeElement;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [request]);

  if (!request) return null;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      className="confirm-dialog m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[8px] border border-line bg-surface p-5 text-text"
      onKeyDown={keepFocusInside}
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
    >
      <h2 id="confirm-title" className="font-accent text-xl font-extrabold">{request.title}</h2>
      <p id="confirm-text" className="mt-2 text-muted">{request.text}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button ref={cancelRef} type="button" className="pill pill-secondary" onClick={() => onAnswer(false)}>{request.cancelLabel ?? 'Cancel'}</button>
        <button type="button" className="pill pill-alert" onClick={() => onAnswer(true)}>{request.confirmLabel}</button>
      </div>
    </dialog>
  );
}
