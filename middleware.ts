import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultRouteForRole } from '@/lib/permissions';
import type { UserRole } from '@/types/user';
import { BRANCH_COOKIE, routeNeedsBranch } from '@/lib/branch';

// `role` is a plain, non-httpOnly cookie mirroring the logged-in user's role
// (set in lib/auth-context.tsx). It is NOT a security boundary — it's only
// used here to redirect away from /super-admin/* before the page renders, as
// a UX/defense-in-depth layer. Real authorization is enforced server-side on
// every API call (JWT + RolesGuard/SubscriptionGuard in the backend), so a
// user tampering with this cookie gains no actual access.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/super-admin')) {
    const role = request.cookies.get('role')?.value;
    if (role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = role ? defaultRouteForRole(role as UserRole) : '/';
      return NextResponse.redirect(url);
    }
    // Halaman lama yang kini menjadi tab (PRD Super Admin KL-04, KL-05, OC-03).
    const legacy = superAdminRedirect(pathname);
    if (legacy) {
      const url = request.nextUrl.clone();
      url.pathname = legacy.pathname;
      url.search = legacy.search;
      return NextResponse.redirect(url);
    }
  }

  // Super Admin mengelola pengguna dari panelnya sendiri (PRD PG-03).
  if (pathname === '/user-management' && request.cookies.get('role')?.value === 'super_admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/super-admin/users';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/multi-klinik')) {
    const role = request.cookies.get('role')?.value;
    if (role !== 'multi_clinic_owner') {
      const url = request.nextUrl.clone();
      url.pathname = role ? defaultRouteForRole(role as UserRole) : '/';
      return NextResponse.redirect(url);
    }
  }

  // A Multi-Klinik Owner opens clinic pages only inside a chosen branch;
  // without one they'd only meet "Pilih cabang dulu" errors.
  const role = request.cookies.get('role')?.value;
  if (
    role === 'multi_clinic_owner' &&
    !request.cookies.get(BRANCH_COOKIE)?.value &&
    routeNeedsBranch(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/multi-klinik/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function superAdminRedirect(pathname: string): { pathname: string; search: string } | null {
  const ss = /^\/super-admin\/satusehat\/clinics\/(\d+)\/?$/.exec(pathname);
  if (ss) return { pathname: `/super-admin/clinics/${ss[1]}`, search: '?tab=satusehat' };
  if (pathname === '/super-admin/patient-migration') return { pathname: '/super-admin/clinics', search: '?pilih=migrasi' };
  if (pathname === '/super-admin/owner-codes') return { pathname: '/super-admin/clinics', search: '?tab=kode' };
  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
