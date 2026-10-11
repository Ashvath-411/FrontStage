import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient } from './testServer.js';
import { createHostWithSetlist, createSession, joinAs, connectSocket, joinRoom, nextEvent } from './sessionHelpers.js';

let server;
let call;
let host;
const sockets = [];

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
  host = await createHostWithSetlist(call);
});

afterAll(async () => {
  sockets.forEach((socket) => socket.close());
  await server.stop();
});

describe('snapshot refresh and settings', () => {
  it('refreshes the snapshot from the edited song and keeps the state', async () => {
    const created = await createSession(call, host);
    const joined = await joinAs(call, created.code, 'Drums');
    const memberSocket = connectSocket(server.baseUrl, joined.body.token);
    sockets.push(memberSocket);
    await joinRoom(memberSocket, created.id);
    await call('POST', `/sessions/${created.id}/control`, { action: 'start', expectedVersion: 0 }, host.token);

    const before = await call('GET', `/sessions/${created.id}`, undefined, host.token);
    const songId = before.body.snapshot[0].songId;
    await call('PUT', `/songs/${songId}`, { title: 'First (new arrangement)', bpm: 140 }, host.token);
    const unchanged = await call('GET', `/sessions/${created.id}`, undefined, joined.body.token);
    expect(unchanged.body.snapshot[0].title).toBe('First');

    expect((await call('POST', `/sessions/${created.id}/snapshot`, undefined, joined.body.token)).status).toBe(401);
    const snapshotEvent = nextEvent(memberSocket, 'snapshot');
    const refreshed = await call('POST', `/sessions/${created.id}/snapshot`, undefined, host.token);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body[0]).toMatchObject({ title: 'First (new arrangement)', bpm: 140 });
    expect((await snapshotEvent)[0].title).toBe('First (new arrangement)');
    const after = await call('GET', `/sessions/${created.id}`, undefined, host.token);
    expect(after.body.state).toEqual(before.body.state);
  });

  it('broadcasts settings and applies a new controller policy', async () => {
    const created = await createSession(call, host);
    const joined = await joinAs(call, created.code, 'Keys');
    const memberSocket = connectSocket(server.baseUrl, joined.body.token);
    sockets.push(memberSocket);
    await joinRoom(memberSocket, created.id);
    expect((await call('POST', `/sessions/${created.id}/control`, { action: 'start', expectedVersion: 0 }, joined.body.token)).status).toBe(403);
    const settingsEvent = nextEvent(memberSocket, 'settings');
    await call('PATCH', `/sessions/${created.id}`, { controllerPolicy: 'everyone', settings: { showLyrics: false } }, host.token);
    expect(await settingsEvent).toMatchObject({ controllerPolicy: 'everyone', settings: { showLyrics: false } });
    expect((await call('POST', `/sessions/${created.id}/control`, { action: 'start', expectedVersion: 0 }, joined.body.token)).status).toBe(200);
  });
});
