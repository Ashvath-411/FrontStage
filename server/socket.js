import { Server } from 'socket.io';
import { readCaller } from './auth.js';
import { Session } from './models/Session.js';
import { findCallerParticipant } from './sessionAccess.js';

const onlineCounts = new Map();

export function roomName(sessionId) {
  return `session:${sessionId}`;
}

function changePresence(sessionId, pid, delta) {
  const counts = onlineCounts.get(sessionId) ?? new Map();
  const next = (counts.get(pid) ?? 0) + delta;
  if (next > 0) counts.set(pid, next);
  else counts.delete(pid);
  onlineCounts.set(sessionId, counts);
}

export function isOnline(sessionId, pid) {
  return (onlineCounts.get(String(sessionId))?.get(pid) ?? 0) > 0;
}

export function participantsView(session) {
  return session.participants
    .filter((participant) => !participant.kicked)
    .map((participant) => ({
      pid: participant.pid,
      displayName: participant.displayName,
      instrument: participant.instrument ?? '',
      isController: participant.isController,
      isHost: Boolean(participant.userId) && String(participant.userId) === String(session.hostId),
      online: isOnline(session._id, participant.pid)
    }));
}

export function emitToSession(io, sessionId, event, payload) {
  io.to(roomName(sessionId)).emit(event, payload);
}

export async function emitParticipants(io, sessionId) {
  const session = await Session.findById(sessionId).lean();
  if (session) emitToSession(io, sessionId, 'participants', participantsView(session));
}

export async function removeMemberSockets(io, sessionId, pid, event) {
  const sockets = await io.in(roomName(sessionId)).fetchSockets();
  for (const socket of sockets.filter((candidate) => candidate.data.pid === pid)) {
    if (event) socket.emit(event);
    socket.leave(roomName(sessionId));
    changePresence(String(sessionId), pid, -1);
    socket.data.sessionId = null;
  }
}

async function joinRoom(io, socket, sessionId) {
  const session = await Session.findById(sessionId).lean().catch(() => null);
  const participant = session && findCallerParticipant(session, socket.data.caller);
  if (!participant) return { error: 'Not allowed in this session' };
  if (socket.data.sessionId === String(sessionId)) return { ok: true };
  socket.data.sessionId = String(sessionId);
  socket.data.pid = participant.pid;
  socket.join(roomName(sessionId));
  changePresence(String(sessionId), participant.pid, 1);
  await emitParticipants(io, sessionId);
  return { ok: true };
}

function handleConnection(io, socket) {
  socket.on('join-room', async (sessionId, reply) => {
    const result = await joinRoom(io, socket, sessionId);
    if (typeof reply === 'function') reply(result);
  });
  socket.on('hb', (reply) => {
    if (typeof reply === 'function') reply({ now: Date.now() });
  });
  socket.on('disconnect', () => {
    const { sessionId, pid } = socket.data;
    if (!sessionId) return;
    changePresence(sessionId, pid, -1);
    emitParticipants(io, sessionId);
  });
}

export function attachSocket(httpServer) {
  const io = new Server(httpServer);
  io.use((socket, next) => {
    socket.data.caller = readCaller(socket.handshake.auth?.token ?? '', socket.handshake.auth?.memberToken ?? '');
    if (!socket.data.caller.user && !socket.data.caller.member) return next(new Error('Unauthorized'));
    next();
  });
  io.on('connection', (socket) => handleConnection(io, socket));
  return io;
}
