import { describe, expect, it } from 'vitest';
import { copyTitle, songCopy, visibleSongs } from './songList.js';

const songs = [
  { _id: 'a', title: 'Song One', artist: 'Band One', updatedAt: '2026-01-01T10:00:00Z' },
  { _id: 'b', title: 'Another Song', artist: 'Band Two', updatedAt: '2026-03-01T10:00:00Z' },
  { _id: 'c', title: 'Third', artist: '', updatedAt: '2026-02-01T10:00:00Z' }
];

describe('library list', () => {
  it('searches title and artist, ignoring case and word order', () => {
    expect(visibleSongs(songs, 'song', 'title').map((song) => song._id)).toEqual(['b', 'a']);
    expect(visibleSongs(songs, 'two BAND', 'title').map((song) => song._id)).toEqual(['b']);
    expect(visibleSongs(songs, 'nothing', 'title')).toEqual([]);
  });

  it('sorts by recently edited or by title', () => {
    expect(visibleSongs(songs, '', 'recent').map((song) => song._id)).toEqual(['b', 'c', 'a']);
    expect(visibleSongs(songs, '', 'title').map((song) => song._id)).toEqual(['b', 'a', 'c']);
  });

  it('makes a copy without ids and with a title that still fits', () => {
    const copy = songCopy({ _id: 'a', ownerId: 'o', createdAt: 1, updatedAt: 2, __v: 0, title: 'Song One', sections: [], annotations: [] });
    expect(copy).toEqual({ title: 'Song One (copy)', sections: [], annotations: [] });
    expect(copyTitle('x'.repeat(120))).toHaveLength(120);
  });
});
