import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LoginResponse, User } from '../types';
import { apiLogin, apiRegister } from '../api/auth';
import { apiMe } from '../api/users';

type AuthCtx = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const LS_TOKEN = 'irs_token';
const LS_USER = 'irs_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN));
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem(LS_USER);
    return s ? JSON.parse(s) as User : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Khi có token mà chưa có user hoặc muốn đồng bộ, gọi /users/me
    const bootstrap = async () => {
      if (token && !user) {
        setLoading(true);
        try {
          const me = await apiMe(token);
          setUser(me);
          localStorage.setItem(LS_USER, JSON.stringify(me));
        } catch {
          // token sai/hết hạn
          localStorage.removeItem(LS_TOKEN);
          localStorage.removeItem(LS_USER);
          setToken(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res: LoginResponse = await apiLogin(email, password);
      setToken(res.accessToken);
      setUser(res.user);
      localStorage.setItem(LS_TOKEN, res.accessToken);
      localStorage.setItem(LS_USER, JSON.stringify(res.user));
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      await apiRegister(name, email, password);
      // Sau khi đăng ký, đăng nhập luôn cho tiện
      await login(email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
  };

  const refreshMe = async () => {
    if (!token) return;
    const me = await apiMe(token);
    setUser(me);
    localStorage.setItem(LS_USER, JSON.stringify(me));
  };

  const hasRole = (role: string) => !!user?.roles?.includes(role);

  const value = useMemo<AuthCtx>(() => ({
    user, token, loading, login, register, logout, refreshMe, hasRole
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
