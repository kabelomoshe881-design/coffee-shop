import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'ground-grain.staff.token';
const USER_KEY = 'ground-grain.staff.user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState(() => localStorage.getItem(USER_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (user, password) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.auth.login(user, password);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, data.staff.username);
      setToken(data.token);
      setUsername(data.staff.username);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      username,
      busy,
      error,
      isStaff: Boolean(token),
      login,
      logout,
      clearError: () => setError(null),
    }),
    [token, username, busy, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
