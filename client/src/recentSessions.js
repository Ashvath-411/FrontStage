import { memberToken } from './api.js';
import { readStored, writeStored } from './storage.js';

const joinedSessionsKey = 'setlist.joinedSessions';
export const rejoinWindowMs = 24 * 60 * 60 * 1000;

function readList() {
  try {
    const list = JSON.parse(readStored(joinedSessionsKey) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeList(list) {
  writeStored(joinedSessionsKey, JSON.stringify(list));
}

export function recentJoinedSessions(now = Date.now()) {
  const list = readList();
  const fresh = list.filter((entry) => now - entry.joinedAt < rejoinWindowMs && memberToken.get(entry.sessionId));
  list.filter((entry) => !fresh.includes(entry)).forEach((entry) => memberToken.set(entry.sessionId, null));
  if (fresh.length !== list.length) writeList(fresh);
  return [...fresh].sort((first, second) => second.joinedAt - first.joinedAt);
}

export function rememberJoinedSession({ sessionId, token, name, code }, now = Date.now()) {
  if (token) memberToken.set(sessionId, token);
  const existing = readList().find((entry) => entry.sessionId === sessionId);
  const entry = { sessionId, name: name || existing?.name || code, code: code || existing?.code || '', joinedAt: existing?.joinedAt ?? now };
  writeList([entry, ...readList().filter((candidate) => candidate.sessionId !== sessionId)]);
}

export function forgetJoinedSession(sessionId, { keepToken = false } = {}) {
  if (!keepToken) memberToken.set(sessionId, null);
  writeList(readList().filter((entry) => entry.sessionId !== sessionId));
}
