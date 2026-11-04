import { NextResponse } from 'next/server';

// Versi build yang sedang berjalan di server ini (sama dengan yang ditanam ke
// bundle browser lewat next.config.ts). VersionWatcher membandingkan keduanya:
// beda berarti server sudah di-deploy ulang dan tab ini masih memakai versi lama.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID ?? '' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
