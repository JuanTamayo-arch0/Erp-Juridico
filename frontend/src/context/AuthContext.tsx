import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAccessToken, login as loginService, logout as logoutService, refreshToken } from '../services/auth';

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function tryRefresh() {
      setLoading(true);
      try {
        const t = await refreshToken();
        if (mounted) setToken(t);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (!token) tryRefresh();
    return () => {
      mounted = false;
    };
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const tokens = await loginService(email, password);
      setToken(tokens.access);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    logoutService();
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>{children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
