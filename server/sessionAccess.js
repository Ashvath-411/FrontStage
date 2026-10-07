import { Session } from './models/Session.js';
import { HttpError } from './errors.js';

export function hostPid(userId) {
  return `host-${userId}`;
}

export function findCallerParticipant(session, caller) {
  if (caller.user && String(session.hostId) === String(caller.user.id)) {
    return session.participants.find((participant) => participant.pid === hostPid(caller.user.id)) ?? { pid: hostPid(caller.user.id) };
  }
  if (caller.member && caller.member.sid === String(session._id)) {
    return session.participants.find((participant) => participant.pid === caller.member.pid && !participant.kicked) ?? null;
  }
  return null;
}

export function isCallerHost(session, caller) {
  return Boolean(caller.user) && String(session.hostId) === String(caller.user.id);
}

export function canControl(session, caller) {
  if (isCallerHost(session, caller)) return true;
  const participant = findCallerParticipant(session, caller);
  if (!participant) return false;
  if (session.controllerPolicy === 'everyone') return true;
  return session.controllerPolicy === 'selected' && participant.isController;
}

export async function loadSessionForCaller(req) {
  const session = await Session.findById(req.params.id).select('+passwordHash');
  if (!session) throw new HttpError(404, 'Session not found');
  const participant = findCallerParticipant(session, req);
  if (!participant) throw new HttpError(403, 'You are not in this session');
  return { session, participant };
}

export async function loadSessionForHost(req) {
  const session = await Session.findById(req.params.id).select('+passwordHash');
  if (!session) throw new HttpError(404, 'Session not found');
  if (!isCallerHost(session, req)) throw new HttpError(403, 'Only the host can do this');
  return session;
}
