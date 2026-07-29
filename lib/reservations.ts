import { apiClient, toQueryString } from './api-client';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type ReservationSource = 'website' | 'dashboard' | 'phone';

export interface ReservationItem {
  id: number;
  clinicId: number;
  patientId?: number;
  patientName: string;
  patientPhone: string;
  patientNik?: string;
  practitionerId?: number;
  practitioner?: { id: number; name: string };
  locationId?: number;
  serviceType?: string;
  reservationDate: string;
  jamSlot?: string;
  notes?: string;
  status: ReservationStatus;
  source: ReservationSource;
  token: string;
  cancelledReason?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface ReservationListResponse {
  data: ReservationItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateReservationPayload {
  patientId?: number;
  patientName: string;
  patientPhone: string;
  patientNik?: string;
  practitionerId?: number;
  serviceType?: string;
  reservationDate: string;
  jamSlot?: string;
  notes?: string;
}

export interface UpdateReservationStatusPayload {
  status: ReservationStatus;
  cancelledReason?: string;
}

export interface ReservationQuery {
  page?: number;
  limit?: number;
  date?: string;
  dateFrom?: string;
  status?: ReservationStatus;
  practitionerId?: number;
  locationId?: number;
  search?: string;
}

export const reservationsApi = {
  list: (query?: ReservationQuery) =>
    apiClient.get<ReservationListResponse>(
      '/reservations' + (query ? '?' + toQueryString(query) : ''),
    ),
  getOne: (id: number) => apiClient.get<ReservationItem>(`/reservations/${id}`),
  create: (payload: CreateReservationPayload) =>
    apiClient.post<ReservationItem>('/reservations', payload),
  updateStatus: (id: number, payload: UpdateReservationStatusPayload) =>
    apiClient.patch<ReservationItem>(`/reservations/${id}/status`, payload),
  linkPatient: (id: number, patientId: number) =>
    apiClient.patch<ReservationItem>(`/reservations/${id}/patient`, { patientId }),
  remove: (id: number) => apiClient.delete<void>(`/reservations/${id}`),
};
