import { apiClient, toQueryString } from './api-client';

export const RESOURCE_TYPES = [
  'Patient',
  'Encounter',
  'Condition',
  'Procedure',
  'Observation',
  'MedicationRequest',
  'MedicationDispense',
  'Practitioner',
  'Location',
] as const;

export type SatusehatResourceType = (typeof RESOURCE_TYPES)[number];

/** synced = sudah ada di SATUSEHAT, pending = belum dikirim/terdaftar, failed = gagal */
export type SyncState = 'synced' | 'pending' | 'failed';

export const RESOURCE_LABELS: Record<SatusehatResourceType, string> = {
  Patient: 'Pasien',
  Encounter: 'Kunjungan',
  Condition: 'Diagnosis',
  Procedure: 'Tindakan',
  Observation: 'Tanda Vital',
  MedicationRequest: 'Resep',
  MedicationDispense: 'Pengeluaran Obat',
  Practitioner: 'Tenaga Kesehatan',
  Location: 'Lokasi',
};

export const SYNC_STATE_LABELS: Record<SyncState, string> = {
  synced: 'Terverifikasi',
  pending: 'Belum dikirim',
  failed: 'Gagal',
};

export interface ResourceSummary {
  resourceType: SatusehatResourceType;
  label: string;
  syncable: boolean;
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

export interface SatusehatSummary {
  config: {
    configured: boolean;
    environment: 'sandbox' | 'production';
    organizationId: string | null;
    hasClientId: boolean;
    tokenValidUntil: string | null;
  };
  resources: ResourceSummary[];
  syncLogs: { success: number; failed: number; pending: number; lastSyncAt: string | null };
}

export interface ResourceRow {
  localId: number;
  title: string | null;
  subtitle: string | null;
  date: string | null;
  satusehatId: string | null;
  status: SyncState;
  lastError: string | null;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResourceList extends Paged<ResourceRow> {
  resourceType: SatusehatResourceType;
  label: string;
  syncable: boolean;
}

export interface SyncLog {
  id: number;
  resourceType: string;
  localId: number;
  satusehatId: string | null;
  operation: string;
  status: 'success' | 'failed' | 'pending';
  httpStatus: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

/** Satu langkah pengiriman kunjungan (urutan Playbook RME Rawat Jalan) */
export interface SyncStep {
  step: string;
  resourceType: string;
  localType: string;
  localId: number;
  status: 'success' | 'failed' | 'skipped';
  satusehatId?: string;
  message?: string;
}

export interface MedicationKfa {
  medicationId: number;
  name: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  kfaCode?: string | null;
}

export interface SatusehatConfigPayload {
  satusehatOrgId: string;
  satusehatClientId: string;
  satusehatClientSecret: string;
  satusehatEnvironment: 'sandbox' | 'production';
}

export const satusehatApi = {
  getSummary: () => apiClient.get<SatusehatSummary>('/satusehat/summary'),

  listResources: (
    type: SatusehatResourceType,
    query: { page?: number; limit?: number; status?: SyncState; search?: string },
  ) => apiClient.get<ResourceList>(`/satusehat/resources/${type}?${toQueryString(query)}`),

  listSyncLogs: (query: {
    page?: number;
    limit?: number;
    resourceType?: SatusehatResourceType;
    status?: SyncLog['status'];
  }) => apiClient.get<Paged<SyncLog>>(`/satusehat/sync-logs?${toQueryString(query)}`),

  getSyncLog: (id: number) => apiClient.get<SyncLog>(`/satusehat/sync-logs/${id}`),

  syncResource: (type: SatusehatResourceType, localId: number) =>
    apiClient.post<{ success: true; satusehatId?: string }>(
      `/satusehat/sync/${type}/${localId}`,
    ),

  /** Kirim seluruh data satu kunjungan, hasilnya laporan per langkah */
  syncEncounterFull: (encounterId: number) =>
    apiClient.post<{ success: boolean; steps: SyncStep[] }>(`/satusehat/encounters/${encounterId}/sync`),

  listMedications: (query: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<MedicationKfa[]>(`/medications?${toQueryString(query)}`),

  updateMedicationKfa: (id: number, kfaCode: string) =>
    apiClient.put<MedicationKfa>(`/medications/${id}`, { kfaCode }),

  processQueue: () =>
    apiClient.post<{ processed: number; succeeded: number; failed: number }>(
      '/satusehat/sync-queue/process',
    ),

  saveConfig: (payload: SatusehatConfigPayload) =>
    apiClient.post<{ satusehatOrgId: string; satusehatEnvironment: string; message: string }>(
      '/settings/clinic/satusehat',
      payload,
    ),

  testConnection: () =>
    apiClient.post<{ connected: boolean; environment: string; tokenExpiresAt?: string; message: string }>(
      '/settings/clinic/satusehat/test',
    ),
};
