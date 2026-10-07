import { apiClient, toQueryString } from './api-client';

/** pending = belum ada obat diserahkan/diberikan, partial = sebagian, done = semua */
export type PharmacyStatus = 'pending' | 'partial' | 'done';

export interface PharmacyQueueItem {
  encounterId: number;
  patientId: number;
  patientName: string | null;
  noRM: string | null;
  practitionerName: string | null;
  arrivedTime: string;
  encounterStatus: 'arrived' | 'in_progress' | 'finished';
  itemCount: number;
  dispensedCount: number;
  administeredCount: number;
  handledCount: number;
  drugNames: string[];
  pharmacyStatus: PharmacyStatus;
  reviewedAt: string | null;
}

export interface PharmacyQueueResponse {
  data: PharmacyQueueItem[];
  stats: { total: number; pending: number; partial: number; done: number };
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PharmacyQueueQuery {
  search?: string;
  status?: PharmacyStatus;
  from?: string;
  to?: string;
  practitionerId?: number;
  /** Semua resep satu pasien (tanggal diabaikan) */
  patientId?: number;
  page?: number;
  limit?: number;
}

export const pharmacyApi = {
  queue: (query: PharmacyQueueQuery) =>
    apiClient.get<PharmacyQueueResponse>(`/pharmacy/queue?${toQueryString(query)}`),
};
