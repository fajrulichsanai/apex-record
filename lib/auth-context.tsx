'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from '@/types/user';
import { API_BASE, setOnUnauthorized } from './api-client';
import { DEMO_USER, exitDemoMode, isDemoMode } from './demo/demo-mode';

interface AuthState {
  user: User | null;
  loading: boolean;
  /**
   * Records the signed-in user. The access token itself never reaches page
   * code: the /api/backend proxy stores it in an httpOnly cookie when the
   * login/verify response passes through. Also used to refresh the cached
   * profile (e.g. after enabling MFA).
   */
  login: (user: User) => void;
  /** Ends the session server-side (token revoked) and clears local state. */
  logout: () => void;
  /** True while a Super Admin is viewing the app as another user. */
  impersonating: boolean;
  startImpersonation: (user: User) => void;
  exitImpersonation: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  // Hydrate from localStorage after mount only — avoids a server/client markup
  // mismatch, since localStorage doesn't exist during server rendering.
  useEffect(() => {
    // Tokens used to be kept here; drop any left over from before the move to
    // an httpOnly cookie (that session simply re-logs in on its next 401).
    localStorage.removeItem('token');
    sessionStorage.removeItem('impersonator_token');
    if (isDemoMode()) {
      // Demo tab: fictional owner, never persisted, no real session touched.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setRoleCookie(parsedUser.role);
    }
    setImpersonating(!!sessionStorage.getItem('impersonator_user'));
    setLoading(false);
  }, []);

  const login = (newUser: User) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    setRoleCookie(newUser.role);
    setUser(newUser);
  };

  const clearLocalSession = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('impersonator_user');
    setRoleCookie(null);
    setUser(null);
    setImpersonating(false);
  };

  const logout = () => {
    if (isDemoMode()) {
      exitDemoMode();
      setUser(null);
      window.location.href = '/landingpage';
      return;
    }
    // Revokes the token on the backend and clears the session cookies; local
    // state is cleared regardless so the UI never hangs on a network error.
    fetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
    clearLocalSession();
  };

  // Kept fresh every render so the module-level handler below (registered
  // once) always calls the current handler, without re-subscribing on every
  // render the way including it in the effect's deps would.
  const onUnauthorizedRef = useRef(clearLocalSession);
  useEffect(() => {
    onUnauthorizedRef.current = clearLocalSession;
  });

  useEffect(() => {
    // A 401 means the cookie is already invalid/expired: just drop it.
    setOnUnauthorized(() => {
      fetch('/api/session', { method: 'DELETE' }).catch(() => {});
      onUnauthorizedRef.current();
    });
    return () => setOnUnauthorized(null);
  }, []);

  // The proxy has already parked the Super Admin's own session cookie and
  // switched to the impersonation token when /auth/impersonate/:id returned.
  const startImpersonation = (newUser: User) => {
    if (user) {
      sessionStorage.setItem('impersonator_user', JSON.stringify(user));
    }
    login(newUser);
    setImpersonating(true);
  };

  const exitImpersonation = async () => {
    const savedUser = sessionStorage.getItem('impersonator_user');
    sessionStorage.removeItem('impersonator_user');
    setImpersonating(false);
    const res = await fetch('/api/session/impersonation', { method: 'DELETE' }).catch(() => null);
    if (res?.ok && savedUser) {
      login(JSON.parse(savedUser));
    } else {
      clearLocalSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, impersonating, startImpersonation, exitImpersonation }}
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
