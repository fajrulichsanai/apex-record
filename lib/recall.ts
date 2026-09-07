import { apiClient } from './api-client';

export type PatientRecallStatus = 'belum_dihubungi' | 'sudah_dihubungi' | 'sudah_booking_ulang';

export interface RecallInterval {
  id: number;
  clinicId: number;
  tarifId: number;
  intervalDays: number;
  tarif?: { id: number; name: string };
}

export interface PatientRecall {
  id: number;
  clinicId: number;
  patientId: number;
  tarifId: number | null;
  billingItemId: number | null;
  dueDate: string;
  status: PatientRecallStatus;
  contactedAt: string | null;
  contactedBy: number | null;
  notes: string | null;
  createdAt: string;
  patient?: { id: number; name: string; phone?: string; noRm?: string };
  tarif?: { id: number; name: string } | null;
}

export interface PatientRecallListResponse {
  data: PatientRecall[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PatientRecallQuery {
  status?: PatientRecallStatus;
  page?: number;
  limit?: number;
}

function toQueryString(query?: PatientRecallQuery) {
  if (!query) return '';
  const params = new URLSearchParams(
    Object.entries(query as unknown as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const recallIntervalApi = {
  list: () => apiClient.get<RecallInterval[]>('/recall-intervals'),

  upsert: (tarifId: number, intervalDays: number) =>
    apiClient.put<RecallInterval>(`/recall-intervals/${tarifId}`, { intervalDays }),

  remove: (tarifId: number) => apiClient.delete<{ success: boolean }>(`/recall-intervals/${tarifId}`),
};

export const patientRecallApi = {
  list: (query?: PatientRecallQuery) =>
    apiClient.get<PatientRecallListResponse>(`/patient-recalls${toQueryString(query)}`),

  update: (id: number, payload: { status?: PatientRecallStatus; dueDate?: string }) =>
    apiClient.patch<PatientRecall>(`/patient-recalls/${id}`, payload),
};
