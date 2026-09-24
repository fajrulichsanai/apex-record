import { apiClient, toQueryString } from './api-client';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW';
export type AuditStatus = 'SUCCESS' | 'FAILED';

export interface AuditLogEntry {
  id: number;
  clinicId: number | null;
  actorId: number | null;
  actorName: string;
  actorRole: string;
  actionType: AuditActionType;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  status: AuditStatus;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogQuery {
  dateFrom?: string;
  dateTo?: string;
  actorId?: number;
  actionType?: AuditActionType;
  entityType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const auditLogApi = {
  list: (query?: AuditLogQuery) =>
    apiClient.get<AuditLogListResponse>(`/audit-logs?${toQueryString(query || {})}`),

  get: (id: number) => apiClient.get<AuditLogEntry>(`/audit-logs/${id}`),

  // Export needs the bearer token, so it can't be a plain <a href> link — fetch
  // it as an authenticated blob and hand back a download URL for the caller.
  exportCsv: async (query?: AuditLogQuery) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_URL}/audit-logs/export?${toQueryString(query || {})}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Gagal mengekspor log');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
