'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  /** True while a Super Admin is viewing the app as another user. */
  impersonating: boolean;
  startImpersonation: (token: string, user: User) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// Non-httpOnly, client-set cookie mirroring the logged-in role. This is NOT a
// security boundary — it's readable/writable by any script, so it only gives
// middleware.ts a cheap signal to redirect away from /super-admin/* before a
// page even renders. The real authorization boundary stays server-side (JWT +
// RolesGuard/SubscriptionGuard on every API call), regardless of this cookie.
function setRoleCookie(role: string | null) {
  if (typeof document === 'undefined') return;
  if (role) {
    document.cookie = `role=${role}; path=/; max-age=86400; samesite=lax`;
  } else {
    document.cookie = 'role=; path=/; max-age=0';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  // Hydrate from localStorage after mount only — avoids a server/client markup
  // mismatch, since localStorage doesn't exist during server rendering.
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(storedToken);
      setUser(parsedUser);
      setRoleCookie(parsedUser.role);
    }
    setImpersonating(!!sessionStorage.getItem('impersonator_token'));
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setRoleCookie(newUser.role);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('impersonator_token');
    sessionStorage.removeItem('impersonator_user');
    setRoleCookie(null);
    setToken(null);
    setUser(null);
    setImpersonating(false);
  };

  const startImpersonation = (newToken: string, newUser: User) => {
    if (token && user) {
      sessionStorage.setItem('impersonator_token', token);
      sessionStorage.setItem('impersonator_user', JSON.stringify(user));
    }
    login(newToken, newUser);
    setImpersonating(true);
  };

  const exitImpersonation = () => {
    const savedToken = sessionStorage.getItem('impersonator_token');
    const savedUser = sessionStorage.getItem('impersonator_user');
    sessionStorage.removeItem('impersonator_token');
    sessionStorage.removeItem('impersonator_user');
    setImpersonating(false);
    if (savedToken && savedUser) {
      login(savedToken, JSON.parse(savedUser));
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, impersonating, startImpersonation, exitImpersonation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
