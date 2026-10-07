import { Session } from '../models/Session.js';
import { HttpError, requireObjectBody } from '../errors.js';
import { canControl, loadSessionForCaller } from '../sessionAccess.js';
import { emitToSession } from '../socket.js';

const controlActions = ['start', 'pause', 'resume', 'next', 'prev', 'jump', 'seek', 'end'];

function readControlBody(body) {
  requireObjectBody(body);
  if (!controlActions.includes(body.action)) throw new HttpError(400, `action must be one of ${controlActions.join(', ')}`);
  if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0) throw new HttpError(400, 'expectedVersion must be a whole number');
  if (body.itemIdx !== undefined && !Number.isInteger(body.itemIdx)) throw new HttpError(400, 'itemIdx must be a whole number');
  if (body.action === 'jump' && body.itemIdx === undefined) throw new HttpError(400, 'jump needs itemIdx');
  if (body.action === 'seek' && !(Number.isFinite(body.offsetMs) && body.offsetMs >= 0)) throw new HttpError(400, 'seek needs a non-negative offsetMs');
  return body;
}

function targetItem(command, state) {
  const baseIdx = command.itemIdx ?? state.itemIdx;
  if (command.action === 'next') return baseIdx + 1;
  if (command.action === 'prev') return baseIdx - 1;
  return baseIdx;
}

function playStateAfterMove(state) {
  return state.playState === 'paused' ? 'paused' : 'playing';
}

function moveTo(command, state, itemCount, anchorServerMs) {
  const itemIdx = targetItem(command, state);
  if (itemIdx < 0 || itemIdx >= itemCount) throw new HttpError(400, 'There is no song at that position');
  const anchorOffsetMs = command.action === 'seek' ? command.offsetMs : 0;
  return { playState: playStateAfterMove(state), itemIdx, anchorServerMs, anchorOffsetMs };
}

export function nextState(command, state, now, startLeadMs, itemCount) {
  const anchorServerMs = now + startLeadMs;
  switch (command.action) {
    case 'start':
      return { playState: 'playing', itemIdx: 0, anchorServerMs, anchorOffsetMs: 0 };
    case 'pause':
      if (state.playState !== 'playing') throw new HttpError(409, 'Only a playing session can pause');
      return { playState: 'paused', anchorOffsetMs: state.anchorOffsetMs + Math.max(0, now - state.anchorServerMs) };
    case 'resume':
      if (state.playState !== 'paused') throw new HttpError(409, 'Only a paused session can resume');
      return { playState: 'playing', anchorServerMs };
    case 'end':
      return { playState: 'ended' };
    default:
      return moveTo(command, state, itemCount, anchorServerMs);
  }
}

function stateUpdate(fields, ended) {
  const set = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`state.${key}`, value]));
  if (ended) set.endedAt = new Date();
  return { $set: set, $inc: { 'state.version': 1 } };
}

export async function controlSession(req, res) {
  const command = readControlBody(req.body);
  const { session } = await loadSessionForCaller(req);
  if (!canControl(session, req)) throw new HttpError(403, 'You cannot control playback in this session');
  if (session.endedAt) throw new HttpError(409, 'This session has ended');
  if (session.state.version !== command.expectedVersion) throw new HttpError(409, 'Someone else changed playback first');
  const fields = nextState(command, session.state, Date.now(), session.settings.startLeadMs, session.snapshot.length);
  const updated = await Session.findOneAndUpdate(
    { _id: session._id, endedAt: null, 'state.version': command.expectedVersion },
    stateUpdate(fields, command.action === 'end'),
    { returnDocument: 'after' }
  );
  if (!updated) throw new HttpError(409, 'Someone else changed playback first');
  const io = req.app.get('io');
  emitToSession(io, updated._id, 'state', updated.state);
  if (command.action === 'end') emitToSession(io, updated._id, 'ended', { endedAt: updated.endedAt });
  res.json(updated.state);
}
