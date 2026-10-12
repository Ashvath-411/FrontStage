import { describe, expect, it } from 'vitest';
import { pageTitleText } from './usePageTitle.js';

describe('page titles', () => {
  it('names the page before the app', () => {
    expect(pageTitleText('Library')).toBe('Library · FrontStage');
    expect(pageTitleText('')).toBe('FrontStage');
  });
});
