import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Session } from '../models/Session.js';
import { Setlist } from '../models/Setlist.js';
import { Song } from '../models/Song.js';
import { User } from '../models/User.js';
import { requireHost, requireHostOrMember } from '../auth.js';
import { HttpError, pickFields, requireObjectBody } from '../errors.js';
import { buildSnapshot } from '../snapshot.js';
import { generateCode } from '../code.js';
import { hostPid, loadSessionForCaller, loadSessionForHost } from '../sessionAccess.js';
import { emitParticipants, emitToSession, removeMemberSockets } from '../socket.js';
import { findOwned } from './ownership.js';
import { joinSession } from './sessionJoin.js';
import { controlSession } from './sessionControl.js';
import { sessionView, settingsView } from './sessionViews.js';

export const sessionsRouter = Router();

const settingKeys = ['nextUpSeconds', 'autoAdvance', 'startLeadMs', 'showLyrics', 'showAnnotations', 'audioClick'];
const editableFields = ['maxParticipants', 'locked', 'allowLateJoin', 'controllerPolicy'];

async function snapshotForSetlist(setlistId, userId) {
  const setlist = await findOwned(Setlist, setlistId, userId);
  const songs = await Song.find({ _id: { $in: setlist.items.map((item) => item.songId) } }).lean();
  return { setlist, snapshot: buildSnapshot(setlist, songs) };
}

async function uniqueCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateCode();
    if (!(await Session.exists({ code }))) return code;
  }
  throw new HttpError(500, 'Could not create a unique code');
}

function settingsUpdate(settings) {
  if (settings === undefined) return {};
  requireObjectBody(settings);
  const known = settingKeys.filter((key) => settings[key] !== undefined);
  return Object.fromEntries(known.map((key) => [`settings.${key}`, settings[key]]));
}

async function hashSessionPassword(password) {
  if (typeof password !== 'string' || password.length > 100) throw new HttpError(400, 'Password must be text of up to 100 characters');
  return password ? bcrypt.hash(password, 10) : undefined;
}

sessionsRouter.post('/join', joinSession);

sessionsRouter.post('/', requireHost, async (req, res) => {
  const body = requireObjectBody(req.body);
  const { setlist, snapshot } = await snapshotForSetlist(body.setlistId, req.user.id);
  const host = await User.findById(req.user.id);
  if (!host) throw new HttpError(401, 'Account not found');
  const session = new Session({
    ...pickFields(body, editableFields),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : setlist.name,
    code: await uniqueCode(),
    hostId: host._id,
    setlistId: setlist._id,
    snapshot,
    participants: [{ pid: hostPid(host._id), userId: host._id, displayName: host.displayName, instrument: host.defaultInstrument, isController: true }]
  });
  session.set(settingsUpdate(body.settings));
  if (body.password !== undefined) session.passwordHash = await hashSessionPassword(body.password);
  await session.save();
  res.status(201).json({ id: String(session._id), code: session.code });
});

sessionsRouter.get('/', requireHost, async (req, res) => {
  const sessions = await Session.find({ hostId: req.user.id, endedAt: null }).sort({ createdAt: -1 }).limit(20).lean();
  res.json(sessions.map((session) => ({
    id: String(session._id),
    name: session.name,
    code: session.code,
    playState: session.state.playState,
    memberCount: session.participants.filter((participant) => !participant.kicked).length - 1,
    createdAt: session.createdAt
  })));
});

sessionsRouter.get('/:id', requireHostOrMember, async (req, res) => {
  const { session } = await loadSessionForCaller(req);
  res.json(sessionView(session.toObject(), req));
});

sessionsRouter.patch('/:id', requireHost, async (req, res) => {
  const session = await loadSessionForHost(req);
  const fields = pickFields(req.body, editableFields);
  session.set({ ...fields, ...settingsUpdate(req.body.settings) });
  if (req.body.password !== undefined) session.passwordHash = await hashSessionPassword(req.body.password);
  await session.save();
  emitToSession(req.app.get('io'), session._id, 'settings', settingsView(session.toObject()));
  res.json(sessionView(session.toObject(), req));
});

sessionsRouter.post('/:id/snapshot', requireHost, async (req, res) => {
  const session = await loadSessionForHost(req);
  const { snapshot } = await snapshotForSetlist(session.setlistId, req.user.id);
  session.snapshot = snapshot;
  await session.save();
  emitToSession(req.app.get('io'), session._id, 'snapshot', snapshot);
  res.json(snapshot);
});

sessionsRouter.post('/:id/control', requireHostOrMember, controlSession);

sessionsRouter.patch('/:id/participants/:pid', requireHost, async (req, res) => {
  const session = await loadSessionForHost(req);
  const { pid } = req.params;
  const fields = pickFields(req.body, ['isController', 'kicked']);
  if (Object.values(fields).some((value) => typeof value !== 'boolean')) throw new HttpError(400, 'isController and kicked must be true or false');
  if (pid === hostPid(req.user.id)) throw new HttpError(400, 'The host cannot change their own seat');
  if (!session.participants.some((participant) => participant.pid === pid)) throw new HttpError(404, 'Participant not found');
  const update = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`participants.$.${key}`, value]));
  await Session.updateOne({ _id: session._id, 'participants.pid': pid }, { $set: update });
  const io = req.app.get('io');
  if (fields.kicked) await removeMemberSockets(io, session._id, pid, 'kicked');
  await emitParticipants(io, session._id);
  const updated = await Session.findById(session._id);
  res.json(sessionView(updated.toObject(), req).participants);
});

sessionsRouter.post('/:id/leave', requireHostOrMember, async (req, res) => {
  if (!req.member || req.member.sid !== req.params.id) throw new HttpError(403, 'Only a member can leave');
  const io = req.app.get('io');
  await Session.updateOne({ _id: req.params.id }, { $pull: { participants: { pid: req.member.pid, kicked: false } } });
  await removeMemberSockets(io, req.params.id, req.member.pid);
  await emitParticipants(io, req.params.id);
  res.status(204).end();
});
