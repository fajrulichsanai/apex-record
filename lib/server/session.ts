import type { NextRequest, NextResponse } from 'next/server';

/**
 * Server-only helpers for the httpOnly session cookies used by the
 * /api/backend proxy. Page code never sees these values.
 */

/** The signed-in user's access token. */
export const SESSION_COOKIE = 'apex_session';
/** The Super Admin's own token, parked while they impersonate someone. */
export const IMPERSONATOR_COOKIE = 'apex_impersonator';

export const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001'
).replace(/\/+$/, '');

function isHttps(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol;
  return proto.replace(/:$/, '').split(',')[0].trim() === 'https';
}

/** Seconds until the JWT's `exp`, so the cookie dies with the token. */
function secondsUntilExpiry(token: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    ) as { exp?: number };
    if (payload.exp) return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    // Not a JWT we can read — fall back to the backend's default lifetime.
  }
  return 8 * 3600;
}

export function setTokenCookie(
  res: NextResponse,
  req: NextRequest,
  name: string,
  token: string,
) {
  res.cookies.set(name, token, {
    httpOnly: true,
    // Lax: sent on same-site requests and top-level navigation only, so other
    // sites can't make the browser POST to the proxy with this session.
    sameSite: 'lax',
    secure: isHttps(req),
    path: '/',
    maxAge: secondsUntilExpiry(token),
  });
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Revokes a token on the backend (best effort — it expires anyway). */
export async function revokeOnBackend(token: string | undefined) {
  if (!token) return;
  await fetch(`${BACKEND_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}
