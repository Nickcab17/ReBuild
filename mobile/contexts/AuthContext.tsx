import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../services/storage';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  role: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, city: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      const savedToken = await storage.getToken();
      if (!savedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      const me = await api.getMe(savedToken);
      setToken(savedToken);
      setUser(me as User);
    } catch {
      await storage.clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    const nextToken = (response as any).token as string;
    await storage.setToken(nextToken);
    setToken(nextToken);
    setUser((response as any).user as User);
  };

  const register = async (name: string, email: string, password: string, city: string) => {
    const response = await api.register({ name, email, password, city });
    const nextToken = (response as any).token as string;
    await storage.setToken(nextToken);
    setToken(nextToken);
    setUser((response as any).user as User);
  };

  const logout = async () => {
    await storage.clearToken();
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!token) return;
    const me = await api.getMe(token);
    setUser(me as User);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, token, loading, login, register, logout, refreshProfile }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
