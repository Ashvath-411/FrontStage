import { describe, it, expect } from 'vitest';
import { isBlackKey, keyboardKeys, shiftOctave, typedPitch, velocityFromTouch } from './keyboardLayout.js';

describe('keyboard layout', () => {
  it('lays out one octave as 7 white and 5 black keys', () => {
    const keys = keyboardKeys(60, 1);
    expect(keys).toHaveLength(12);
    expect(keys.filter((key) => !key.black).map((key) => key.whiteIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(keys.find((key) => key.pitch === 61)).toEqual({ pitch: 61, black: true, whiteIndex: 0 });
    expect(keys.find((key) => key.pitch === 70)).toEqual({ pitch: 70, black: true, whiteIndex: 5 });
    expect(isBlackKey(66)).toBe(true);
  });

  it('maps letter keys like a piano row', () => {
    expect(typedPitch('a', 60)).toBe(60);
    expect(typedPitch('W', 60)).toBe(61);
    expect(typedPitch('k', 60)).toBe(72);
    expect(typedPitch('q', 60)).toBe(null);
  });

  it('turns touch depth into velocity and keeps octaves in range', () => {
    expect(velocityFromTouch(0)).toBe(30);
    expect(velocityFromTouch(1)).toBe(127);
    expect(velocityFromTouch(2)).toBe(127);
    expect(shiftOctave(60, 1)).toBe(72);
    expect(shiftOctave(96, 1)).toBe(96);
    expect(shiftOctave(24, -1)).toBe(24);
  });
});
