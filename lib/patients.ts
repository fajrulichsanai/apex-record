import { apiClient } from './api-client';

export type ApiGender = 'male' | 'female';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type SyncStatus = 'pending' | 'synced' | 'failed';
export type BloodType = 'A' | 'B' | 'AB' | 'O';
export type Rhesus = 'positive' | 'negative';
export type HubunganWali = 'ibu' | 'ayah' | 'wali';
export type SumberInformasi =
  | 'instagram'
  | 'tiktok'
  | 'google_maps'
  | 'facebook'
  | 'teman_keluarga'
  | 'lewat_depan_klinik'
  | 'brosur'
  | 'lainnya';
export type PreferensiKontak = 'whatsapp' | 'telepon' | 'email';
export type PreferensiJamKontak = 'pagi' | 'siang' | 'sore' | 'malam';

export interface Patient {
  id: number;
  clinicId: number;
  noRm: string;
  nik?: string;
  nikIbu?: string;
  namaWali?: string;
  hubunganWali?: HubunganWali;
  birthOrder?: number;
  name: string;
  birthDate?: string;
  gender: ApiGender;
  phone?: string;
  email?: string;
  pekerjaan?: string;
  address?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  maritalStatus?: MaritalStatus;
  sumberInformasi?: SumberInformasi;
  detailSumber?: string;
  kodeReferral?: string;
  referrerPatientId?: number;
  golonganDarah?: BloodType;
  rhesus?: Rhesus;
  punyaAlergi?: boolean;
  catatanAlergi?: string;
  preferensiKontak?: PreferensiKontak;
  preferensiJamKontak?: PreferensiJamKontak;
  catatanPreferensi?: string;
  consentMarketing?: boolean;
  consentTanggal?: string;
  consentVersion?: string;
  isMember?: boolean;
  memberId?: string;
  satusehatPatientId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPayload {
  name: string;
  gender: ApiGender;
  nik?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  pekerjaan?: string;
  address?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  maritalStatus?: MaritalStatus;
  isNewborn?: boolean;
  nikIbu?: string;
  namaWali?: string;
  hubunganWali?: HubunganWali;
  birthOrder?: number;
  sumberInformasi?: SumberInformasi;
  detailSumber?: string;
  kodeReferral?: string;
  referrerPatientId?: number;
  golonganDarah?: BloodType;
  rhesus?: Rhesus;
  punyaAlergi?: boolean;
  catatanAlergi?: string;
  preferensiKontak?: PreferensiKontak;
  preferensiJamKontak?: PreferensiJamKontak;
  catatanPreferensi?: string;
  consentMarketing?: boolean;
  consentTanggal?: string;
  consentVersion?: string;
  isMember?: boolean;
  memberId?: string;
}

export interface Encounter {
  id: number;
  status: string;
  serviceType: string;
  arrivedTime: string;
  finishedTime?: string;
}

export interface PatientQuery {
  search?: string;
  gender?: ApiGender;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const patientsApi = {
  list: (query?: PatientQuery) =>
    apiClient.get<Patient[]>(
      '/patients' +
        (query
          ? '?' +
            new URLSearchParams(
              Object.fromEntries(
                Object.entries(query).filter(([, v]) => v !== undefined && v !== '')
              ) as Record<string, string>
            ).toString()
          : '')
    ),

  get: (id: number) => apiClient.get<Patient>(`/patients/${id}`),

  create: (payload: PatientPayload) => apiClient.post<Patient>('/patients', payload),

  update: (id: number, payload: Partial<PatientPayload>) =>
    apiClient.put<Patient>(`/patients/${id}`, payload),

  remove: (id: number) => apiClient.delete<void>(`/patients/${id}`),

  encounters: (id: number) => apiClient.get<Encounter[]>(`/patients/${id}/encounters`),
};
