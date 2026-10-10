import { describe, expect, it } from 'vitest';
import { buildTimeline } from '../engine/timeline.js';
import { buildCues, cueKinds, resolveCollisions } from './cueList.js';
import { estimateSpeechMs, gapNoteText, nextUpText } from './cueText.js';

const barMs = 2000;
const allKinds = Object.fromEntries(cueKinds.map((kind) => [kind, true]));
const standardKinds = { ...allKinds, 'gap-time': false };
const allDetails = { artist: true, key: true, bpm: true };
const noDetails = { artist: false, key: false, bpm: false };

function section(name, firstBar, barCount, bpm = 120) {
  return { name, bpm, beatsPerBar: 4, firstBar, barCount };
}

function song(overrides = {}) {
  const sections = overrides.sections ?? [section('Verse', 0, 4), section('Chorus', 4, 4)];
  const barCount = sections.reduce((total, entry) => total + entry.barCount, 0);
  return {
    title: 'Song One', artist: 'Band One', keyRoot: 'C', keyMode: 'major', bpm: 120, beatsPerBar: 4,
    transpose: 0, tempoPct: 100, countInBars: 1, gapMode: 'countdown', gapSeconds: 8, note: '', annotations: [],
    bars: Array.from({ length: barCount }, () => ({ chords: [], lyric: '' })),
    ...overrides,
    sections
  };
}

const songTwo = (overrides = {}) => song({ title: 'Song Two', artist: 'Band Two', keyRoot: 'G', bpm: 100, sections: [section('Intro', 0, 4, 100)], ...overrides });

function cuesFor(items, options = {}, autoAdvance = true) {
  return buildCues(items.map(buildTimeline), 0, autoAdvance, { kinds: standardKinds, nextUpDetails: allDetails, instrument: 'drums', ...options });
}

const startOf = (cue) => cue.atMs - estimateSpeechMs(cue.text);
const ofKind = (cues, kind) => cues.filter((cue) => cue.kind === kind);
const gapStartMs = barMs + 8 * barMs;
const gapEndMs = gapStartMs + 8000;

describe('next-up text', () => {
  it('reads title, artist, key and tempo, each detail with its own toggle', () => {
    expect(nextUpText(songTwo(), 100, allDetails, true)).toBe('Next up, Song Two, Band Two. Key of G, 100 beats per minute.');
    expect(nextUpText(songTwo(), 100, noDetails, true)).toBe('Next up, Song Two.');
    expect(nextUpText(songTwo(), 100, { artist: false, key: false, bpm: true }, true)).toBe('Next up, Song Two. 100 beats per minute.');
  });

  it('says flats and the transpose when key change is on', () => {
    expect(nextUpText(songTwo({ keyRoot: 'Bb', transpose: 0 }), 100, allDetails, true)).toContain('Key of B flat,');
    expect(nextUpText(songTwo({ transpose: -2 }), 96.4, allDetails, true)).toBe('Next up, Song Two, Band Two. Key of F, transposed down 2, 96 beats per minute.');
    expect(nextUpText(songTwo({ transpose: 2 }), 100, allDetails, false)).toBe('Next up, Song Two, Band Two. Key of A, 100 beats per minute.');
  });

  it('times next-up to end before the countdown in a short gap', () => {
    const cues = cuesFor([song(), songTwo()]);
    const [nextUp] = ofKind(cues, 'next-up');
    const [firstNumber] = ofKind(cues, 'countdown');
    expect(nextUp.text).toBe('Next up, Song Two, Band Two. Key of G, 100 beats per minute.');
    expect(nextUp.atMs).toBeLessThanOrEqual(startOf(firstNumber) - 300);
  });

  it('starts next-up right at the gap start when it fits', () => {
    const [nextUp] = ofKind(cuesFor([song(), songTwo()], { nextUpDetails: noDetails }), 'next-up');
    expect(startOf(nextUp)).toBe(gapStartMs);
  });
});

