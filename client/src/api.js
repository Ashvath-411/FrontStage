import { readStored, writeStored } from './storage.js';

const hostTokenKey = 'setlist.hostToken';
const memberTokenPrefix = 'setlist.memberToken.';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const hostToken = {
  get: () => readStored(hostTokenKey),
  set: (token) => writeStored(hostTokenKey, token)
};

export const memberToken = {
  get: (sessionId) => readStored(memberTokenPrefix + sessionId),
  set: (sessionId, token) => writeStored(memberTokenPrefix + sessionId, token)
};

export function sessionTokens(sessionId) {
  return { token: hostToken.get(), memberToken: memberToken.get(sessionId) };
}

async function request(method, path, body, token, sessionMemberToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (sessionMemberToken) headers['X-Member-Token'] = sessionMemberToken;
  const response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    .catch(() => {
      throw new ApiError(0, 'Could not reach FrontStage. Check your connection.');
    });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Request failed');
  return data;
}

function asHost(method, path, body) {
  return request(method, path, body, hostToken.get());
}

function asSessionCaller(sessionId, method, path, body) {
  const tokens = sessionTokens(sessionId);
  return request(method, `/sessions/${sessionId}${path}`, body, tokens.token, tokens.memberToken);
}

export const api = {
  serverTime: () => request('GET', '/time'),
  register: (fields) => request('POST', '/auth/register', fields),
  login: (fields) => request('POST', '/auth/login', fields),
  me: () => asHost('GET', '/auth/me'),
  listSongs: () => asHost('GET', '/songs'),
  getSong: (id) => asHost('GET', `/songs/${id}`),
  createSong: (song) => asHost('POST', '/songs', song),
  updateSong: (id, song) => asHost('PUT', `/songs/${id}`, song),
  deleteSong: (id) => asHost('DELETE', `/songs/${id}`),
  listSetlists: () => asHost('GET', '/setlists'),
  getSetlist: (id) => asHost('GET', `/setlists/${id}`),
  createSetlist: (setlist) => asHost('POST', '/setlists', setlist),
  updateSetlist: (id, setlist) => asHost('PUT', `/setlists/${id}`, setlist),
  deleteSetlist: (id) => asHost('DELETE', `/setlists/${id}`),
  createSession: (fields) => asHost('POST', '/sessions', fields),
  listMySessions: () => asHost('GET', '/sessions'),
  joinSession: (fields) => request('POST', '/sessions/join', fields),
  getSession: (id) => asSessionCaller(id, 'GET', ''),
  updateSession: (id, fields) => asSessionCaller(id, 'PATCH', '', fields),
  refreshSnapshot: (id) => asSessionCaller(id, 'POST', '/snapshot'),
  control: (id, command) => asSessionCaller(id, 'POST', '/control', command),
  updateParticipant: (id, pid, fields) => asSessionCaller(id, 'PATCH', `/participants/${encodeURIComponent(pid)}`, fields),
  leaveSession: (id) => asSessionCaller(id, 'POST', '/leave')
};
