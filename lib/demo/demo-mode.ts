import type { User } from '@/types/user';

/**
 * Demo mode: the real app screens, fed with fictional data generated in the
 * browser (lib/demo/mock-api.ts). Nothing reaches the backend — no demo
 * account exists server-side, so there is nothing to abuse or leak. The flag
 * lives in sessionStorage, so it ends with the tab and never touches a real
 * signed-in session in localStorage.
 */
const DEMO_FLAG = 'apex_demo';

export const DEMO_USER: User = {
  id: 900001,
  email: 'demo@apexrecord.id',
  name: 'drg. Demo Pratama',
  role: 'owner',
  clinicId: 900001,
  isActive: true,
  emailVerifiedAt: '2026-01-05T08:00:00.000Z',
  lastLoginAt: new Date().toISOString(),
  createdAt: '2026-01-05T08:00:00.000Z',
  // Owners must have MFA; the demo user "has" it so the MFA gate stays quiet.
  mfaEnabled: true,
};

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

export function enterDemoMode() {
  sessionStorage.setItem(DEMO_FLAG, '1');
}

export function exitDemoMode() {
  sessionStorage.removeItem(DEMO_FLAG);
}
