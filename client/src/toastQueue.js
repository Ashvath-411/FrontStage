export const toastLifetimeMs = 4000;
const maxToasts = 3;

export function addToast(toasts, { text, tone = 'info' }, now) {
  const toast = { id: `${now}-${toasts.length}-${text}`, text, tone, expiresAt: now + toastLifetimeMs };
  return [...toasts, toast].slice(-maxToasts);
}

export function liveToasts(toasts, now) {
  return toasts.filter((toast) => toast.expiresAt > now);
}

export function removeToast(toasts, id) {
  return toasts.filter((toast) => toast.id !== id);
}
