import { apiClient } from './api-client';

export type QueueStatus = 'waiting' | 'confirmed' | 'called' | 'done' | 'cancelled';

export interface QueueItem {
  id: number;
  clinicId: number;
  patientId?: number;
  practitionerId?: number;
  nomorAntrian: string;
  tanggal: string;
  jamSlot?: string;
  patientName?: string;
  phone?: string;
  chiefComplaint?: string;
  isFirstVisit?: boolean;
  status: QueueStatus;
  token?: string;
  cancelledReason?: string;
}

export interface QueueListResponse {
  data: QueueItem[];
  meta: { total: number; page: number; limit: number };
}

export interface CreateQueuePayload {
  patientId?: number;
  patientName?: string;
  phone?: string;
  chiefComplaint?: string;
  isFirstVisit?: boolean;
  practitionerId?: number;
  locationId?: number;
}

export interface UpdateQueueStatusPayload {
  status: QueueStatus;
  cancelledReason?: string;
}

export const queuesApi = {
  list: (query?: { date?: string; status?: QueueStatus; practitionerId?: number; locationId?: number }) =>
    apiClient.get<QueueListResponse>(
      '/queues' +
        (query
          ? '?' +
            new URLSearchParams(
              Object.entries(query).reduce((acc, [k, v]) => {
                if (v !== undefined && v !== null && v !== '') acc[k] = String(v);
                return acc;
              }, {} as Record<string, string>),
            ).toString()
          : ''),
    ),
  create: (payload: CreateQueuePayload) =>
    apiClient.post<QueueItem>('/queues', payload),
  updateStatus: (id: number, payload: UpdateQueueStatusPayload) =>
    apiClient.patch<QueueItem>(`/queues/${id}/status`, payload),
};
