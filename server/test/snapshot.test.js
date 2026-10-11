import { describe, it, expect } from 'vitest';
import { buildSnapshot } from '../snapshot.js';

const song = {
  _id: 'song-a',
  title: 'Test Song',
  artist: 'Band',
  keyRoot: 'G',
  keyMode: 'major',
  bpm: 100,
  beatsPerBar: 4,
  sections: [
    { name: 'Intro', bars: [{ chords: [{ beat: 1, chord: 'G' }] }] },
    { name: 'Verse', bpm: 120, bars: [{ chords: [], lyric: 'a' }, { chords: [], lyric: 'b' }] },
    { name: 'Empty', bpm: 80, beatsPerBar: 3, bars: [] },
    { name: 'Chorus', bars: [{ chords: [{ beat: 1, chord: 'C' }], lyric: 'c' }] }
  ],
  annotations: [
    { barIdx: 3, kind: 'cue', text: 'Big ending', audience: ['drums'], leadInBars: 1 },
    { barIdx: 1, kind: 'dynamics', text: 'Soft', audience: ['all'], leadInBars: 0 },
    { barIdx: 9, kind: 'note', text: 'Out of range', audience: ['all'], leadInBars: 1 }
  ]
};

const setlist = {
  items: [
    { songId: 'song-a', transpose: 2, tempoPct: 110, countInBars: 2, gapMode: 'countdown', gapSeconds: 10, note: 'Opener' },
    { songId: 'missing', transpose: 0, tempoPct: 100, countInBars: 1, gapMode: 'manual', gapSeconds: 0 },
    { songId: 'song-a', transpose: 0, tempoPct: 100, countInBars: 1, gapMode: 'immediate', gapSeconds: 0 }
  ]
};

describe('buildSnapshot', () => {
  const snapshot = buildSnapshot(setlist, [song]);

  it('keeps one item per found song with sequential indexes', () => {
    expect(snapshot).toHaveLength(2);
    expect(snapshot.map((item) => item.itemIdx)).toEqual([0, 1]);
    expect(snapshot[0]).toMatchObject({ songId: 'song-a', title: 'Test Song', keyRoot: 'G', transpose: 2, tempoPct: 110, countInBars: 2, gapMode: 'countdown', gapSeconds: 10, note: 'Opener' });
    expect(snapshot[1].gapMode).toBe('immediate');
  });

  it('inherits tempo and time signature from the previous section', () => {
    expect(snapshot[0].sections).toEqual([
      { name: 'Intro', bpm: 100, beatsPerBar: 4, firstBar: 0, barCount: 1 },
      { name: 'Verse', bpm: 120, beatsPerBar: 4, firstBar: 1, barCount: 2 },
      { name: 'Chorus', bpm: 80, beatsPerBar: 3, firstBar: 3, barCount: 1 }
    ]);
  });

  it('flattens bars in section order with an empty lyric default', () => {
    expect(snapshot[0].bars.map((bar) => bar.lyric)).toEqual(['', 'a', 'b', 'c']);
    expect(snapshot[0].bars[0].chords).toEqual([{ beat: 1, chord: 'G' }]);
  });

  it('keeps annotations on valid global bar numbers, sorted', () => {
    expect(snapshot[0].annotations.map((annotation) => annotation.barIdx)).toEqual([1, 3]);
    expect(snapshot[0].annotations[1]).toEqual({ barIdx: 3, kind: 'cue', text: 'Big ending', audience: ['drums'], leadInBars: 1 });
  });
});
