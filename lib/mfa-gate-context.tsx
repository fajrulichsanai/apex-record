'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './auth-context';
import { setOnMfaSetupRequired } from './api-client';
import { useToast } from './toast-context';

export const MFA_ENFORCED_ROLES = ['super_admin', 'multi_clinic_owner', 'owner', 'admin'];
const EXEMPT_PATHS = ['/', '/keamanan', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * Routes an MFA-enforced-role user (SUPER_ADMIN/OWNER/ADMIN/MULTI_CLINIC_OWNER)
 * to /keamanan the moment MFA_SETUP_REQUIRED shows up — either from the login
 * response (handled directly in app/page.tsx) or, for an already-open session
 * whose role just became enforced, from any blocked API call caught here.
 */
export function MfaGateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { info } = useToast();
  const warnedRef = useRef(false);

  const redirectToSetup = () => {
    if (pathname === '/keamanan') return;
    if (!warnedRef.current) {
      warnedRef.current = true;
      info('Akun Anda wajib mengaktifkan verifikasi dua langkah (MFA) untuk melanjutkan.');
    }
    router.push('/keamanan');
  };

  useEffect(() => {
    setOnMfaSetupRequired(redirectToSetup);
    return () => setOnMfaSetupRequired(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (loading || !user) return;
    if (EXEMPT_PATHS.includes(pathname)) return;
    if (MFA_ENFORCED_ROLES.includes(user.role) && !user.mfaEnabled) {
      redirectToSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, pathname]);

  return <>{children}</>;
}
