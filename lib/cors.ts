import { NextRequest, NextResponse } from 'next/server';

interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const defaultOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  maxAge: 86400,
};

export function corsHeaders(options: CorsOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return {
    'Access-Control-Allow-Origin': Array.isArray(opts.origin)
      ? opts.origin.join(', ')
      : opts.origin,
    'Access-Control-Allow-Methods': opts.methods?.join(', '),
    'Access-Control-Allow-Headers': opts.allowedHeaders?.join(', '),
    'Access-Control-Allow-Credentials': opts.credentials ? 'true' : 'false',
    'Access-Control-Max-Age': opts.maxAge?.toString(),
  };
}

export function handleCors(
  request: NextRequest,
  options: CorsOptions = {}
): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders(options),
    });
  }

  return null;
}

export function corsResponse(
  response: NextResponse,
  options: CorsOptions = {}
): NextResponse {
  Object.entries(corsHeaders(options)).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });
  return response;
}
