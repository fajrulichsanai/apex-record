import { apiClient } from './api-client';

export type DataRequestType = 'export' | 'close_account';
export type DataRequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface DataRequest {
  id: number;
  clinicId: number;
  type: DataRequestType;
  reason: string | null;
  status: DataRequestStatus;
  adminNote: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDataRequest extends DataRequest {
  clinicName: string | null;
  requestedBy: { id: number; name: string; email: string } | null;
}

export const DATA_REQUEST_TYPE_LABEL: Record<DataRequestType, string> = {
  export: 'Ekspor data klinik',
  close_account: 'Tutup akun & hapus data',
};

export const DATA_REQUEST_STATUS_LABEL: Record<DataRequestStatus, string> = {
  pending: 'Menunggu',
  in_progress: 'Diproses',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

export const dataRequestsApi = {
  list: () => apiClient.get<DataRequest[]>('/data-requests'),
  create: (type: DataRequestType, reason?: string) =>
    apiClient.post<DataRequest>('/data-requests', { type, reason: reason || undefined }),
  adminList: (status?: DataRequestStatus) =>
    apiClient.get<AdminDataRequest[]>(`/super-admin/data-requests${status ? `?status=${status}` : ''}`),
  adminUpdate: (id: number, status: Exclude<DataRequestStatus, 'pending'>, adminNote?: string) =>
    apiClient.patch<DataRequest>(`/super-admin/data-requests/${id}`, { status, adminNote: adminNote || undefined }),
};
