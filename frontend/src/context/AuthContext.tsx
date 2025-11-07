import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAccessToken, login as loginService, logout as logoutService, refreshToken, isAccessTokenExpired } from '../services/auth';
import { apiFetch } from '../services/api';

type User = {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  roles?: string[];
  avatar?: string | null;
};

type AuthContextValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function tryRefreshAndFetch() {
      setLoading(true);
      try {
        const t = await refreshToken();
        if (mounted) {
          setToken(t);
          if (t) await fetchMe(t);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    (async () => {
      if (!token) {
        await tryRefreshAndFetch();
        return;
      }

      // if token exists but expired, try refresh first to avoid a 401
      if (isAccessTokenExpired(token)) {
        await tryRefreshAndFetch();
        return;
      }

      // token exists and appears valid -> fetch profile
      try {
        await fetchMe(token);
      } catch (e) {
        // if fetching fails, attempt refresh once
        await tryRefreshAndFetch();
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function fetchMe(accessToken: string | null) {
    if (!accessToken) return;
    try {
      // use the HttpClient which wraps apiFetch and returns parsed JSON/errors
      const client = (await import('../services/httpClient')).default;
      const data = await client.get('/auth/me/');
      setUser(data as any);
    } catch (e) {
      setUser(null);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const tokens = await loginService(email, password);
      setToken(tokens.access);
      await fetchMe(tokens.access);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutService();
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const client = (await import('../services/httpClient')).default;
      const data = await client.get('/auth/me/');
      setUser(data as any);
    } catch (e) {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
