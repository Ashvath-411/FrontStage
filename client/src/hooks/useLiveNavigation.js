import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { forgetJoinedSession } from '../recentSessions.js';

export function hasAppHistory(historyState) {
  return (historyState?.idx ?? 0) > 0;
}

export function useLiveNavigation(sessionId, session) {
  const navigate = useNavigate();
  const isHost = Boolean(session?.me.isHost);

  function back() {
    if (hasAppHistory(window.history.state)) navigate(-1);
    else navigate(isHost ? '/sessions' : '/');
  }

  async function leave() {
    if (isHost) return navigate('/sessions');
    await api.leaveSession(sessionId).catch(() => null);
    forgetJoinedSession(sessionId);
    return navigate('/', { replace: true });
  }

  return { back, leave };
}
