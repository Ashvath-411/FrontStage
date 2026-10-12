import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addToast, liveToasts, removeToast } from './toastQueue.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dockCount, setDockCount] = useState(0);

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const nextExpiry = Math.min(...toasts.map((toast) => toast.expiresAt));
    const timer = setTimeout(() => setToasts((current) => liveToasts(current, Date.now())), Math.max(0, nextExpiry - Date.now()));
    return () => clearTimeout(timer);
  }, [toasts]);

  const showToast = useCallback((text, tone) => setToasts((current) => addToast(current, { text, tone }, Date.now())), []);
  const dismiss = useCallback((id) => setToasts((current) => removeToast(current, id)), []);
  const value = useMemo(() => ({ toasts, showToast, dismiss, setDockCount }), [toasts, showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {dockCount === 0 && <ToastList toasts={toasts} dismiss={dismiss} floating />}
    </ToastContext.Provider>
  );
}

function ToastList({ toasts, dismiss, floating }) {
  const placement = floating ? 'pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4' : 'pointer-events-none relative z-40 py-1';
  return (
    <div role="status" aria-live="polite" className={`${placement} flex flex-col items-center gap-2`}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-[4px] border bg-surface py-1 pr-1 pl-4 ${toast.tone === 'error' ? 'border-alert text-alert' : 'border-cyan text-text'}`}>
          <span>{toast.text}</span>
          <button type="button" className="pill pill-small" aria-label="Dismiss message" onClick={() => dismiss(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

export function DockedToasts() {
  const { toasts, dismiss, setDockCount } = useContext(ToastContext);
  useEffect(() => {
    setDockCount((count) => count + 1);
    return () => setDockCount((count) => count - 1);
  }, [setDockCount]);
  return <ToastList toasts={toasts} dismiss={dismiss} />;
}

export function useToast() {
  return useContext(ToastContext).showToast;
}
