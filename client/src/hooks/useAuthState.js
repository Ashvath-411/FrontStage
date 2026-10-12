import { useEffect, useState } from 'react';
import { api, hostToken } from '../api.js';

export function useAuthState() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(hostToken.get()));

  useEffect(() => {
    if (!hostToken.get()) return;
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => hostToken.set(null))
      .finally(() => setChecking(false));
  }, []);

  async function signIn(mode, fields) {
    const data = mode === 'register' ? await api.register(fields) : await api.login(fields);
    hostToken.set(data.token);
    setUser(data.user);
    return data.user;
  }

  function signOut() {
    hostToken.set(null);
    setUser(null);
  }

  return { user, checking, signIn, signOut };
}
