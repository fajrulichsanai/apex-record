import { apiClient, toQueryString } from './api-client';

export const RESOURCE_TYPES = [
  'Encounter',
  'Patient',
  'Procedure',
  'MedicationRequest',
  'Practitioner',
  'Location',
] as const;

/** Filter log (dicocokkan sebagai awalan resource_type di server) */
export const LOG_RESOURCE_TYPES = [
  'Patient',
  'Practitioner',
  'Location',
  'Encounter',
  'Observation',
  'Condition',
  'Procedure',
  'Medication',
  'MedicationRequest',
] as const;
export type LogResourceType = (typeof LOG_RESOURCE_TYPES)[number];

export type SatusehatResourceType = (typeof RESOURCE_TYPES)[number];

/** synced = sudah ada di SATUSEHAT, pending = belum dikirim/terdaftar, failed = gagal */
export type SyncState = 'synced' | 'pending' | 'failed';

export const RESOURCE_LABELS: Record<SatusehatResourceType, string> = {
  Encounter: 'Kunjungan',
  Patient: 'Pasien',
  Procedure: 'Tindakan',
  MedicationRequest: 'Resep',
  Practitioner: 'Tenaga Kesehatan',
  Location: 'Lokasi',
};

export const LOG_RESOURCE_LABELS: Record<LogResourceType, string> = {
  Patient: 'Pasien',
  Practitioner: 'Tenaga Kesehatan',
  Location: 'Lokasi',
  Encounter: 'Kunjungan',
  Observation: 'Observasi (tanda vital, OHIS)',
  Condition: 'Diagnosis',
  Procedure: 'Tindakan',
  Medication: 'Obat (Medication)',
  MedicationRequest: 'Resep',
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

export interface SatusehatConfig {
  configured: boolean;
  organizationId: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  environment: 'sandbox' | 'production';
  poliLocationId: string | null;
  tokenValidUntil: string | null;
}

export interface SatusehatConfigPayload {
  organizationId: string;
  clientId: string;
  /** Kosongkan untuk mempertahankan secret yang tersimpan */
  clientSecret?: string;
  environment: 'sandbox' | 'production';
  poliLocationId?: string;
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
    resourceType?: LogResourceType;
    status?: SyncLog['status'];
  }) => apiClient.get<Paged<SyncLog>>(`/satusehat/sync-logs?${toQueryString(query)}`),

  syncResource: (type: SatusehatResourceType, localId: number) =>
    apiClient.post<{ success: true; satusehatId?: string }>(`/satusehat/sync/${type}/${localId}`),

  /** Kirim seluruh data satu kunjungan, hasilnya laporan per langkah */
  syncEncounterFull: (encounterId: number) =>
    apiClient.post<{ success: boolean; steps: SyncStep[] }>(`/satusehat/encounters/${encounterId}/sync`),

  processQueue: () =>
    apiClient.post<{ processed: number; succeeded: number; failed: number }>('/satusehat/sync-queue/process'),

  getConfig: () => apiClient.get<SatusehatConfig>('/satusehat/config'),

  saveConfig: (payload: SatusehatConfigPayload) => apiClient.put<SatusehatConfig>('/satusehat/config', payload),

  testConnection: () => apiClient.post<{ connected: boolean; tokenExpiresAt: string }>('/satusehat/config/test'),
};
