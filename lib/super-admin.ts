import { apiClient, downloadProtectedFile, toQueryString } from './api-client';
import type { Receipt, SuperAdminQueue } from '@/types/subscription';
import type { User, UserRole } from '@/types/user';

export interface AdminUserRow extends User {
  clinicName: string | null;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface RetentionRow {
  clinicId: number;
  clinicName: string;
  lastEndDate: string | null;
  deleteAfter: string | null;
  daysLeft: number | null;
  purgedAt: string | null;
}

export interface RetentionStatus {
  retentionDays: number;
  deleteAfter: string | null;
  daysLeft: number | null;
  purgedAt: string | null;
}

export const superAdminApi = {
  queue: () => apiClient.get<SuperAdminQueue>('/super-admin/reports/queue'),
  users: (query: { page?: number; limit?: number; role?: UserRole | ''; clinicId?: number; search?: string }) =>
    apiClient.get<Paged<AdminUserRow>>(`/users/search?${toQueryString(query)}`),
  retention: () => apiClient.get<RetentionRow[]>('/super-admin/data-retention'),
  postponeDeletion: (clinicId: number, days: number) =>
    apiClient.post<RetentionStatus>(`/super-admin/data-retention/${clinicId}/postpone`, { days }),
  purgeNow: (clinicId: number, confirmName: string) =>
    apiClient.post<{ clinicId: number; filesRemoved: number }>(`/super-admin/data-retention/${clinicId}/purge`, {
      confirmName,
    }),
  exportClinic: (clinicId: number) =>
    downloadProtectedFile(`/super-admin/clinics/${clinicId}/export`, `data-klinik-${clinicId}.zip`),
};

/** Unduh semua data & jadwal penghapusan dari sisi klinik (owner). */
export const clinicDataApi = {
  retention: () => apiClient.get<RetentionStatus>('/clinic-data/retention'),
  exportAll: () => downloadProtectedFile('/clinic-data/export', 'data-klinik.zip'),
};

export const receiptApi = {
  forClinic: (paymentId: number) => apiClient.get<Receipt>(`/subscription-payments/${paymentId}/receipt`),
  forOwner: (paymentId: number) => apiClient.get<Receipt>(`/multi-clinic/payments/${paymentId}/receipt`),
  /** Kuitansi PDF (sama dengan lampiran email). */
  downloadPdf: (paymentId: number, asOwner: boolean) =>
    downloadProtectedFile(
      asOwner ? `/multi-clinic/payments/${paymentId}/receipt.pdf` : `/subscription-payments/${paymentId}/receipt.pdf`,
      `kuitansi-${paymentId}.pdf`,
    ),
};
