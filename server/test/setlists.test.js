import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient, registerHost } from './testServer.js';

let server;
let call;
let token;
const songIds = [];

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
  token = await registerHost(call);
  for (const title of ['One', 'Two', 'Three']) {
    const created = await call('POST', '/songs', { title, keyRoot: 'C', bpm: 100, sections: [{ name: 'A', bars: [{ chords: [{ beat: 1, chord: 'C' }] }] }] }, token);
    songIds.push(created.body._id);
  }
});

afterAll(() => server.stop());

describe('setlists', () => {
  it('builds a 3-item setlist with per-item parameters and reorders it', async () => {
    const items = [
      { songId: songIds[0], gapMode: 'countdown', gapSeconds: 10 },
      { songId: songIds[1], tempoPct: 120, transpose: -2, countInBars: 2 },
      { songId: songIds[2], gapMode: 'manual' }
    ];
    const created = await call('POST', '/setlists', { name: 'Friday gig', venue: 'The Hall', items }, token);
    expect(created.status).toBe(201);
    expect(created.body.items).toHaveLength(3);
    expect(created.body.items[0]).toMatchObject({ gapMode: 'countdown', gapSeconds: 10, tempoPct: 100, countInBars: 1 });
    expect(created.body.items[1]).toMatchObject({ tempoPct: 120, transpose: -2, countInBars: 2 });

    const [first, second, third] = created.body.items;
    const reordered = await call('PUT', `/setlists/${created.body._id}`, { items: [third, first, second] }, token);
    expect(reordered.status).toBe(200);
    expect(reordered.body.items.map((item) => item.songId)).toEqual([songIds[2], songIds[0], songIds[1]]);

    const fetched = await call('GET', `/setlists/${created.body._id}`, undefined, token);
    expect(fetched.body.items.map((item) => item.songId)).toEqual([songIds[2], songIds[0], songIds[1]]);
    expect(fetched.body.items[2]).toMatchObject({ tempoPct: 120, transpose: -2 });
  });

  it('rejects bad items and songs owned by someone else', async () => {
    expect((await call('POST', '/setlists', { name: 'Bad', items: [{ songId: songIds[0], tempoPct: 500 }] }, token)).status).toBe(400);
    expect((await call('POST', '/setlists', { name: 'Bad', items: 'nope' }, token)).status).toBe(400);
    const otherToken = await registerHost(call, 'other@example.com');
    expect((await call('POST', '/setlists', { name: 'Theft', items: [{ songId: songIds[0] }] }, otherToken)).status).toBe(400);
  });

  it('lists and deletes setlists', async () => {
    const created = await call('POST', '/setlists', { name: 'Short', items: [] }, token);
    expect((await call('GET', '/setlists', undefined, token)).body.length).toBe(2);
    expect((await call('DELETE', `/setlists/${created.body._id}`, undefined, token)).status).toBe(204);
    expect((await call('GET', '/setlists', undefined, token)).body.length).toBe(1);
  });

  it('takes a deleted song out of every setlist that used it', async () => {
    const song = await call('POST', '/songs', { title: 'Song Gone', keyRoot: 'C', bpm: 100, sections: [] }, token);
    const setlist = await call('POST', '/setlists', { name: 'With gone', items: [{ songId: songIds[0] }, { songId: song.body._id }, { songId: song.body._id }] }, token);
    expect((await call('DELETE', `/songs/${song.body._id}`, undefined, token)).status).toBe(204);
    const fetched = await call('GET', `/setlists/${setlist.body._id}`, undefined, token);
    expect(fetched.body.items.map((item) => item.songId)).toEqual([songIds[0]]);
  });
});
