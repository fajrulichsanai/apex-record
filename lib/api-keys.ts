import { apiClient, toQueryString } from './api-client';

export type ApiKeyType = 'publishable' | 'secret';

export interface ApiKeyRow {
  id: number;
  name: string;
  type: ApiKeyType;
  /** First 12 characters — enough to recognise a key, useless to call with. */
  keyPrefix: string;
  allowedOrigins: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** Only create/rotate return the full key, and only once. */
export interface ApiKeyWithSecret extends ApiKeyRow {
  key: string;
}

export interface ApiUsage {
  plan: string;
  subscriptionActive: boolean;
  limitPerDay: number;
  limitPerMinute: number;
  usedToday: number;
  remainingToday: number;
  daily: { date: string; count: number }[];
  byKey: { apiKeyId: number; count: number }[];
}

export interface ApiPractitioner {
  id: number;
  name: string;
  specialization: string | null;
  photoUrl: string | null;
  /** { senin: '08:00-14:00' | 'Tutup', ... }; null = follows the clinic's hours. */
  jadwalPraktik: Record<string, string> | null;
  isActive: boolean;
}

export interface CreateApiKeyPayload {
  name: string;
  type: ApiKeyType;
  allowedOrigins?: string[];
}

/** Super Admins act on a chosen clinic; owners are fixed to their own. */
const scoped = (path: string, clinicId?: number) => {
  const qs = toQueryString({ clinicId });
  return qs ? `${path}?${qs}` : path;
};

export const apiKeysApi = {
  list: (clinicId?: number) => apiClient.get<ApiKeyRow[]>(scoped('/settings/api/keys', clinicId)),
  create: (payload: CreateApiKeyPayload, clinicId?: number) =>
    apiClient.post<ApiKeyWithSecret>('/settings/api/keys', { ...payload, clinicId }),
  update: (id: number, payload: Partial<Pick<ApiKeyRow, 'name' | 'allowedOrigins'>>, clinicId?: number) =>
    apiClient.patch<ApiKeyRow>(scoped(`/settings/api/keys/${id}`, clinicId), payload),
  revoke: (id: number, clinicId?: number) => apiClient.post<ApiKeyRow>(scoped(`/settings/api/keys/${id}/revoke`, clinicId)),
  rotate: (id: number, clinicId?: number) =>
    apiClient.post<ApiKeyWithSecret>(scoped(`/settings/api/keys/${id}/rotate`, clinicId)),
  usage: (clinicId?: number) => apiClient.get<ApiUsage>(scoped('/settings/api/usage', clinicId)),

  practitioners: (clinicId?: number) =>
    apiClient.get<ApiPractitioner[]>(scoped('/settings/api/practitioners', clinicId)),
  setSchedule: (id: number, jadwalPraktik: Record<string, string> | null, clinicId?: number) =>
    apiClient.put<{ id: number; jadwalPraktik: Record<string, string> | null }>(
      scoped(`/settings/api/practitioners/${id}/schedule`, clinicId),
      { jadwalPraktik },
    ),
  uploadPhoto: (id: number, file: File, clinicId?: number) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postForm<{ id: number; photoUrl: string }>(
      scoped(`/settings/api/practitioners/${id}/photo`, clinicId),
      form,
    );
  },
};

/** Where third-party sites call the public API (not the /api/backend proxy).
 * NEXT_PUBLIC_API_URL is used only when it is a public https address — on the
 * server it can point at the backend's internal localhost port. */
const configuredApiUrl = process.env.NEXT_PUBLIC_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
export const PUBLIC_API_BASE = `${(
  /^https:\/\/(?!localhost|127\.)/.test(configuredApiUrl) ? configuredApiUrl : 'https://api.apexrecord.my.id'
).replace(/\/+$/, '')}/v1`;
