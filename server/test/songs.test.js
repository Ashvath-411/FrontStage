import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient } from './testServer.js';
import { parseChart } from '../../client/src/engine/parseChart.js';

let server;
let call;

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
});

afterAll(() => server.stop());

describe('auth and songs', () => {
  let token;

  it('registers, rejects a duplicate and logs in', async () => {
    const registered = await call('POST', '/auth/register', { email: 'Band@Example.com', password: 'secret123', displayName: 'Band Leader' });
    expect(registered.status).toBe(201);
    expect(registered.body.user.email).toBe('band@example.com');
    const duplicate = await call('POST', '/auth/register', { email: 'band@example.com', password: 'secret123', displayName: 'Again' });
    expect(duplicate.status).toBe(409);
    const wrong = await call('POST', '/auth/login', { email: 'band@example.com', password: 'wrongpass' });
    expect(wrong.status).toBe(401);
    const login = await call('POST', '/auth/login', { email: 'band@example.com', password: 'secret123' });
    expect(login.status).toBe(200);
    token = login.body.token;
    const me = await call('GET', '/auth/me', undefined, token);
    expect(me.body.user.displayName).toBe('Band Leader');
  });

  it('rejects bad bodies and missing tokens', async () => {
    expect((await call('POST', '/auth/register', { email: 'x@y.z', password: 'short', displayName: 'X' })).status).toBe(400);
    expect((await call('GET', '/songs')).status).toBe(401);
    expect((await call('POST', '/songs', { title: 'No key', bpm: 100 }, token)).status).toBe(400);
    expect((await call('POST', '/songs', { title: 'Too fast', keyRoot: 'C', bpm: 900 }, token)).status).toBe(400);
  });

  it('creates a song from chart text and reads it back', async () => {
    const sections = parseChart('# Verse bpm=92\nAm / first line\nF . C G / second line\n# Chorus ts=3\nC', { beatsPerBar: 4 });
    const created = await call('POST', '/songs', { title: 'Chart Song', keyRoot: 'A', keyMode: 'minor', bpm: 92, sections, annotations: [{ barIdx: 1, text: 'Build up', audience: ['drums'] }] }, token);
    expect(created.status).toBe(201);
    const fetched = await call('GET', `/songs/${created.body._id}`, undefined, token);
    expect(fetched.body.sections).toEqual(sections);
    expect(fetched.body.annotations[0]).toMatchObject({ barIdx: 1, kind: 'note', leadInBars: 1 });
    const list = await call('GET', '/songs', undefined, token);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ title: 'Chart Song', barCount: 3 });
  });

  it('updates and deletes only the owner songs', async () => {
    const created = await call('POST', '/songs', { title: 'Mine', keyRoot: 'C', bpm: 100 }, token);
    const other = await call('POST', '/auth/register', { email: 'other@example.com', password: 'secret123', displayName: 'Other' });
    expect((await call('GET', `/songs/${created.body._id}`, undefined, other.body.token)).status).toBe(403);
    const updated = await call('PUT', `/songs/${created.body._id}`, { title: 'Renamed', bpm: 110 }, token);
    expect(updated.body).toMatchObject({ title: 'Renamed', bpm: 110, keyRoot: 'C' });
    expect((await call('DELETE', `/songs/${created.body._id}`, undefined, token)).status).toBe(204);
    expect((await call('GET', `/songs/${created.body._id}`, undefined, token)).status).toBe(404);
  });
});
