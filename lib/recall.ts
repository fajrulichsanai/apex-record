import { apiClient } from './api-client';

/** Jenis kontrol di Follow Up Pasien. */
export const RECALL_KINDS = ['kunjungan', 'behel', 'saluran_akar', 'perawatan'] as const;
export type RecallKind = (typeof RECALL_KINDS)[number];

export const RECALL_KIND_LABEL: Record<RecallKind, string> = {
  kunjungan: 'Kontrol kunjungan',
  behel: 'Kontrol behel',
  saluran_akar: 'Kontrol perawatan saluran akar',
  perawatan: 'Kontrol perawatan',
};

/** Tebakan jenis kontrol dari teks tindakan/rencana (mis. isi template); dokter tetap bisa mengubah. */
export function suggestRecallKind(text: string): RecallKind {
  const t = text.toLowerCase();
  if (/behel|bracket|ortodon|ortho|aligner|kawat gigi/.test(t)) return 'behel';
  if (/saluran akar|\bpsa\b|pulpektomi|pulpotomi|endodon/.test(t)) return 'saluran_akar';
  if (/tambal|cabut|ekstraksi|scaling|odontektomi|gingivektomi|pulp capping|tumpat/.test(t)) return 'perawatan';
  return 'kunjungan';
}

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
  kind: RecallKind;
  dueDate: string;
  status: PatientRecallStatus;
  contactedAt: string | null;
  contactedBy: number | null;
  notes: string | null;
  createdAt: string;
  patient?: { id: number; name: string; phone?: string; noRm?: string };
  tarif?: { id: number; name: string } | null;
  upcomingReservation: { id: number; reservationDate: string } | null;
}

export interface PatientRecallListResponse {
  data: PatientRecall[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PatientRecallQuery {
  status?: PatientRecallStatus;
  kind?: RecallKind;
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

  create: (payload: { patientId: number; dueDate: string; kind?: RecallKind; booked?: boolean; notes?: string }) =>
    apiClient.post<PatientRecall>('/patient-recalls', payload),

  update: (id: number, payload: { status?: PatientRecallStatus; dueDate?: string }) =>
    apiClient.patch<PatientRecall>(`/patient-recalls/${id}`, payload),
};
