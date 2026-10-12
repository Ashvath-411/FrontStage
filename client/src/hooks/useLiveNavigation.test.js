import { describe, expect, it } from 'vitest';
import { hasAppHistory } from './useLiveNavigation.js';

describe('back from the live view', () => {
  it('goes back only when the app itself has an earlier page', () => {
    expect(hasAppHistory({ idx: 2 })).toBe(true);
    expect(hasAppHistory({ idx: 0 })).toBe(false);
    expect(hasAppHistory(null)).toBe(false);
  });
});
