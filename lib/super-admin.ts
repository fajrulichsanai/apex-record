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

export interface AdminNote {
  id: number;
  body: string;
  followUpOn: string | null;
  doneAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface ClinicNotes {
  pic: { name: string | null; phone: string | null };
  notes: AdminNote[];
}

/** Catatan internal Super Admin per klinik (PIC, WhatsApp, tindak lanjut). */
export const clinicNotesApi = {
  get: (clinicId: number) => apiClient.get<ClinicNotes>(`/super-admin/clinics/${clinicId}/notes`),
  setPic: (clinicId: number, pic: { name: string; phone: string }) =>
    apiClient.put<ClinicNotes>(`/super-admin/clinics/${clinicId}/pic`, pic),
  add: (clinicId: number, body: string, followUpOn?: string) =>
    apiClient.post<ClinicNotes>(`/super-admin/clinics/${clinicId}/notes`, { body, followUpOn: followUpOn || undefined }),
  setDone: (clinicId: number, noteId: number, done: boolean) =>
    apiClient.patch<ClinicNotes>(`/super-admin/clinics/${clinicId}/notes/${noteId}`, { done }),
  remove: (clinicId: number, noteId: number) =>
    apiClient.delete<ClinicNotes>(`/super-admin/clinics/${clinicId}/notes/${noteId}`),
};

/** Ekspor CSV (PRD UP-08). */
export const csvExportApi = {
  clinics: () => downloadProtectedFile('/super-admin/export/clinics.csv', 'klinik.csv'),
  payments: (status?: string) =>
    downloadProtectedFile(`/super-admin/export/payments.csv?${toQueryString({ status })}`, 'pembayaran.csv'),
  auditLog: (q: { clinicId?: number; dateFrom?: string; dateTo?: string }) =>
    downloadProtectedFile(`/super-admin/export/audit-log.csv?${toQueryString(q)}`, 'log-aktivitas.csv'),
};
