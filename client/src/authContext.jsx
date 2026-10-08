import { createContext, useContext } from 'react';
import { useAuthState } from './hooks/useAuthState.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
