import type { NextConfig } from "next";
import { execSync } from "child_process";

// Identifies this build. When it changes, Next.js (version-skew protection)
// turns navigations from tabs opened before the deploy into full page loads,
// so nobody keeps running the previous release until they hard-refresh.
function buildId(): string {
  if (process.env.DEPLOYMENT_ID) return process.env.DEPLOYMENT_ID;
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return `build-${Date.now()}`;
  }
}

const nextConfig: NextConfig = {
  // The deploy builds into a separate directory and swaps it in just before
  // the restart (see .github/workflows/deploy-vps.yml), so the running server
  // never serves a half-overwritten .next during `npm run build`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  deploymentId: buildId(),
  experimental: {
    // Pages here render per-user data fetched on mount; don't let the client
    // router reuse a previously visited page for minutes (default: 5 min).
    staleTimes: { dynamic: 0, static: 30 },
  },
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
