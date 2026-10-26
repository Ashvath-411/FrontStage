import { describe, it, expect } from 'vitest';
import { bindingFromMessage, boundAction, describeBinding, isSustainMessage, noteName, parseMidiMessage, pedalIsDown, pitchClass, readBindings } from './midiMessages.js';

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

describe('MIDI learn', () => {
  const note = parseMidiMessage([0x90, 36, 100]);
  const button = parseMidiMessage([0xb1, 20, 127]);

  it('turns a key, button or program change into a binding', () => {
    expect(bindingFromMessage(note)).toEqual({ type: 'note', channel: 1, number: 36 });
    expect(bindingFromMessage(button)).toEqual({ type: 'control', channel: 2, number: 20 });
    expect(bindingFromMessage(parseMidiMessage([0xc0, 4]))).toEqual({ type: 'program', channel: 1, number: 4 });
  });

  it('does not learn button releases, the sustain pedal or note offs', () => {
    expect(bindingFromMessage(parseMidiMessage([0xb1, 20, 0]))).toBe(null);
    expect(bindingFromMessage(parseMidiMessage([0xb0, 64, 127]))).toBe(null);
    expect(bindingFromMessage(parseMidiMessage([0x80, 36, 0]))).toBe(null);
  });

  it('finds the bound action and fires only on press', () => {
    const bindings = { record: bindingFromMessage(note), stop: bindingFromMessage(button) };
    expect(boundAction(bindings, note)).toEqual({ action: 'record', pressed: true });
    expect(boundAction(bindings, parseMidiMessage([0x80, 36, 0]))).toEqual({ action: 'record', pressed: false });
    expect(boundAction(bindings, button)).toEqual({ action: 'stop', pressed: true });
    expect(boundAction(bindings, parseMidiMessage([0xb1, 20, 0]))).toEqual({ action: 'stop', pressed: false });
    expect(boundAction(bindings, parseMidiMessage([0xb0, 20, 127]))).toBe(null);
    expect(boundAction(bindings, parseMidiMessage([0x90, 37, 100]))).toBe(null);
  });

  it('describes bindings and survives broken saved data', () => {
    expect(describeBinding(bindingFromMessage(note))).toBe('Key C2 · channel 1');
    expect(describeBinding(bindingFromMessage(button))).toBe('Control 20 · channel 2');
    expect(describeBinding(undefined)).toBe('Not set');
    expect(readBindings('{"play":{"type":"note","channel":1,"number":40},"jump":{"type":"note"}}')).toEqual({ play: { type: 'note', channel: 1, number: 40 } });
    expect(readBindings('not json')).toEqual({});
    expect(readBindings(null)).toEqual({});
  });
});
