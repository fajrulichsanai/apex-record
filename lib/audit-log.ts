import { API_BASE, apiClient, toQueryString } from './api-client';

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW' | 'ALERT';
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


export const auditLogApi = {
  list: (query?: AuditLogQuery) =>
    apiClient.get<AuditLogListResponse>(`/audit-logs?${toQueryString(query || {})}`),

  get: (id: number) => apiClient.get<AuditLogEntry>(`/audit-logs/${id}`),

  // Fetched as a blob (session cookie rides along) so the caller controls the
  // download filename and can surface errors.
  exportCsv: async (query?: AuditLogQuery) => {
    const res = await fetch(`${API_BASE}/audit-logs/export?${toQueryString(query || {})}`);
    if (!res.ok) throw new Error('Gagal mengekspor log');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
