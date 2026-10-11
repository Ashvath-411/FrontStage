import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient } from './testServer.js';
import { createHostWithSetlist, createSession, joinAs, connectSocket, joinRoom, nextEvent } from './sessionHelpers.js';

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

describe('sessions and joining', () => {
  it('creates a session with a snapshot and a 6 character code', async () => {
    const created = await createSession(call, host);
    expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const session = await call('GET', `/sessions/${created.id}`, undefined, host.token);
    expect(session.body.snapshot.map((item) => item.title)).toEqual(['First', 'Second']);
    expect(session.body.participants).toHaveLength(1);
    expect(session.body.me).toMatchObject({ isHost: true, canControl: true });
    expect(session.body.passwordHash).toBeUndefined();
  });

  it('joins with the right password and fails with 401 on a wrong one', async () => {
    const created = await createSession(call, host, { password: 'backstage' });
    expect((await joinAs(call, created.code, 'Wrong', 'nope')).status).toBe(401);
    const joined = await joinAs(call, created.code.toLowerCase(), 'Drummer', 'backstage');
    expect(joined.status).toBe(201);
    expect(joined.body.sessionId).toBe(created.id);
    const asMember = await call('GET', `/sessions/${created.id}`, undefined, joined.body.token);
    expect(asMember.status).toBe(200);
    expect(asMember.body.hasPassword).toBe(true);
    expect(asMember.body.passwordHash).toBeUndefined();
    expect(asMember.body.me).toMatchObject({ isHost: false, canControl: false });
  });

  it('returns 429 on the 6th wrong password in 10 minutes', async () => {
    const created = await createSession(call, host, { password: 'backstage' });
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect((await joinAs(call, created.code, 'Guess', `guess${attempt}`)).status).toBe(401);
    }
    expect((await joinAs(call, created.code, 'Guess', 'guess6')).status).toBe(429);
    expect((await joinAs(call, created.code, 'Guess', 'backstage')).status).toBe(429);
  });

  it('returns 404 for an unknown code and 403 for a locked session', async () => {
    expect((await joinAs(call, 'ZZZZZZ', 'Nobody')).status).toBe(404);
    const created = await createSession(call, host, { locked: true });
    expect((await joinAs(call, created.code, 'Late')).status).toBe(403);
  });

  it('refuses the third join with 409 when maxParticipants is 2', async () => {
    const created = await createSession(call, host, { maxParticipants: 2 });
    expect((await joinAs(call, created.code, 'Second')).status).toBe(201);
    expect((await joinAs(call, created.code, 'Third')).status).toBe(409);
  });

  it('leaves exactly one winner when two people join for the last seat at once', async () => {
    const created = await createSession(call, host, { maxParticipants: 2 });
    const results = await Promise.all([joinAs(call, created.code, 'Racer A'), joinAs(call, created.code, 'Racer B')]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const session = await call('GET', `/sessions/${created.id}`, undefined, host.token);
    expect(session.body.participants).toHaveLength(2);
  });

  it('rejects a socket without a token', async () => {
    const socket = openSocket('');
    const error = await nextEvent(socket, 'connect_error');
    expect(error.message).toBe('Unauthorized');
  });

  it('broadcasts participants, toggles a controller and keeps a kicked member out', async () => {
    const created = await createSession(call, host, { controllerPolicy: 'selected' });
    const hostSocket = openSocket(host.token);
    expect(await joinRoom(hostSocket, created.id)).toEqual({ ok: true });
    const joined = await joinAs(call, created.code, 'Keys');
    const memberToken = joined.body.token;
    const memberSocket = openSocket(memberToken);
    const onlineList = nextEvent(hostSocket, 'participants', (list) => list.some((person) => person.displayName === 'Keys' && person.online));
    expect(await joinRoom(memberSocket, created.id)).toEqual({ ok: true });
    const participants = await onlineList;
    const member = participants.find((person) => person.displayName === 'Keys');

    await call('PATCH', `/sessions/${created.id}/participants/${member.pid}`, { isController: true }, host.token);
    expect((await call('GET', `/sessions/${created.id}`, undefined, memberToken)).body.me.canControl).toBe(true);

    const kickedEvent = nextEvent(memberSocket, 'kicked');
    const kicked = await call('PATCH', `/sessions/${created.id}/participants/${member.pid}`, { kicked: true }, host.token);
    expect(kicked.status).toBe(200);
    expect(kicked.body.some((person) => person.pid === member.pid)).toBe(false);
    await kickedEvent;

    const retrySocket = openSocket(memberToken);
    expect(await joinRoom(retrySocket, created.id)).toEqual({ error: 'Not allowed in this session' });
    expect((await call('GET', `/sessions/${created.id}`, undefined, memberToken)).status).toBe(403);
  });

  it('lets a member leave and frees the seat', async () => {
    const created = await createSession(call, host, { maxParticipants: 2 });
    const joined = await joinAs(call, created.code, 'Bass');
    expect((await call('POST', `/sessions/${created.id}/leave`, undefined, joined.body.token)).status).toBe(204);
    expect((await joinAs(call, created.code, 'Guitar')).status).toBe(201);
  });

  it('lets only the host change settings', async () => {
    const created = await createSession(call, host);
    const joined = await joinAs(call, created.code, 'Vocals');
    expect((await call('PATCH', `/sessions/${created.id}`, { locked: true }, joined.body.token)).status).toBe(401);
    const updated = await call('PATCH', `/sessions/${created.id}`, { locked: true, password: 'newpass', settings: { nextUpSeconds: 12 } }, host.token);
    expect(updated.body).toMatchObject({ locked: true, hasPassword: true });
    expect(updated.body.settings.nextUpSeconds).toBe(12);
    expect((await call('PATCH', `/sessions/${created.id}`, { settings: { nextUpSeconds: 99 } }, host.token)).status).toBe(400);
  });
});
