import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openSessionConnection } from './sessionConnection.js';

function fakeSocket() {
  const listeners = new Map();
  return {
    emitted: [],
    closed: false,
    on: (event, listener) => listeners.set(event, listener),
    emit(event, payload) { this.emitted.push([event, payload]); },
    fire: (event, payload) => listeners.get(event)?.(payload),
    listenerCount: () => listeners.size,
    removeAllListeners: () => listeners.clear(),
    close() { this.closed = true; },
    disconnect() { this.closed = true; }
  };
}

function fakePage() {
  const listeners = new Set();
  return {
    visibilityState: 'visible',
    addEventListener: (event, listener) => listeners.add(listener),
    removeEventListener: (event, listener) => listeners.delete(listener),
    listenerCount: () => listeners.size
  };
}

function handlers() {
  return { refetch: vi.fn(), setSession: vi.fn(), setConnected: vi.fn(), setKicked: vi.fn() };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('session connection', () => {
  it('joins the room on connect and sends a heartbeat', () => {
    const socket = fakeSocket();
    const close = openSessionConnection('s1', () => socket, handlers(), fakePage());
    socket.fire('connect');
    vi.advanceTimersByTime(30000);
    expect(socket.emitted).toEqual([['join-room', 's1'], ['hb', undefined]]);
    close();
  });

  it('closes the socket and stops every timer and listener when the page leaves', () => {
    const socket = fakeSocket();
    const page = fakePage();
    const sessionHandlers = handlers();
    const close = openSessionConnection('s1', () => socket, sessionHandlers, page);
    close();
    expect(socket.closed).toBe(true);
    expect(socket.listenerCount()).toBe(0);
    expect(page.listenerCount()).toBe(0);
    const refetchesAtClose = sessionHandlers.refetch.mock.calls.length;
    vi.advanceTimersByTime(120000);
    expect(socket.emitted).toEqual([]);
    expect(sessionHandlers.refetch.mock.calls.length).toBe(refetchesAtClose);
  });

  it('marks a kicked member and disconnects', () => {
    const socket = fakeSocket();
    const sessionHandlers = handlers();
    const close = openSessionConnection('s1', () => socket, sessionHandlers, fakePage());
    socket.fire('kicked');
    expect(sessionHandlers.setKicked).toHaveBeenCalledWith(true);
    expect(socket.closed).toBe(true);
    close();
  });
});
