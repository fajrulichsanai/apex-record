'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import type { User } from '@/types/user';
import { API_BASE, setOnUnauthorized } from './api-client';
import { DEMO_USER, exitDemoMode, isDemoMode } from './demo/demo-mode';
import { readActiveBranch, writeActiveBranch, type ActiveBranch } from './branch';

interface AuthState {
  /**
   * The user as the app should treat them. For a Multi-Klinik Owner inside a
   * branch this is that branch's owner (role `owner`, clinicId = branch), so
   * every existing role/feature check works unchanged; `account` keeps the
   * real account.
   */
  user: User | null;
  /** The signed-in account itself (real role), regardless of branch mode. */
  account: User | null;
  /** Multi-Klinik Owner: the branch being managed, or null for "Semua cabang". */
  branch: ActiveBranch | null;
  /** Multi-Klinik Owner: open a branch (full reload so no data from another branch lingers). */
  enterBranch: (branch: ActiveBranch, redirectTo?: string) => void;
  /** Multi-Klinik Owner: back to "Semua cabang". */
  exitBranch: (redirectTo?: string) => void;
  loading: boolean;
  /**
   * Records the signed-in user. The access token itself never reaches page
   * code: the /api/backend proxy stores it in an httpOnly cookie when the
   * login response passes through. Also used to refresh the cached
   * profile.
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
  const [branch, setBranch] = useState<ActiveBranch | null>(null);

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
      if (parsedUser.role === 'multi_clinic_owner') setBranch(readActiveBranch());
      else writeActiveBranch(null);
    }
    setImpersonating(!!sessionStorage.getItem('impersonator_user'));
    setLoading(false);
  }, []);

  const login = (newUser: User) => {
    localStorage.setItem('user', JSON.stringify(newUser));
    setRoleCookie(newUser.role);
    // A branch only means something to the account that chose it.
    if (newUser.role !== 'multi_clinic_owner' || (user && user.id !== newUser.id)) {
      writeActiveBranch(null);
      setBranch(null);
    }
    setUser(newUser);
  };

  const enterBranch = (next: ActiveBranch, redirectTo = '/dashboard') => {
    writeActiveBranch(next);
    window.location.assign(redirectTo);
  };

  const exitBranch = (redirectTo = '/multi-klinik/dashboard') => {
    writeActiveBranch(null);
    window.location.assign(redirectTo);
  };

  const clearLocalSession = () => {
    writeActiveBranch(null);
    setBranch(null);
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

  const activeBranch = user?.role === 'multi_clinic_owner' ? branch : null;
  // Memoised so effects depending on `user` don't re-run on every render.
  const effectiveUser = useMemo<User | null>(
    () => (user && activeBranch ? { ...user, role: 'owner', clinicId: activeBranch.id } : user),
    [user, activeBranch],
  );

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        account: user,
        branch: activeBranch,
        enterBranch,
        exitBranch,
        loading,
        login,
        logout,
        impersonating,
        startImpersonation,
        exitImpersonation,
      }}
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
