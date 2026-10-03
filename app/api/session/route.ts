import { NextResponse } from 'next/server';
import { IMPERSONATOR_COOKIE, SESSION_COOKIE, clearCookie } from '@/lib/server/session';

/** Drops the session cookies after the backend has already rejected them
 * (401). A normal logout goes through POST /api/backend/auth/logout instead,
 * which also revokes the token server-side. */
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  clearCookie(res, SESSION_COOKIE);
  clearCookie(res, IMPERSONATOR_COOKIE);
  return res;
}
