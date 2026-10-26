import { describe, it, expect } from 'vitest';
import { buildTimeline, positionAt } from '../engine/timeline.js';
import { bindingFromMessage, boundAction, describeBinding, parseMidiMessage, readBindings } from './midiMessages.js';
import { acceptPress, emptyPressMemory, pressDebounceMs, pressIsDiscrete, sessionActionLabels, sessionActions, sessionCommand, sessionMidiAllowed, sessionMidiNotices, targetElapsedMs } from './sessionMidi.js';

const song = (extra = {}) => ({
  sections: [{ bpm: 120, beatsPerBar: 4, barCount: 2 }, { bpm: 120, beatsPerBar: 4, barCount: 2 }, { bpm: 120, beatsPerBar: 4, barCount: 1 }],
  bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
  countInBars: 1,
  gapMode: 'countdown',
  gapSeconds: 4,
  transpose: 0,
  ...extra
});
const timelines = [song(), song(), song()].map(buildTimeline);

function sessionAt(stateChanges = {}, extra = {}) {
  return {
    me: { isHost: true, pid: 'h' },
    participants: [],
    controllerPolicy: 'host',
    settings: { autoAdvance: true },
    state: { playState: 'playing', itemIdx: 0, anchorServerMs: 0, anchorOffsetMs: 0, version: 3, ...stateChanges },
    ...extra
  };
}

function commandAt(action, elapsedMs, stateChanges = {}) {
  const session = sessionAt(stateChanges);
  const position = positionAt(timelines, session.state.itemIdx, elapsedMs, true);
  return sessionCommand(action, { session, position, timelines, serverNow: elapsedMs - session.state.anchorOffsetMs + session.state.anchorServerMs });
}

describe('session MIDI actions', () => {
  it('lists the five session actions with labels', () => {
    expect(sessionActions).toEqual(['playPause', 'next', 'prev', 'nextSection', 'prevSection']);
    sessionActions.forEach((action) => expect(sessionActionLabels[action]).toBeTruthy());
  });

  it('can learn a sustain pedal for the session, while record mode still cannot', () => {
    const pedal = parseMidiMessage([0xb0, 64, 127]);
    expect(bindingFromMessage(pedal)).toBe(null);
    expect(bindingFromMessage(pedal, { allowSustain: true })).toEqual({ type: 'control', channel: 1, number: 64 });
  });

  it('matches bindings only against the session action list', () => {
    const key = bindingFromMessage(parseMidiMessage([0x90, 36, 100]));
    const bindings = { next: key, record: key };
    expect(boundAction(bindings, parseMidiMessage([0x90, 36, 90]), sessionActions)).toEqual({ action: 'next', pressed: true });
    expect(boundAction(bindings, parseMidiMessage([0x80, 36, 0]), sessionActions)).toEqual({ action: 'next', pressed: false });
    expect(boundAction(bindings, parseMidiMessage([0x91, 36, 90]), sessionActions)).toBe(null);
    expect(boundAction({ record: key }, parseMidiMessage([0x90, 36, 90]), sessionActions)).toBe(null);
    expect(readBindings(JSON.stringify(bindings), sessionActions)).toEqual({ next: key });
    expect(describeBinding(key)).toBe('Key C2 · channel 1');
  });
});

describe('acceptPress', () => {
  const press = (memory, atMs, discrete = true) => acceptPress(memory, 'next', { pressed: true, discrete, atMs });
  const release = (memory, atMs, discrete = true) => acceptPress(memory, 'next', { pressed: false, discrete, atMs });

  it('fires on press and never on release', () => {
    const pressed = press(emptyPressMemory, 1000);
    expect(pressed.fire).toBe(true);
    expect(release(pressed.memory, 1100).fire).toBe(false);
  });

  it('fires once for a button that repeats while held', () => {
    let result = press(emptyPressMemory, 0, false);
    expect(result.fire).toBe(true);
    result = press(result.memory, 400, false);
    expect(result.fire).toBe(false);
    result = release(result.memory, 500, false);
    expect(press(result.memory, 800, false).fire).toBe(true);
  });

  it('ignores a bouncy pedal inside the debounce time', () => {
    let memory = emptyPressMemory;
    const fired = [];
    for (const [atMs, pressed] of [[0, true], [20, false], [45, true], [70, false], [100, true], [130, false]]) {
      const result = acceptPress(memory, 'next', { pressed, discrete: false, atMs });
      memory = result.memory;
      if (result.fire) fired.push(atMs);
    }
    expect(fired).toEqual([0]);
    expect(press(release(memory, 200, false).memory, pressDebounceMs + 10, false).fire).toBe(true);
  });

  it('keeps each action separate and treats keys and program changes as one-shot presses', () => {
    const first = press(emptyPressMemory, 0);
    expect(acceptPress(first.memory, 'prev', { pressed: true, discrete: true, atMs: 10 }).fire).toBe(true);
    expect(press(first.memory, 300).fire).toBe(true);
    expect(pressIsDiscrete(parseMidiMessage([0x90, 36, 100]))).toBe(true);
    expect(pressIsDiscrete(parseMidiMessage([0xc0, 3]))).toBe(true);
    expect(pressIsDiscrete(parseMidiMessage([0xb0, 64, 127]))).toBe(false);
  });
});

