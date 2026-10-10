import { transposeKey } from '../engine/transpose.js';

export const maxSpokenLength = 140;
const msPerWord = 340;
const extraMs = 150;

export function estimateSpeechMs(text, rate = 1) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return (msPerWord * words) / rate + extraMs;
}

export function truncateAtWord(text, maxLength = maxSpokenLength) {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, maxLength)).replace(/[\s,.;:]+$/, '');
}

function spokenNote(noteName) {
  return noteName.replace('#', ' sharp').replace(/^([A-G])b/, '$1 flat');
}

export function spokenKey(item) {
  const { root } = transposeKey(item.keyRoot, item.keyMode, item.transpose ?? 0);
  return `${spokenNote(root)}${item.keyMode === 'minor' ? ' minor' : ''}`;
}

function transposeText(transpose) {
  if (!transpose) return null;
  return `transposed ${transpose > 0 ? 'up' : 'down'} ${Math.abs(transpose)}`;
}

function sentence(parts) {
  const text = parts.filter(Boolean).join(', ');
  return text ? `${text[0].toUpperCase()}${text.slice(1)}.` : '';
}

export function nextUpText(item, bpm, details, sayTranspose) {
  const opening = sentence([`next up, ${item.title}`, details.artist && item.artist]);
  const facts = sentence([
    details.key && `key of ${spokenKey(item)}`,
    sayTranspose && transposeText(item.transpose),
    details.bpm && `${Math.round(bpm)} beats per minute`
  ]);
  return [opening, facts].filter(Boolean).join(' ');
}

export function gapNoteText(note) {
  return truncateAtWord(`Note, ${note.trim()}`).replace(/[^.!?]$/, '$&.');
}

function capitalized(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : '';
}

export function annotationText(annotation, instrument) {
  const forMe = instrument && instrument !== 'all' && annotation.audience.includes(instrument);
  const listener = forMe ? capitalized(instrument) : annotation.audience.includes('all') ? 'Everyone' : capitalized(annotation.audience[0]);
  return truncateAtWord(`${listener}, ${annotation.text.trim()}`);
}

export function sectionAheadText(name, barsAhead) {
  return barsAhead === 2 ? `${name} in two` : name;
}
