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
  'AllergyIntolerance',
  'ClinicalImpression',
  'CarePlan',
  'ServiceRequest',
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
  Observation: 'Observasi (pemeriksaan fisik, odontogram)',
  Condition: 'Kondisi (keluhan, riwayat, diagnosis)',
  Procedure: 'Tindakan',
  Medication: 'Obat (Medication)',
  MedicationRequest: 'Resep',
  AllergyIntolerance: 'Alergi',
  ClinicalImpression: 'Riwayat, rasional klinis & prognosis',
  CarePlan: 'Rencana rawat & instruksi medik',
  ServiceRequest: 'Rencana tindak lanjut',
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
  /** 'clinic' = kredensial klinik ini, 'env' = Kode Akses API dari env server */
  source: 'clinic' | 'env' | null;
  envAvailable: boolean;
  envOrganizationId: string | null;
  envEnvironment: 'sandbox' | 'production' | null;
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

/** SATUSEHAT Rekam Medis Elektronik (SSRME) — "RME Nasional" pasien */
export interface SsrmeConsentLink {
  verificationUrl: string;
  expiredAt: string | null;
}

export interface SsrmeRecordLink {
  shlinkUrl: string;
  expiredAt: string | null;
  partial: boolean;
  warnings: unknown[];
}

export const ssrmeApi = {
  /** Link persetujuan pasien (dibuka pasien lewat SATUSEHAT Mobile) */
  consent: (encounterId: number, emergency = false) =>
    apiClient.post<SsrmeConsentLink>(`/satusehat/ssrme/encounters/${encounterId}/consent`, { emergency }),
  /** Link SSRME untuk dokter; 409 CONSENT_REQUIRED bila pasien belum setuju */
  open: (encounterId: number) =>
    apiClient.post<SsrmeRecordLink>(`/satusehat/ssrme/encounters/${encounterId}/open`),
};

/** Onboarding SATUSEHAT: Autentikasi → Profil → Organization → Location → Practitioner → Patient */
export interface OnboardingItem {
  id: number;
  name: string;
  satusehatId: string | null;
  note?: string | null;
  /** NIK tersamar (mis. ***1234), null bila belum diisi */
  nikMasked?: string | null;
}

/** Pasien yang belum punya ID SATUSEHAT */
export interface OnboardingPendingPatient {
  id: number;
  name: string;
  birthDate: string | null;
  nikMasked: string | null;
  error: string | null;
}

export interface FixNikResult {
  id: number;
  name: string;
  satusehatId: string;
  nikMasked: string;
}

/** Alamat + kode wilayah (extension administrativeCode SATUSEHAT) */
export interface SatusehatAddress {
  line?: string | null;
  provinceCode?: string | null;
  provinceName?: string | null;
  cityCode?: string | null;
  cityName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  villageCode?: string | null;
  villageName?: string | null;
  rt?: string | null;
  rw?: string | null;
  postalCode?: string | null;
}

export type FacilityType = 'klinik_pratama' | 'klinik_utama' | 'tpmd' | 'tpmdg';

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  klinik_pratama: 'Klinik Pratama',
  klinik_utama: 'Klinik Utama',
  tpmd: 'Tempat Praktik Mandiri Dokter (TPMD)',
  tpmdg: 'Tempat Praktik Mandiri Dokter Gigi (TPMDG)',
};

export interface FacilityProfile extends SatusehatAddress {
  facilityType?: FacilityType | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  dept: 'Departemen / unit (dept)',
  team: 'Tim (team)',
  prov: 'Penyedia layanan kesehatan (prov)',
  other: 'Lainnya (other)',
};

export const CONTACT_PURPOSE_LABELS: Record<string, string> = {
  ADMIN: 'Administrasi',
  BILL: 'Penagihan',
  HR: 'SDM',
  PAYOR: 'Penjamin',
  PATINF: 'Informasi pasien',
  PRESS: 'Humas',
};

export const PHYSICAL_TYPE_LABELS: Record<string, string> = {
  si: 'Site (kompleks)',
  bu: 'Building (gedung)',
  wi: 'Wing (sayap gedung)',
  lvl: 'Level (lantai)',
  wa: 'Ward (bangsal)',
  ro: 'Room (ruangan)',
  area: 'Area',
};

