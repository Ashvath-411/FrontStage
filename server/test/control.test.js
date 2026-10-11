import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient } from './testServer.js';
import { createHostWithSetlist, createSession, joinAs, connectSocket, joinRoom, nextEvent } from './sessionHelpers.js';
import { nextState } from '../routes/sessionControl.js';

let server;
let call;
let host;
const sockets = [];

function openSocket(token) {
  const socket = connectSocket(server.baseUrl, token);
  sockets.push(socket);
  return socket;
}

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
  host = await createHostWithSetlist(call);
});

afterAll(async () => {
  sockets.forEach((socket) => socket.close());
  await server.stop();
});

function control(sessionId, token, command) {
  return call('POST', `/sessions/${sessionId}/control`, command, token);
}

describe('playback control', () => {
  it('sends the same state to two socket clients after start', async () => {
    const created = await createSession(call, host);
    const joined = await joinAs(call, created.code, 'Drums');
    const hostSocket = openSocket(host.token);
    const memberSocket = openSocket(joined.body.token);
    await joinRoom(hostSocket, created.id);
    await joinRoom(memberSocket, created.id);
    const hostState = nextEvent(hostSocket, 'state');
    const memberState = nextEvent(memberSocket, 'state');
    const before = Date.now();
    const started = await control(created.id, host.token, { action: 'start', expectedVersion: 0 });
    expect(started.status).toBe(200);
    const [fromHost, fromMember] = await Promise.all([hostState, memberState]);
    expect(fromHost).toEqual(fromMember);
    expect(fromHost).toEqual(started.body);
    expect(fromHost).toMatchObject({ playState: 'playing', itemIdx: 0, anchorOffsetMs: 0, version: 1 });
    expect(fromHost.anchorServerMs).toBeGreaterThanOrEqual(before + 1500);
  });

  it('returns 409 for a stale expectedVersion', async () => {
    const created = await createSession(call, host);
    expect((await control(created.id, host.token, { action: 'start', expectedVersion: 0 })).status).toBe(200);
    const stale = await control(created.id, host.token, { action: 'next', expectedVersion: 0 });
    expect(stale.status).toBe(409);
    const current = await call('GET', `/sessions/${created.id}`, undefined, host.token);
    expect(current.body.state).toMatchObject({ itemIdx: 0, version: 1 });
  });

  it('keeps the offset across pause and resume', async () => {
    const created = await createSession(call, host, { settings: { startLeadMs: 500 } });
    await control(created.id, host.token, { action: 'start', expectedVersion: 0 });
    await new Promise((resolve) => setTimeout(resolve, 900));
    const paused = await control(created.id, host.token, { action: 'pause', expectedVersion: 1 });
    expect(paused.body.playState).toBe('paused');
    expect(paused.body.anchorOffsetMs).toBeGreaterThanOrEqual(350);
    expect(paused.body.anchorOffsetMs).toBeLessThan(1500);
    const resumed = await control(created.id, host.token, { action: 'resume', expectedVersion: 2 });
    expect(resumed.body).toMatchObject({ playState: 'playing', anchorOffsetMs: paused.body.anchorOffsetMs, version: 3 });
    expect(resumed.body.anchorServerMs).toBeGreaterThan(paused.body.anchorServerMs);
  });

  it('lets only controllers act and validates commands', async () => {
    const created = await createSession(call, host);
    const joined = await joinAs(call, created.code, 'Bass');
    expect((await control(created.id, joined.body.token, { action: 'start', expectedVersion: 0 })).status).toBe(403);
    expect((await control(created.id, host.token, { action: 'dance', expectedVersion: 0 })).status).toBe(400);
    expect((await control(created.id, host.token, { action: 'seek', offsetMs: -5, expectedVersion: 0 })).status).toBe(400);
    expect((await control(created.id, host.token, { action: 'jump', itemIdx: 7, expectedVersion: 0 })).status).toBe(400);
    expect((await control(created.id, host.token, { action: 'pause', expectedVersion: 0 })).status).toBe(409);
  });

  it('moves between songs, seeks and ends', async () => {
    const created = await createSession(call, host, { controllerPolicy: 'everyone' });
    const joined = await joinAs(call, created.code, 'Keys');
    const memberToken = joined.body.token;
    expect((await control(created.id, memberToken, { action: 'jump', itemIdx: 1, expectedVersion: 0 })).body).toMatchObject({ itemIdx: 1, playState: 'playing' });
    expect((await control(created.id, memberToken, { action: 'prev', expectedVersion: 1 })).body.itemIdx).toBe(0);
    expect((await control(created.id, memberToken, { action: 'next', itemIdx: 0, expectedVersion: 2 })).body.itemIdx).toBe(1);
    expect((await control(created.id, memberToken, { action: 'seek', offsetMs: 4000, expectedVersion: 3 })).body).toMatchObject({ itemIdx: 1, anchorOffsetMs: 4000 });
    const ended = await control(created.id, host.token, { action: 'end', expectedVersion: 4 });
    expect(ended.body.playState).toBe('ended');
    expect((await control(created.id, host.token, { action: 'start', expectedVersion: 5 })).status).toBe(409);
    expect((await joinAs(call, created.code, 'Late')).status).toBe(404);
  });
});

describe('nextState', () => {
  const playing = { playState: 'playing', itemIdx: 0, anchorServerMs: 10000, anchorOffsetMs: 200, version: 1 };

  it('adds the played time to the offset on pause and ignores time before the anchor', () => {
    expect(nextState({ action: 'pause' }, playing, 13000, 1500, 2)).toEqual({ playState: 'paused', anchorOffsetMs: 3200 });
    expect(nextState({ action: 'pause' }, playing, 9000, 1500, 2)).toEqual({ playState: 'paused', anchorOffsetMs: 200 });
  });

  it('keeps a paused session paused when moving to another song', () => {
    const paused = { ...playing, playState: 'paused' };
    expect(nextState({ action: 'next' }, paused, 13000, 1500, 2)).toEqual({ playState: 'paused', itemIdx: 1, anchorServerMs: 14500, anchorOffsetMs: 0 });
  });
});
