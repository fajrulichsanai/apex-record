import { isDemoMode } from './demo/demo-mode';

/**
 * Every backend call goes through the same-origin proxy in
 * app/api/backend/[...path]/route.ts. It attaches the access token from an
 * httpOnly cookie, so the token is never readable by page scripts (XSS).
 */
export const API_BASE = '/api/backend';

/** Resolves a backend-relative path (e.g. `/uploads/...`) to a URL the
 * browser can load; the session cookie rides along automatically. */
export function apiFileUrl(path: string) {
  return `${API_BASE}${path}`;
}

/** Stored file URLs are either absolute (S3) or backend-relative
 * (`/files/...` while the server stores uploads on its own disk). */
export function resolveFileUrl(url: string): string;
export function resolveFileUrl(url: string | null | undefined): string | null;
export function resolveFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? apiFileUrl(url) : url;
}

/**
 * Fetches a backend-hosted file (payment proofs, supporting-exam images) and
 * returns an object URL for it. Callers revoke the returned URL
 * (`URL.revokeObjectURL`) once done.
 */
export async function fetchProtectedFileUrl(path: string): Promise<string> {
  const res = await fetch(apiFileUrl(path));
  if (!res.ok) {
    throw new ApiError('Gagal memuat file', res.status);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Opens a backend-hosted authenticated file in a new tab. Opens the tab
 * synchronously (before the fetch) so browsers don't treat it as a blocked
 * popup, then navigates it to the fetched blob once ready.
 */
export async function openProtectedFile(path: string): Promise<void> {
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const url = await fetchProtectedFileUrl(path);
    if (win) win.location.href = url;
  } catch (err) {
    win?.close();
    throw err;
  }
}

export class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
}

// Set by SubscriptionGateProvider so a SUBSCRIPTION_EXPIRED response from any
// mutating request — anywhere in the app — can pop the renew modal without
// every page having to check subscription status itself.
let onSubscriptionExpired: (() => void) | null = null;

export function setOnSubscriptionExpired(handler: (() => void) | null) {
  onSubscriptionExpired = handler;
}

// Set by MfaGateProvider so an MFA_SETUP_REQUIRED response from any request
// — anywhere in the app — routes the user to the setup screen, covering an
// already-open session for a role that just became MFA-enforced (a fresh
// login/verify already gets mfaSetupRequired directly in its response).
let onMfaSetupRequired: (() => void) | null = null;

export function setOnMfaSetupRequired(handler: (() => void) | null) {
  onMfaSetupRequired = handler;
}

// Set by AuthProvider so a 401 from any request — a missing, invalid, or
// expired token — clears the stale session and bounces to login instead of
// leaving the user stuck on a protected page where every action now fails
// with a raw "unauthorized" error.
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** True once a user has logged in on this browser (the token itself lives in
 * an httpOnly cookie the page can't see; the cached profile marks a session). */
function hasSession() {
  return typeof window !== 'undefined' && !!localStorage.getItem('user');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isDemoMode()) {
    // Demo tab: answered in the browser with fictional data (lazy-loaded so
    // normal sessions never download it). Nothing is sent to the backend.
    const { demoRequest } = await import('./demo/mock-api');
    return demoRequest<T>(path, options);
  }
  // FormData bodies must NOT get an explicit Content-Type — the browser sets
  // its own multipart boundary. Only set it for JSON bodies.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  const body: ApiEnvelope<T> = await res.json();

  if (!res.ok || (body.success === false)) {
    const code = body?.error?.code;
    if (code === 'SUBSCRIPTION_EXPIRED') {
      onSubscriptionExpired?.();
    }
    if (code === 'MFA_SETUP_REQUIRED') {
      onMfaSetupRequired?.();
    }
    if (res.status === 401 && hasSession()) {
      // Only a *previously logged-in* session going 401 (token now invalid/
      // expired) should force a logout — a request made with no token at all
      // is handled by the page-level auth guard instead, so it doesn't loop
      // this handler before the user has ever logged in.
      onUnauthorized?.();
    }
    throw new ApiError(body?.error?.message || 'Terjadi kesalahan', res.status, code);
  }

  // Only unwrap `.data` for the explicit { success, data } envelope. Paginated
  // endpoints return `{ data, meta }` with no `success` field and must pass
  // through as-is, or callers expecting { data, meta } get a bare array instead.
  return (body.success === true && body.data !== undefined ? body.data : body) as T;
}

export function toQueryString(query: object) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(query as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};
