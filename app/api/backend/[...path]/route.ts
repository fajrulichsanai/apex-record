import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_URL,
  IMPERSONATOR_COOKIE,
  SESSION_COOKIE,
  clearCookie,
  revokeOnBackend,
  setTokenCookie,
} from '@/lib/server/session';

/**
 * Same-origin proxy to the NestJS API (backend-for-frontend).
 *
 * The browser never holds the access token: this handler reads it from an
 * httpOnly cookie and adds the Authorization header on the way to the
 * backend. Responses that mint a token (login, MFA verify, refresh,
 * impersonate) have it moved into the cookie and removed from the body.
 */

// Endpoints whose JSON response carries `data.accessToken`.
const TOKEN_ISSUING = new Set(['auth/login', 'auth/mfa/verify-login', 'auth/refresh']);

// Request headers worth forwarding. Everything else (cookies in particular)
// stays on this side of the proxy.
const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'accept-language', 'user-agent'];
const FORWARD_RESPONSE_HEADERS = [
  'content-type',
  'content-disposition',
  'cache-control',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'retry-after',
];

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext) {
  const { path: segments } = await ctx.params;
  const path = segments.map(encodeURIComponent).join('/');
  const method = req.method.toUpperCase();

  // CSRF defence in depth on top of SameSite=Lax: a state-changing request
  // must come from this site's own pages.
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const ownHosts = [req.headers.get('x-forwarded-host'), req.headers.get('host')];
    if (origin && !ownHosts.includes(new URL(origin).host)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Origin tidak diizinkan' } },
        { status: 403 },
      );
    }
  }

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Client IP as seen by the proxy in front of Next (nginx must set this; see
  // docs/SESSION.md). The backend only trusts it from TRUST_PROXY addresses.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionToken) headers.set('authorization', `Bearer ${sessionToken}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/${path}${req.nextUrl.search}`, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Server tidak dapat dihubungi' } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const isTokenIssuing =
    method === 'POST' && (TOKEN_ISSUING.has(path) || path.startsWith('auth/impersonate/'));
  const isLogout = method === 'POST' && path === 'auth/logout';

  if (!isTokenIssuing) {
    const res = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    if (isLogout) {
      clearCookie(res, SESSION_COOKIE);
      // Logging out mid-impersonation ends the Super Admin's session too.
      if (req.cookies.get(IMPERSONATOR_COOKIE)) {
        await revokeOnBackend(req.cookies.get(IMPERSONATOR_COOKIE)?.value);
        clearCookie(res, IMPERSONATOR_COOKIE);
      }
    }
    return res;
  }

  // Token-issuing endpoint: take the token out of the body into the cookie.
  const text = await upstream.text();
  let body: { data?: { accessToken?: string } } | null = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Non-JSON error page — pass it through unchanged below.
  }
  const accessToken = body?.data?.accessToken;
  if (!upstream.ok || !accessToken) {
    return new NextResponse(text, { status: upstream.status, headers: responseHeaders });
  }

  delete body!.data!.accessToken;
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  const res = new NextResponse(JSON.stringify(body), {
    status: upstream.status,
    headers: responseHeaders,
  });

  if (path.startsWith('auth/impersonate/')) {
    // Park the Super Admin's own token (unless already parked) so
    // /api/session/impersonation can switch back.
    if (sessionToken && !req.cookies.get(IMPERSONATOR_COOKIE)) {
      setTokenCookie(res, req, IMPERSONATOR_COOKIE, sessionToken);
    }
  } else if (path === 'auth/login' || path === 'auth/mfa/verify-login') {
    // A fresh login replaces any parked impersonation state.
    clearCookie(res, IMPERSONATOR_COOKIE);
  }
  setTokenCookie(res, req, SESSION_COOKIE, accessToken);
  return res;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

// Always run per request; never cache authenticated responses.
export const dynamic = 'force-dynamic';
