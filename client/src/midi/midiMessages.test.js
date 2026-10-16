import { describe, it, expect } from 'vitest';
import { isSustainMessage, noteName, parseMidiMessage, pedalIsDown, pitchClass } from './midiMessages.js';

describe('parseMidiMessage', () => {
  it('reads note on with channel and velocity', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ kind: 'noteOn', channel: 1, note: 60, velocity: 100 });
    expect(parseMidiMessage([0x93, 64, 1])).toEqual({ kind: 'noteOn', channel: 4, note: 64, velocity: 1 });
  });

  it('treats note on with velocity 0 as note off', () => {
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({ kind: 'noteOff', channel: 1, note: 60, velocity: 0 });
    expect(parseMidiMessage([0x80, 60, 64]).kind).toBe('noteOff');
  });

  it('reads control change and program change', () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toEqual({ kind: 'control', channel: 1, controller: 64, value: 127 });
    expect(parseMidiMessage([0xc2, 5])).toEqual({ kind: 'program', channel: 3, program: 5 });
  });

  it('ignores clock and other messages', () => {
    expect(parseMidiMessage([0xf8]).kind).toBe('other');
    expect(parseMidiMessage([]).kind).toBe('other');
  });

  it('spots the sustain pedal', () => {
    expect(isSustainMessage(parseMidiMessage([0xb0, 64, 127]))).toBe(true);
    expect(isSustainMessage(parseMidiMessage([0xb0, 1, 127]))).toBe(false);
    expect(pedalIsDown(127)).toBe(true);
    expect(pedalIsDown(63)).toBe(false);
  });
});

describe('note names', () => {
  it('names middle C as C4', () => {
    expect(noteName(60)).toBe('C4');
    expect(noteName(69)).toBe('A4');
    expect(noteName(21)).toBe('A0');
    expect(pitchClass(61)).toBe(1);
  });
});
