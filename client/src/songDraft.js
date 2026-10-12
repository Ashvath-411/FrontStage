import { readStored, writeStored } from './storage.js';

const draftPrefix = 'setlist.songDraft.';

export function songContent(meta, sections, annotations) {
  return JSON.stringify({ meta, sections, annotations });
}

export function readSongDraft(songId) {
  try {
    const draft = JSON.parse(readStored(draftPrefix + songId) ?? 'null');
    return draft && typeof draft.content === 'string' ? draft : null;
  } catch {
    return null;
  }
}

export function writeSongDraft(songId, content, now = Date.now()) {
  writeStored(draftPrefix + songId, JSON.stringify({ content, savedAt: now }));
}

export function clearSongDraft(songId) {
  writeStored(draftPrefix + songId, null);
}

export function draftWorthRestoring(draft, loadedContent) {
  return Boolean(draft) && draft.content !== loadedContent;
}
