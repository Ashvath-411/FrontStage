import { describe, expect, it } from 'vitest';
import { addToast, liveToasts, removeToast } from './toastQueue.js';

describe('toasts', () => {
  it('disappear after 4 seconds', () => {
    const toasts = addToast([], { text: 'Song saved' }, 1000);
    expect(liveToasts(toasts, 4999)).toHaveLength(1);
    expect(liveToasts(toasts, 5000)).toEqual([]);
  });

  it('keep at most three, newest last, and can be dismissed', () => {
    let toasts = [];
    for (const text of ['one', 'two', 'three', 'four']) toasts = addToast(toasts, { text }, 0);
    expect(toasts.map((toast) => toast.text)).toEqual(['two', 'three', 'four']);
    expect(removeToast(toasts, toasts[0].id).map((toast) => toast.text)).toEqual(['three', 'four']);
    expect(addToast([], { text: 'Save failed', tone: 'error' }, 0)[0].tone).toBe('error');
  });
});