describe('sessionCommand', () => {
  it('play/pause follows the same rule as the main button', () => {
    expect(commandAt('playPause', 0, { playState: 'idle' })).toEqual({ send: ['start', {}] });
    expect(commandAt('playPause', 3000)).toEqual({ send: ['pause', {}] });
    expect(commandAt('playPause', 3000, { playState: 'paused', anchorOffsetMs: 3000 })).toEqual({ send: ['resume', {}] });
    const session = sessionAt({}, { settings: { autoAdvance: false } });
    const waiting = positionAt(timelines, 0, 30000, false);
    expect(waiting.phase).toBe('waiting');
    expect(sessionCommand('playPause', { session, position: waiting, timelines, serverNow: 30000 })).toEqual({ send: ['next', { itemIdx: 0 }] });
    expect(commandAt('playPause', 3000, { playState: 'ended' })).toBe(null);
  });

  it('moves between songs, and only shows a notice at the first and last song', () => {
    expect(commandAt('next', 3000)).toEqual({ send: ['next', { itemIdx: 0 }] });
    expect(commandAt('prev', 3000)).toEqual({ toast: sessionMidiNotices.firstSong });
    expect(commandAt('prev', 3000, { itemIdx: 1 })).toEqual({ send: ['prev', { itemIdx: 1 }] });
    expect(commandAt('next', 3000, { itemIdx: 2 })).toEqual({ toast: sessionMidiNotices.lastSong });
  });

  it('does nothing but a notice before the session starts', () => {
    for (const action of ['next', 'prev', 'nextSection', 'prevSection']) {
      expect(commandAt(action, 0, { playState: 'idle' })).toEqual({ toast: sessionMidiNotices.notStarted });
    }
  });

  it('jumps to the next section, and to the top of this one or the previous one', () => {
    const sectionStart = (bar) => timelines[0].countInMs + timelines[0].barStartsMs[bar];
    expect(commandAt('nextSection', 2500)).toEqual({ send: ['seek', { itemIdx: 0, offsetMs: sectionStart(2) }] });
    expect(commandAt('nextSection', 1000)).toEqual({ send: ['seek', { itemIdx: 0, offsetMs: sectionStart(0) }] });
    expect(commandAt('prevSection', sectionStart(3) + 100)).toEqual({ send: ['seek', { itemIdx: 0, offsetMs: sectionStart(2) }] });
    expect(commandAt('prevSection', sectionStart(2) + 100)).toEqual({ send: ['seek', { itemIdx: 0, offsetMs: sectionStart(0) }] });
    expect(commandAt('prevSection', sectionStart(0) + 100)).toEqual({ toast: sessionMidiNotices.firstSection });
    expect(commandAt('prevSection', 1000)).toEqual({ toast: sessionMidiNotices.firstSection });
    expect(commandAt('nextSection', sectionStart(4) + 100)).toEqual({ toast: sessionMidiNotices.lastSection });
    expect(commandAt('nextSection', timelines[0].countInMs + timelines[0].songMs + 500)).toEqual({ toast: sessionMidiNotices.betweenSongs });
  });

  it('counts from the jump target during the start lead, so two quick presses move two sections', () => {
    const sectionStart = (bar) => timelines[0].countInMs + timelines[0].barStartsMs[bar];
    const state = { playState: 'playing', anchorServerMs: 10000, anchorOffsetMs: sectionStart(2) };
    expect(targetElapsedMs(state, 9000)).toBe(sectionStart(2));
    expect(targetElapsedMs(state, 10500)).toBe(sectionStart(2) + 500);
    expect(targetElapsedMs({ ...state, playState: 'paused' }, 99999)).toBe(sectionStart(2));
    const session = sessionAt(state);
    const position = positionAt(timelines, 0, sectionStart(2) - 1500, true);
    expect(sessionCommand('nextSection', { session, position, timelines, serverNow: 8500 })).toEqual({ send: ['seek', { itemIdx: 0, offsetMs: sectionStart(4) }] });
  });
});

describe('sessionMidiAllowed', () => {
  const member = (changes = {}) => sessionAt({}, { me: { isHost: false, pid: 'm' }, participants: [{ pid: 'm', isController: false }], ...changes });

  it('gives bindings only to people who can already control playback', () => {
    expect(sessionMidiAllowed(sessionAt())).toBe(true);
    expect(sessionMidiAllowed(member())).toBe(false);
    expect(sessionMidiAllowed(member({ controllerPolicy: 'everyone' }))).toBe(true);
    expect(sessionMidiAllowed(member({ controllerPolicy: 'selected', participants: [{ pid: 'm', isController: true }] }))).toBe(true);
    expect(sessionMidiAllowed(sessionAt({ playState: 'ended' }))).toBe(false);
    expect(sessionMidiAllowed(null)).toBe(false);
  });
});
