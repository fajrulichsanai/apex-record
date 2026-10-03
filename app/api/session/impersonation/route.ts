import { NextRequest, NextResponse } from 'next/server';
import {
  IMPERSONATOR_COOKIE,
  SESSION_COOKIE,
  clearCookie,
  revokeOnBackend,
  setTokenCookie,
} from '@/lib/server/session';

/** Ends an impersonation: revokes the impersonation token and restores the
 * Super Admin's own session that the proxy parked when it started. */
export async function DELETE(req: NextRequest) {
  const impersonator = req.cookies.get(IMPERSONATOR_COOKIE)?.value;
  await revokeOnBackend(req.cookies.get(SESSION_COOKIE)?.value);

  if (!impersonator) {
    const res = NextResponse.json(
      { success: false, error: { code: 'NOT_IMPERSONATING', message: 'Tidak sedang impersonate' } },
      { status: 400 },
    );
    clearCookie(res, SESSION_COOKIE);
    return res;
  }

  const res = NextResponse.json({ success: true });
  setTokenCookie(res, req, SESSION_COOKIE, impersonator);
  clearCookie(res, IMPERSONATOR_COOKIE);
  return res;
}
