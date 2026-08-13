import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
      url.pathname = role ? '/dashboard' : '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
