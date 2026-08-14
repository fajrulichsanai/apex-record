const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Resolves a backend-relative path (e.g. `/uploads/...`) to a full URL. */
export function apiFileUrl(path: string) {
  return `${API_URL}${path}`;
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  // FormData bodies must NOT get an explicit Content-Type — the browser sets
  // its own multipart boundary. Only set it for JSON bodies.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body: ApiEnvelope<T> = await res.json();

  if (!res.ok || (body.success === false)) {
    const code = body?.error?.code;
    if (code === 'SUBSCRIPTION_EXPIRED') {
      onSubscriptionExpired?.();
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
