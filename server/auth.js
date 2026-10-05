import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

const developmentSecret = 'setlist-live-development-secret';

function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  return developmentSecret;
}

export function signHostToken(user) {
  return jwt.sign({ userId: String(user._id) }, jwtSecret(), { expiresIn: '30d' });
}

export function signMemberToken(sessionId, pid) {
  return jwt.sign({ sid: String(sessionId), pid }, jwtSecret(), { expiresIn: '2d' });
}

export function readToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret());
    if (payload.userId) return { user: { id: payload.userId } };
    if (payload.sid && payload.pid) return { member: { sid: payload.sid, pid: payload.pid } };
  } catch {
    return {};
  }
  return {};
}

export function readCaller(token, memberToken) {
  const fromMain = token ? readToken(token) : {};
  const fromMember = memberToken ? readToken(memberToken) : {};
  return { ...fromMain, ...(fromMember.member ? { member: fromMember.member } : {}) };
}

export function attachCaller(req, res, next) {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  Object.assign(req, readCaller(token, req.get('x-member-token') ?? ''));
  next();
}

export function requireHost(req, res, next) {
  if (!req.user) throw new HttpError(401, 'Log in as a host first');
  next();
}

export function requireHostOrMember(req, res, next) {
  if (!req.user && !req.member) throw new HttpError(401, 'Log in or join the session first');
  next();
}
