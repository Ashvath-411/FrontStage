import { describe, it, expect } from 'vitest';
import { beatAtTime, clickBeats, eventContextTime, finishTake, positionLabel, startTake, takeNoteOff, takeNoteOn, takePedal, trustedEventTime } from './recorder.js';

const settings = { bpm: 120, beatsPerBar: 4, countInBars: 1, startTime: 10 };

describe('recorder timing', () => {
  it('puts beat 0 after the count-in on the audio clock', () => {
    const take = startTake(settings);
    expect(take.countInBeats).toBe(4);
    expect(take.beatZero).toBe(12);
    expect(beatAtTime(take, 12.25)).toBe(0.5);
    expect(beatAtTime(take, 11)).toBe(-2);
  });

  it('maps a MIDI event time to the audio time the player heard', () => {
    expect(eventContextTime(1000, { contextTime: 5, performanceTime: 900 }, null)).toBeCloseTo(5.1, 6);
    expect(eventContextTime(1000, { contextTime: 0, performanceTime: 0 }, { currentTime: 5, latencySeconds: 0.02, nowPerfMs: 1100 })).toBeCloseTo(4.88, 6);
  });
});

describe('time origin against the audible click', () => {
  const take = startTake(settings);
  const outputLatency = 0.2;
  const clickHeardAtPerfMs = 5000 + (take.beatZero - 10) * 1000 + outputLatency * 1000;

  it('a press exactly when the click is heard is beat 0, using the output timestamp', () => {
    const stamp = { contextTime: 10, performanceTime: 5000 + outputLatency * 1000 };
    expect(beatAtTime(take, eventContextTime(clickHeardAtPerfMs, stamp, null))).toBeCloseTo(0, 9);
  });

  it('the fallback subtracts the output latency, never adds it', () => {
    const fallback = { currentTime: take.beatZero + outputLatency, latencySeconds: outputLatency, nowPerfMs: clickHeardAtPerfMs };
    expect(beatAtTime(take, eventContextTime(clickHeardAtPerfMs, null, fallback))).toBeCloseTo(0, 9);
    expect(beatAtTime(take, fallback.currentTime)).toBeCloseTo(0.4, 9);
  });

  it('ignores a missing, zero, stale or future event time stamp', () => {
    expect(trustedEventTime(4990, 5000)).toBe(4990);
    expect(trustedEventTime(undefined, 5000)).toBe(5000);
    expect(trustedEventTime(0, 5000)).toBe(5000);
    expect(trustedEventTime(3000, 5000)).toBe(5000);
    expect(trustedEventTime(5100, 5000)).toBe(5000);
  });
});

describe('recording notes', () => {
  it('records note start and end in beats', () => {
    let take = startTake(settings);
    take = takeNoteOn(take, 60, 100, 12);
    take = takeNoteOff(take, 60, 12.5);
    const done = finishTake(take, 13.9);
    expect(done.notes).toEqual([{ pitch: 60, velocity: 100, start: 0, end: 1 }]);
    expect(done.barCount).toBe(1);
  });

  it('closes held notes at Stop', () => {
    let take = startTake(settings);
    take = takeNoteOn(take, 60, 90, 12);
    take = takeNoteOn(take, 64, 90, 13);
    take = takeNoteOff(take, 60, 13.5);
    const done = finishTake(take, 14);
    expect(done.notes.find((note) => note.pitch === 64)).toMatchObject({ start: 2, end: 4 });
  });

  it('keeps pickups in the last beat of the count-in and drops earlier notes', () => {
    let take = startTake(settings);
    take = takeNoteOn(take, 50, 80, 10.5);
    take = takeNoteOff(take, 50, 10.6);
    take = takeNoteOn(take, 55, 80, 11.8);
    take = takeNoteOff(take, 55, 12.4);
    const done = finishTake(take, 12.6);
    expect(done.notes.map((note) => note.pitch)).toEqual([55]);
    expect(done.notes[0].start).toBeCloseTo(-0.4, 6);
  });

  it('re-pressing a held note closes the first one', () => {
    let take = startTake(settings);
    take = takeNoteOn(take, 60, 90, 12);
    take = takeNoteOn(take, 60, 100, 12.5);
    const done = finishTake(take, 13);
    expect(done.notes.map((note) => [note.start, note.end])).toEqual([[0, 1], [1, 2]]);
  });

  it('ignores a late Stop just after a bar line', () => {
    let take = startTake(settings);
    take = takeNoteOn(take, 60, 90, 12);
    take = takeNoteOff(take, 60, 15);
    const lateStop = finishTake(take, 16.2);
    expect(lateStop.barCount).toBe(2);
    expect(lateStop.notes[0].end).toBe(6);
    expect(finishTake(take, 16.5).barCount).toBe(3);
  });

  it('records the sustain pedal and handles Stop during the count-in', () => {
    let take = startTake(settings);
    take = takePedal(take, true, 12.5);
    expect(take.pedal).toEqual([{ beat: 1, down: true }]);
    expect(finishTake(startTake(settings), 11)).toMatchObject({ barCount: 1, notes: [] });
  });
});

describe('click and position', () => {
  it('always clicks the count-in and clicks the song only when the click is on', () => {
    const options = { countInBeats: 4, beatsPerBar: 4, clickOn: false };
    expect(clickBeats(-10, 2, options).map((entry) => entry.beat)).toEqual([-4, -3, -2, -1]);
    expect(clickBeats(-0.5, 5, { ...options, clickOn: true })).toEqual([0, 1, 2, 3, 4].map((beat) => ({ beat, accent: beat % 4 === 0 })));
    expect(clickBeats(-4, -3, options)[0].accent).toBe(true);
  });

  it('labels count-in and bar position', () => {
    expect(positionLabel(-3.2, 4)).toEqual({ countIn: 4, bar: null, beat: null });
    expect(positionLabel(-0.1, 4).countIn).toBe(1);
    expect(positionLabel(5.5, 4)).toEqual({ countIn: null, bar: 2, beat: 2 });
  });
});
