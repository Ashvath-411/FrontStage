import { describe, it, expect, vi } from 'vitest';
import { createTransport, noteEventsBetween } from './transport.js';
import { createTestAudioContext } from './testAudioContext.js';

const take = {
  notes: [{ pitch: 60, velocity: 90, start: 0, end: 1 }, { pitch: 64, velocity: 80, start: 1, end: 2 }],
  pedal: [{ beat: 1, down: true }]
};

describe('noteEventsBetween', () => {
  it('lists note on, note off and pedal events inside a window, offs first', () => {
    expect(noteEventsBetween(take, 0, 1)).toEqual([{ beat: 0, kind: 'on', pitch: 60, velocity: 90 }]);
    expect(noteEventsBetween(take, 1, 1.5).map((event) => event.kind)).toEqual(['off', 'pedal', 'on']);
    expect(noteEventsBetween(take, 2, 3)).toEqual([{ beat: 2, kind: 'off', pitch: 64 }]);
  });
});

describe('createTransport', () => {
  it('schedules count-in clicks and take notes on the audio clock, then ends', () => {
    vi.useFakeTimers();
    const context = createTestAudioContext();
    const calls = [];
    const piano = {
      noteOn: (pitch, velocity, when) => calls.push(['on', pitch, when]),
      noteOff: (pitch, when) => calls.push(['off', pitch, when]),
      setPedal: (down, when) => calls.push(['pedal', down, when]),
      allNotesOff: () => calls.push(['allOff'])
    };
    const transport = createTransport(context, piano);
    const onEnd = vi.fn();
    transport.start({ beatZero: 1, beatSeconds: 0.5, fromBeat: -2, endBeat: 2, click: { countInBeats: 2, beatsPerBar: 4, clickOn: false }, take, onEnd });
    for (let step = 0; step < 100; step += 1) {
      context.currentTime += 0.025;
      vi.advanceTimersByTime(25);
    }
    const clicks = context.started.filter((source) => source.kind === 'oscillator');
    expect(clicks.map((click) => click.startedAt)).toEqual([0, 0.5]);
    expect(calls.filter((call) => call[0] === 'on')).toEqual([['on', 60, 1], ['on', 64, 1.5]]);
    expect(calls).toContainEqual(['pedal', true, 1.5]);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(calls.at(-1)).toEqual(['allOff']);
    vi.useRealTimers();
  });
});
