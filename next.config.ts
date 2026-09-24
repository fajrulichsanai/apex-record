import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Baseline security headers for every page and the /api proxy. The
        // /api routes are same-origin only now (they carry the session
        // cookie), so there is deliberately no Access-Control-Allow-Origin.
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
      {
        // Every page here is auth-gated and renders per-user data, so none
        // of it should sit in a browser/proxy cache — that's what was
        // showing users a stale screen until they hard-refreshed. Hashed
        // build assets under _next/static are excluded: their filename
        // already changes on every deploy, so they're safe to cache
        // indefinitely and shouldn't be forced to revalidate on every load.
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
