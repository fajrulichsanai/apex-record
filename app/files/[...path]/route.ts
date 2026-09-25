import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server/session';

/**
 * Public uploads passthrough: <this site>/files/* → backend /files/*.
 *
 * When uploads are stored on the API server's disk (no S3), /v1 responses
 * link doctor photos and clinic logos as <host>/files/...; this makes those
 * links work on hosts that reach the API through the /v1 passthrough. The
 * backend only serves its public upload folder here, and nothing about the
 * caller's session is sent.
 */

const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path: segments } = await ctx.params;
  if (segments.some((s) => s === '.' || s === '..' || s.includes('/'))) {
    return new NextResponse(null, { status: 404 });
  }
  const path = segments.map(encodeURIComponent).join('/');

  const headers = new Headers();
  for (const name of ['if-none-match', 'if-modified-since']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/files/${path}`, { headers, redirect: 'manual', cache: 'no-store' });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  const responseHeaders = new Headers({ 'cross-origin-resource-policy': 'cross-origin' });
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new NextResponse(upstream.status === 304 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const dynamic = 'force-dynamic';
