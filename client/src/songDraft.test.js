import { beforeEach, describe, expect, it } from 'vitest';
import { clearSongDraft, draftWorthRestoring, readSongDraft, songContent, writeSongDraft } from './songDraft.js';

beforeEach(() => {
  const values = new Map();
  globalThis.window = {
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }
  };
});

describe('song drafts', () => {
  const saved = songContent({ title: 'Song One' }, [{ name: 'A', bars: [] }], []);
  const edited = songContent({ title: 'Song One' }, [{ name: 'A', bars: [{ chords: [], lyric: 'first line' }] }], []);

  it('keeps a draft per song until it is cleared', () => {
    writeSongDraft('song-1', edited, 1000);
    expect(readSongDraft('song-1')).toEqual({ content: edited, savedAt: 1000 });
    expect(readSongDraft('song-2')).toBeNull();
    clearSongDraft('song-1');
    expect(readSongDraft('song-1')).toBeNull();
  });

  it('only offers a draft that differs from the saved song', () => {
    writeSongDraft('song-1', edited);
    expect(draftWorthRestoring(readSongDraft('song-1'), saved)).toBe(true);
    expect(draftWorthRestoring(readSongDraft('song-1'), edited)).toBe(false);
    expect(draftWorthRestoring(null, saved)).toBe(false);
  });

  it('ignores broken or blocked storage', () => {
    globalThis.window.localStorage.setItem('setlist.songDraft.song-1', '{broken');
    expect(readSongDraft('song-1')).toBeNull();
    globalThis.window = { get localStorage() { throw new Error('blocked'); } };
    expect(() => writeSongDraft('song-1', edited)).not.toThrow();
    expect(readSongDraft('song-1')).toBeNull();
  });
});
