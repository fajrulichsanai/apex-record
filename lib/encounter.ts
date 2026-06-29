import { apiClient } from './api-client';

export type EncounterStatus = 'arrived' | 'in_progress' | 'finished' | 'cancelled';
export type ServiceType = 'outpatient';
export type SatusehatSyncStatus = 'pending' | 'synced' | 'failed';

export interface EncounterListItem {
  encounterId: number;
  patientId: number;
  patientName?: string;
  noRM?: string;
  practitionerName?: string;
  status: EncounterStatus;
  serviceType: string;
  chiefComplaint?: string;
  arrivedTime: string;
  inProgressTime?: string;
  finishedTime?: string;
  satusehatSyncStatus?: SatusehatSyncStatus;
}

export interface EncounterListResponse {
  data: EncounterListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface EncounterDetail {
  id: number;
  clinicId: number;
  patientId: number;
  practitionerId: number;
  locationId: number;
  queueId?: number;
  serviceType: ServiceType;
  chiefComplaint?: string;
  status: EncounterStatus;
  cancelledReason?: string;
  arrivedTime: string;
  inProgressTime?: string;
  finishedTime?: string;
  satusehatEncounterId?: string;
  syncStatus: SatusehatSyncStatus;
  syncError?: string;
  lastSyncAt?: string;
  patient?: { id: number; name: string; noRm: string };
  practitioner?: { id: number; name: string };
  location?: { id: number; name: string };
}

export interface CreateEncounterPayload {
  patientId: number;
  practitionerId: number;
  locationId?: number;
  queueId?: number;
  serviceType?: ServiceType;
  chiefComplaint?: string;
}

export interface UpdateEncounterStatusPayload {
  status: EncounterStatus;
  reason?: string;
}

export interface SyncResult {
  success: boolean;
  satusehatId?: string;
  error?: string;
}

export const encounterApi = {
  list: (query?: { date?: string; status?: EncounterStatus; practitionerId?: number; page?: number; limit?: number }) =>
    apiClient.get<EncounterListResponse>(
      '/encounters' +
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

  detail: (id: number) => apiClient.get<EncounterDetail>(`/encounters/${id}`),

  create: (payload: CreateEncounterPayload) =>
    apiClient.post<EncounterDetail>('/encounters', payload),

  updateStatus: (id: number, payload: UpdateEncounterStatusPayload) =>
    apiClient.patch<EncounterDetail>(`/encounters/${id}/status`, payload),

  syncToSatusehat: (id: number) =>
    apiClient.post<SyncResult>(`/satusehat/sync/encounter/${id}`),
};
