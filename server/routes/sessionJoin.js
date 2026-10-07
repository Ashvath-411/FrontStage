import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Session } from '../models/Session.js';
import { JoinAttempt } from '../models/JoinAttempt.js';
import { signMemberToken } from '../auth.js';
import { HttpError, requireObjectBody } from '../errors.js';
import { normalizeCode } from '../code.js';
import { emitParticipants } from '../socket.js';

const maxFailedAttempts = 5;

function readJoinBody(body) {
  requireObjectBody(body);
  const code = normalizeCode(body.code);
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  if (code.length !== 6) throw new HttpError(400, 'The code has 6 characters');
  if (!displayName || displayName.length > 40) throw new HttpError(400, 'Enter a name of up to 40 characters');
  if (body.instrument !== undefined && (typeof body.instrument !== 'string' || body.instrument.length > 20)) throw new HttpError(400, 'Instrument must be a short text');
  if (body.password !== undefined && typeof body.password !== 'string') throw new HttpError(400, 'Password must be text');
  return { code, displayName, instrument: body.instrument ?? '', password: body.password ?? '' };
}

async function checkPassword(session, password, callerKey) {
  const failedAttempts = await JoinAttempt.countDocuments({ sessionId: session._id, pid: callerKey });
  if (failedAttempts >= maxFailedAttempts) throw new HttpError(429, 'Too many wrong passwords. Try again in 10 minutes');
  if (await bcrypt.compare(password, session.passwordHash)) return;
  await JoinAttempt.create({ sessionId: session._id, pid: callerKey });
  throw new HttpError(401, 'Wrong session password');
}

function seatAvailableFilter(code) {
  const activeParticipants = { $filter: { input: '$participants', cond: { $not: ['$$this.kicked'] } } };
  return {
    code,
    endedAt: null,
    locked: false,
    $or: [{ allowLateJoin: true }, { 'state.playState': 'idle' }],
    $expr: { $lt: [{ $size: activeParticipants }, '$maxParticipants'] }
  };
}

async function whyJoinFailed(code) {
  const session = await Session.findOne({ code, endedAt: null }).lean();
  if (!session) return new HttpError(404, 'Session not found or already ended');
  if (session.locked) return new HttpError(403, 'The host has locked this session');
  if (!session.allowLateJoin && session.state.playState !== 'idle') return new HttpError(403, 'This session has started and late joining is off');
  return new HttpError(409, 'The session is full');
}

export async function joinSession(req, res) {
  const { code, displayName, instrument, password } = readJoinBody(req.body);
  const session = await Session.findOne({ code, endedAt: null }).select('+passwordHash');
  if (!session) throw new HttpError(404, 'Session not found or already ended');
  if (session.passwordHash) await checkPassword(session, password, req.ip);
  const participant = { pid: randomUUID(), displayName, instrument };
  const joined = await Session.findOneAndUpdate(seatAvailableFilter(code), { $push: { participants: participant } }, { returnDocument: 'after' });
  if (!joined) throw await whyJoinFailed(code);
  await emitParticipants(req.app.get('io'), joined._id);
  res.status(201).json({ sessionId: String(joined._id), token: signMemberToken(joined._id, participant.pid) });
}