describe('gap cues', () => {
  it('reads the item note after next-up, cut at a word under 140 characters', () => {
    const longNote = 'word '.repeat(60);
    const text = gapNoteText(longNote);
    expect(text.startsWith('Note, word')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(141);
    expect(text).toMatch(/word\.$/);
    const cues = cuesFor([song(), songTwo({ note: 'Capo two' })], { nextUpDetails: noDetails });
    const [nextUp] = ofKind(cues, 'next-up');
    const [gapNote] = ofKind(cues, 'gap-note');
    expect(gapNote.text).toBe('Note, Capo two.');
    expect(startOf(gapNote)).toBe(nextUp.atMs + 300);
  });

  it('only says the gap time in countdown gaps longer than 12 seconds', () => {
    expect(ofKind(cuesFor([song(), songTwo()], { kinds: allKinds }), 'gap-time')).toEqual([]);
    const cues = cuesFor([song({ gapSeconds: 20 }), songTwo()], { kinds: allKinds, nextUpDetails: noDetails });
    const gapTime = ofKind(cues, 'gap-time');
    expect(gapTime.map((cue) => cue.text)).toEqual(['Ten seconds', 'Five']);
    expect(gapTime.map(startOf)).toEqual([gapStartMs + 10000, gapStartMs + 15000]);
  });

  it('counts 3, 2, 1 on the last three whole seconds before the count-in', () => {
    const countdown = ofKind(cuesFor([song(), songTwo()]), 'countdown');
    expect(countdown.map((cue) => cue.text)).toEqual(['3', '2', '1']);
    expect(countdown.map(startOf)).toEqual([gapEndMs - 3000, gapEndMs - 2000, gapEndMs - 1000]);
    expect(countdown.every((cue) => cue.atMs < gapEndMs)).toBe(true);
  });

  it('says next-up in the last bar when the gap is immediate', () => {
    const items = [song({ gapMode: 'immediate' }), songTwo()];
    const [shortCue] = ofKind(cuesFor(items, { nextUpDetails: noDetails }), 'next-up');
    expect(startOf(shortCue)).toBe(barMs + 7 * barMs);
    const [longCue] = ofKind(cuesFor(items, { kinds: { ...standardKinds, ending: false } }), 'next-up');
    expect(longCue.atMs).toBeLessThanOrEqual(gapStartMs - 300);
    expect(ofKind(cuesFor(items), 'countdown')).toEqual([]);
  });

  it('lets the earlier ending cue win over a long next-up of the same priority', () => {
    const kinds = cuesFor([song({ gapMode: 'immediate' }), songTwo()]).map((cue) => cue.kind);
    expect(kinds).toContain('ending');
    expect(kinds).not.toContain('next-up');
  });

  it('speaks once when a manual gap starts and nothing after it', () => {
    const cues = cuesFor([song({ gapMode: 'manual' }), songTwo({ note: 'Capo two', sections: [section('Intro', 0, 2, 100), section('Chorus', 2, 2, 100)] })]);
    const afterSong = cues.filter((cue) => cue.atMs > gapStartMs);
    expect(afterSong.map((cue) => cue.kind)).toEqual(['next-up', 'gap-note']);
    expect(startOf(afterSong[0])).toBe(gapStartMs);
  });

  it('says nothing after the last song', () => {
    const cues = cuesFor([song()]);
    expect(cues.every((cue) => cue.atMs <= gapStartMs)).toBe(true);
    expect(ofKind(cues, 'next-up')).toEqual([]);
  });
});

describe('song cues', () => {
  it('names the next section one bar ahead, and Bridge or Outro two bars ahead', () => {
    const items = [song({ sections: [section('Verse', 0, 4), section('Chorus', 4, 4), section('Bridge', 8, 4)] })];
    const sectionCues = ofKind(cuesFor(items), 'section-ahead');
    expect(sectionCues.map((cue) => [cue.text, cue.atMs])).toEqual([['Chorus', barMs + 3 * barMs], ['Bridge in two', barMs + 6 * barMs]]);
  });

  it('warns one bar before a tempo change, scaled by tempo percent', () => {
    const items = [song({ tempoPct: 50, sections: [section('Verse', 0, 4), section('Fast', 4, 4, 140)] })];
    const [tempoCue] = ofKind(cuesFor(items), 'tempo-change');
    expect(tempoCue.text).toBe('Tempo change, 70');
    expect(tempoCue.atMs).toBe(2 * barMs + 3 * 2 * barMs);
  });

  it('reads notes for my instrument or everyone, when they appear', () => {
    const annotations = [
      { barIdx: 6, leadInBars: 2, audience: ['drums'], text: 'Play softer' },
      { barIdx: 6, leadInBars: 1, audience: ['keys'], text: 'Pad in' },
      { barIdx: 7, leadInBars: 0, audience: ['all'], text: 'Watch me' }
    ];
    const notes = ofKind(cuesFor([song({ annotations })]), 'annotation');
    expect(notes.map((cue) => [cue.text, cue.atMs])).toEqual([['Drums, Play softer', barMs + 4 * barMs], ['Everyone, Watch me', barMs + 7 * barMs]]);
  });

  it('says last chorus before the final chorus and ending before the final bar', () => {
    const items = [song({ sections: [section('Chorus', 0, 2), section('Verse', 2, 2), section('Chorus', 4, 4)] })];
    const ending = ofKind(cuesFor(items), 'ending');
    expect(ending.map((cue) => [cue.text, cue.atMs])).toEqual([['Last chorus', barMs + 3 * barMs], ['Ending', barMs + 6 * barMs]]);
    expect(ofKind(cuesFor([song()]), 'ending').map((cue) => cue.text)).toEqual(['Ending']);
  });

  it('never speaks over the count-in clicks', () => {
    const annotations = [{ barIdx: 0, leadInBars: 0, audience: ['all'], text: 'Start soft' }];
    expect(ofKind(cuesFor([song({ annotations })]), 'annotation')).toEqual([]);
  });

  it('skips cues that would already have started for a late joiner', () => {
    const cues = cuesFor([song(), songTwo()], { fromMs: gapStartMs + 1 });
    expect(cues.every((cue) => startOf(cue) >= gapStartMs + 1)).toBe(true);
    expect(ofKind(cues, 'section-ahead')).toEqual([]);
    expect(ofKind(cues, 'countdown')).toHaveLength(3);
  });
});

describe('collisions', () => {
  const cue = (atMs, priority, text = 'two words') => ({ id: `${atMs}-${priority}`, atMs, text, priority });

  it('keeps the higher priority when two cues overlap', () => {
    expect(resolveCollisions([cue(1000, 2), cue(1200, 3)])).toEqual([cue(1200, 3)]);
  });

  it('keeps the earlier cue when priorities are equal, and both when far enough apart', () => {
    expect(resolveCollisions([cue(1500, 3), cue(1000, 3)])).toEqual([cue(1000, 3)]);
    const spacing = estimateSpeechMs('two words') + 300;
    expect(resolveCollisions([cue(1000, 3), cue(1000 + spacing, 3)])).toHaveLength(2);
  });

  it('drops the section name when a tempo change lands on the same bar', () => {
    const items = [song({ sections: [section('Verse', 0, 4), section('Chorus', 4, 4, 140)] })];
    const kinds = cuesFor(items).map((cue) => cue.kind);
    expect(kinds).toContain('tempo-change');
    expect(kinds).not.toContain('section-ahead');
  });

  it('estimates speaking time from words and rate', () => {
    expect(estimateSpeechMs('one two three')).toBe(1170);
    expect(estimateSpeechMs('one two three', 2)).toBe(660);
  });
});
