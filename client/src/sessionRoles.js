export function findMe(session) {
  return session.participants.find((participant) => participant.pid === session.me.pid) ?? null;
}

export function callerCanControl(session) {
  if (session.me.isHost) return true;
  const me = findMe(session);
  if (!me) return false;
  if (session.controllerPolicy === 'everyone') return true;
  return session.controllerPolicy === 'selected' && me.isController;
}
