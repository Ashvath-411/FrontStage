import { useEffect } from 'react';
import { memberToken } from '../api.js';
import { forgetJoinedSession, rememberJoinedSession } from '../recentSessions.js';

export function useJoinedSessionMemory(sessionId, session, problem) {
  const isMember = Boolean(session && !session.me.isHost && memberToken.get(sessionId));
  const name = session?.name;
  const code = session?.code;
  const ended = Boolean(session?.endedAt);

  useEffect(() => {
    if (isMember && !ended) rememberJoinedSession({ sessionId, name, code });
    if (isMember && ended) forgetJoinedSession(sessionId, { keepToken: true });
  }, [sessionId, isMember, name, code, ended]);

  useEffect(() => {
    if (problem) forgetJoinedSession(sessionId);
  }, [sessionId, problem]);
}
