import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LoginResponse, User } from '../types';
import { apiLogin, apiMe } from '../api/auth';

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  loading: false,
  login: async () => {},
  logout: () => {},
  refreshMe: async () => {},
  hasRole: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const saveToken = (t: string | null) => {
    setToken(t);
    if (t) localStorage.setItem('token', t);
    else localStorage.removeItem('token');
  };

  const refreshMe = async () => {
    if (!token) { setUser(null); return; }
    try {
      const me = await apiMe(token);
      setUser(me || null);
    } catch {
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res: LoginResponse = await apiLogin(email, password);
      saveToken(res.accessToken);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    saveToken(null);
    setUser(null);
  };

  useEffect(() => { refreshMe(); /* eslint-disable-line */ }, [token]);

  const hasRole = (r: string) => {
    const want = String(r).toUpperCase();
    const mine = (user?.roles ?? []).map((x) => String(x).toUpperCase());
    return mine.includes(want);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refreshMe, hasRole }),
    [user, token, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
