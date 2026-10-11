import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io } from 'socket.io-client';
import { startTestServer, apiClient } from './testServer.js';
import { createHostWithSetlist, createSession, joinAs, joinRoom } from './sessionHelpers.js';

let server;
let call;
let hostA;
let hostB;
const sockets = [];

async function callWithBoth(method, path, hostToken, memberToken) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}`, 'X-Member-Token': memberToken };
  const response = await fetch(`${server.baseUrl}/api${path}`, { method, headers });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
  hostA = await createHostWithSetlist(call, 'a@example.com');
  hostB = await createHostWithSetlist(call, 'b@example.com');
});

afterAll(async () => {
  sockets.forEach((socket) => socket.close());
  await server.stop();
});

describe('one identity for hosts and members', () => {
  it('lets a logged-in host open their own session with no second login', async () => {
    const created = await createSession(call, hostA);
    const view = await call('GET', `/sessions/${created.id}`, undefined, hostA.token);
    expect(view.body.me).toMatchObject({ isHost: true, canControl: true });
    const mine = await call('GET', '/sessions', undefined, hostA.token);
    expect(mine.body.map((session) => session.id)).toContain(created.id);
    expect((await call('GET', '/sessions', undefined, hostB.token)).body.map((session) => session.id)).not.toContain(created.id);
  });

  it('keeps the host role when the host also joined their own session by code', async () => {
    const created = await createSession(call, hostA);
    const joined = await joinAs(call, created.code, 'Me again');
    const view = await callWithBoth('GET', `/sessions/${created.id}`, hostA.token, joined.body.token);
    expect(view.body.me.isHost).toBe(true);
  });

  it('joins another host session as a member while staying logged in', async () => {
    const created = await createSession(call, hostA);
    const joined = await joinAs(call, created.code, 'Guest host');
    const view = await callWithBoth('GET', `/sessions/${created.id}`, hostB.token, joined.body.token);
    expect(view.body.me).toMatchObject({ isHost: false });
    expect(view.body.me.pid).not.toMatch(/^host-/);
    expect((await callWithBoth('GET', '/songs', hostB.token, joined.body.token)).status).toBe(200);
    expect((await callWithBoth('POST', `/sessions/${created.id}/leave`, hostB.token, joined.body.token)).status).toBe(204);
  });

  it('lets a socket carry both tokens and enter the room', async () => {
    const created = await createSession(call, hostA);
    const joined = await joinAs(call, created.code, 'Socket guest');
    const socket = io(server.baseUrl, { auth: { token: hostB.token, memberToken: joined.body.token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    expect(await joinRoom(socket, created.id)).toEqual({ ok: true });
  });

  it('lists only open sessions for the host', async () => {
    const created = await createSession(call, hostA);
    await call('POST', `/sessions/${created.id}/control`, { action: 'end', expectedVersion: 0 }, hostA.token);
    const mine = await call('GET', '/sessions', undefined, hostA.token);
    expect(mine.body.map((session) => session.id)).not.toContain(created.id);
    expect(mine.body[0]).toMatchObject({ name: 'Live', playState: 'idle' });
  });
});
