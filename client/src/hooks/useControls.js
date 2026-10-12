import { useState } from 'react';
import { api } from '../api.js';

export function useControls(live) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function send(action, extra = {}) {
    if (!live.session || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const state = await api.control(live.session.id, { action, expectedVersion: live.session.state.version, ...extra });
      live.setSession((current) => (current && state.version >= current.state.version ? { ...current, state } : current));
    } catch (problem) {
      setMessage(problem.status === 409 ? 'Someone else pressed first. Updated.' : problem.message);
      live.refetch();
    } finally {
      setBusy(false);
    }
  }

  return { send, busy, message };
}
