import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, apiClient, registerHost } from './testServer.js';
import { parseChordTokens } from '../../client/src/engine/parseChart.js';

let server;
let call;
let token;
const sixteen = 'A B C D E F G Am Bm Cm Dm Em Fm Gm A7 B7';

beforeAll(async () => {
  server = await startTestServer();
  call = apiClient(server.baseUrl);
  token = await registerHost(call, 'chords@example.com');
});

afterAll(() => server.stop());

function songWithBars(barCount, chordText) {
  const bar = { chords: parseChordTokens(chordText, 4), lyric: 'first line' };
  return { title: 'Song One', keyRoot: 'C', bpm: 120, sections: [{ name: 'A', bars: Array.from({ length: barCount }, () => bar) }] };
}

describe('many chords per bar on the server', () => {
  it('stores 16 chords with fractional beats and refuses 17', async () => {
    const saved = await call('POST', '/songs', songWithBars(1, `${sixteen}`), token);
    expect(saved.status).toBe(201);
    expect(saved.body.sections[0].bars[0].chords).toHaveLength(16);
    expect(saved.body.sections[0].bars[0].chords[1].beat).toBe(1.25);
    const tooMany = await call('POST', '/songs', songWithBars(1, `${sixteen} C`), token);
    expect(tooMany.status).toBe(400);
  });

  it('keeps a long setlist of busy songs well inside the 16 MB session document', async () => {
    const song = await call('POST', '/songs', songWithBars(300, sixteen), token);
    const setlist = await call('POST', '/setlists', { name: 'Busy', items: Array.from({ length: 20 }, () => ({ songId: song.body._id })) }, token);
    const session = await call('POST', '/sessions', { setlistId: setlist.body._id }, token);
    expect(session.status).toBe(201);
    const view = await call('GET', `/sessions/${session.body.id}`, undefined, token);
    const snapshotBytes = Buffer.byteLength(JSON.stringify(view.body.snapshot));
    console.log(`snapshot of 20 songs x 300 bars x 16 chords: ${(snapshotBytes / 1024 / 1024).toFixed(2)} MB as JSON`);
    expect(view.body.snapshot).toHaveLength(20);
    expect(snapshotBytes).toBeLessThan(16 * 1024 * 1024);
  });
});