export const DAY_LABELS: Record<string, string> = {
  mon: 'Sen',
  tue: 'Sel',
  wed: 'Rab',
  thu: 'Kam',
  fri: 'Jum',
  sat: 'Sab',
  sun: 'Min',
};

export interface SatusehatOrganization {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  type: string;
  active: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: SatusehatAddress | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPurpose: string | null;
  satusehatId: string | null;
  syncError: string | null;
  lastSyncAt: string | null;
}

export type OrganizationPayload = Omit<SatusehatOrganization, 'id' | 'satusehatId' | 'syncError' | 'lastSyncAt'>;

export interface LocationHours {
  days: string[];
  allDay?: boolean;
  opening?: string | null;
  closing?: string | null;
}

export interface OnboardingLocation {
  id: number;
  name: string;
  active: boolean;
  code: string | null;
  description: string | null;
  physicalType: string;
  parentLocationId: number | null;
  organizationId: number | null;
  phone: string | null;
  address: SatusehatAddress | null;
  latitude: number | null;
  longitude: number | null;
  hours: LocationHours | null;
  satusehatId: string | null;
  syncError: string | null;
}

export type LocationPayload = Omit<OnboardingLocation, 'id' | 'satusehatId' | 'syncError'>;

export interface OnboardingStatus {
  auth: {
    /** 'env' = Kode Akses API dari env server, 'clinic' = Konfigurasi klinik */
    source: 'env' | 'clinic' | null;
    environment: 'sandbox' | 'production' | null;
    organizationId: string | null;
    tokenValidUntil: string | null;
  };
  profile: FacilityProfile & { clinicName: string; verifiedName: string | null };
  organizations: SatusehatOrganization[];
  locations: OnboardingLocation[];
  practitioners: OnboardingItem[];
  patients: { total: number; linked: number; pending: OnboardingPendingPatient[] };
}

export interface OnboardingBatchResult {
  processed: number;
  succeeded: number;
  results: { id: number; name: string; satusehatId: string | null; error: string | null }[];
  skippedWithoutNik?: number;
}

export const onboardingApi = {
  status: () => apiClient.get<OnboardingStatus>('/satusehat/onboarding'),
  auth: () => apiClient.post<{ connected: boolean; tokenExpiresAt: string }>('/satusehat/onboarding/auth'),
  saveProfile: (profile: FacilityProfile) => apiClient.put<FacilityProfile>('/satusehat/onboarding/profile', profile),
  verifyOrganization: () =>
    apiClient.post<{ id: string; name: string | null; active: boolean }>('/satusehat/onboarding/organization/verify'),
  applyTemplate: () => apiClient.post<SatusehatOrganization[]>('/satusehat/onboarding/organizations/template'),
  saveOrganization: (id: number | null, payload: OrganizationPayload) =>
    id
      ? apiClient.put<SatusehatOrganization>(`/satusehat/onboarding/organizations/${id}`, payload)
      : apiClient.post<SatusehatOrganization>('/satusehat/onboarding/organizations', payload),
  deleteOrganization: (id: number) => apiClient.delete<null>(`/satusehat/onboarding/organizations/${id}`),
  sendOrganization: (id: number) =>
    apiClient.post<SatusehatOrganization>(`/satusehat/onboarding/organizations/${id}/send`),
  saveLocation: (id: number | null, payload: LocationPayload) =>
    id
      ? apiClient.put<unknown>(`/satusehat/onboarding/locations/${id}`, payload)
      : apiClient.post<unknown>('/satusehat/onboarding/locations', payload),
  sendLocation: (id: number) =>
    apiClient.post<{ id: number; satusehatId: string }>(`/satusehat/onboarding/locations/${id}/send`),
  practitioners: () => apiClient.post<OnboardingBatchResult>('/satusehat/onboarding/practitioners'),
  patients: () => apiClient.post<OnboardingBatchResult>('/satusehat/onboarding/patients'),
  /** Simpan NIK (opsional — kosong = coba ulang) lalu langsung cocokkan ke SATUSEHAT */
  fixPractitioner: (id: number, nik?: string) =>
    apiClient.post<FixNikResult>(`/satusehat/onboarding/practitioners/${id}/nik`, nik ? { nik } : {}),
  fixPatient: (id: number, nik?: string) =>
    apiClient.post<FixNikResult>(`/satusehat/onboarding/patients/${id}/nik`, nik ? { nik } : {}),
};
