import { participantsView } from '../socket.js';
import { canControl, findCallerParticipant, isCallerHost } from '../sessionAccess.js';

export function settingsView(session) {
  return {
    maxParticipants: session.maxParticipants,
    locked: session.locked,
    allowLateJoin: session.allowLateJoin,
    controllerPolicy: session.controllerPolicy,
    hasPassword: Boolean(session.passwordHash),
    settings: session.settings
  };
}

export function sessionView(session, caller) {
  return {
    id: String(session._id),
    code: session.code,
    name: session.name,
    snapshot: session.snapshot,
    state: session.state,
    endedAt: session.endedAt,
    ...settingsView(session),
    participants: participantsView(session),
    me: {
      pid: findCallerParticipant(session, caller)?.pid ?? null,
      isHost: isCallerHost(session, caller),
      canControl: canControl(session, caller)
    }
  };
}
