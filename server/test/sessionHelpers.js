import { io } from 'socket.io-client';
import { registerHost } from './testServer.js';

export async function createHostWithSetlist(call, email = 'host@example.com') {
  const token = await registerHost(call, email);
  const songIds = [];
  for (const [title, bpm] of [['First', 120], ['Second', 90]]) {
    const song = await call('POST', '/songs', { title, keyRoot: 'C', bpm, sections: [{ name: 'A', bars: [{ chords: [{ beat: 1, chord: 'C' }] }, { chords: [{ beat: 1, chord: 'G' }] }] }] }, token);
    songIds.push(song.body._id);
  }
  const setlist = await call('POST', '/setlists', { name: 'Gig', items: songIds.map((songId) => ({ songId })) }, token);
  return { token, setlistId: setlist.body._id };
}

export async function createSession(call, host, fields = {}) {
  const response = await call('POST', '/sessions', { setlistId: host.setlistId, name: 'Live', ...fields }, host.token);
  return response.body;
}

export function joinAs(call, code, displayName, password) {
  return call('POST', '/sessions/join', { code, displayName, instrument: 'drums', password });
}

export function connectSocket(baseUrl, token) {
  return io(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
}

export function joinRoom(socket, sessionId) {
  return socket.timeout(5000).emitWithAck('join-room', sessionId);
}

export function nextEvent(socket, event, matches = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No ${event} event`)), 5000);
    function listener(payload) {
      if (!matches(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    }
    socket.on(event, listener);
  });
}
