import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/server/session';

/**
 * Public API passthrough: <this site>/v1/* → backend /v1/*.
 *
 * Lets clinic websites reach the public API on a host that already has
 * HTTPS (e.g. staging, whose backend has no public domain of its own).
 * Unlike /api/backend it is stateless: no cookies or session token go
 * either way, only the API key. The backend does all the checking (key,
 * allowed domains, limits) and answers CORS itself, so those headers are
 * passed back untouched.
 */

const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'user-agent',
  'x-api-key',
  // The backend checks it against the key's registered domains.
  'origin',
  // CORS preflight.
  'access-control-request-method',
  'access-control-request-headers',
];

const FORWARD_RESPONSE_PREFIXES = ['access-control-', 'x-ratelimit-', 'x-quota-'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'vary', 'retry-after'];

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext) {
  const { path: segments } = await ctx.params;
  // Stay inside /v1: no dot segments that would resolve to other routes.
  if (segments.some((s) => s === '.' || s === '..' || s.includes('/'))) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });
  }
  const path = segments.map(encodeURIComponent).join('/');
  const method = req.method.toUpperCase();

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Only an API key may ride in Authorization — never a session token.
  const authorization = req.headers.get('authorization');
  if (authorization?.startsWith('Bearer apx_')) headers.set('authorization', authorization);
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);
  // So the backend builds file URLs (doctor photos) on this public host.
  headers.set('x-forwarded-host', req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host);
  headers.set('x-forwarded-proto', req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', ''));

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/v1/${path}${req.nextUrl.search}`, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : await req.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Server tidak dapat dihubungi' } },
      { status: 502, headers: { 'access-control-allow-origin': '*' } },
    );
  }

  const responseHeaders = new Headers({ 'cache-control': 'no-store' });
  upstream.headers.forEach((value, name) => {
    if (FORWARD_RESPONSE_HEADERS.includes(name) || FORWARD_RESPONSE_PREFIXES.some((p) => name.startsWith(p))) {
      responseHeaders.set(name, value);
    }
  });

  return new NextResponse(method === 'OPTIONS' || upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const OPTIONS = proxy;

export const dynamic = 'force-dynamic';
