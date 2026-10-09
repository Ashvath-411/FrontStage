import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, sessionTokens } from '../api.js';
import { keepNewestState, openSessionConnection } from '../sessionConnection.js';

export function useSession(sessionId) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [kicked, setKicked] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const fresh = await api.getSession(sessionId);
      setSession((current) => keepNewestState(current, fresh));
      setError(null);
    } catch (problem) {
      setError(problem);
    }
  }, [sessionId]);

  useEffect(() => {
    const createSocket = () => io({ auth: sessionTokens(sessionId) });
    return openSessionConnection(sessionId, createSocket, { refetch, setSession, setConnected, setKicked });
  }, [sessionId, refetch]);

  return { session, setSession, error, connected, kicked, refetch };
}
