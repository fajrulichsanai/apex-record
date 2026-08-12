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
  referrerPatientId?: number;
  golonganDarah?: BloodType;
  rhesus?: Rhesus;
  punyaAlergi?: boolean;
  catatanAlergi?: string;
  riwayatHipertensi?: boolean;
  riwayatDiabetes?: boolean;
  riwayatParuParu?: boolean;
  riwayatSyaraf?: boolean;
  riwayatSistemikLainnya?: boolean;
  catatanSistemikLainnya?: string;
  alergiObat?: boolean;
  alergiMakanan?: boolean;
  preferensiKontak?: PreferensiKontak;
  preferensiJamKontak?: PreferensiJamKontak;
  catatanPreferensi?: string;
  consentMarketing?: boolean;
  consentTanggal?: string;
  consentVersion?: string;
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
  nikIbu?: string;
  namaWali?: string;
  hubunganWali?: HubunganWali;
  birthOrder?: number;
  sumberInformasi?: SumberInformasi;
  detailSumber?: string;
  referrerPatientId?: number;
  golonganDarah?: BloodType;
  rhesus?: Rhesus;
  punyaAlergi?: boolean;
  catatanAlergi?: string;
  riwayatHipertensi?: boolean;
  riwayatDiabetes?: boolean;
  riwayatParuParu?: boolean;
  riwayatSyaraf?: boolean;
  riwayatSistemikLainnya?: boolean;
  catatanSistemikLainnya?: string;
  alergiObat?: boolean;
  alergiMakanan?: boolean;
  preferensiKontak?: PreferensiKontak;
  preferensiJamKontak?: PreferensiJamKontak;
  catatanPreferensi?: string;
  consentMarketing?: boolean;
  consentTanggal?: string;
  consentVersion?: string;
}

export interface Encounter {
  id: number;
  status: string;
  serviceType: string;
  chiefComplaint?: string;
  arrivedTime: string;
  finishedTime?: string;
  practitionerName?: string;
}

export interface ReferralSummaryResponse {
  bySource: { sumberInformasi: SumberInformasi; count: number }[];
  byReferrer: { referrerPatientId: number; referrerName: string; referralCount: number }[];
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

  // Backend caps `limit` at 100 per page, so a plain list() only returns the
  // first 10 (default) patients. This paginates through every page to fetch
  // the full list, for UI pickers (reservasi/kunjungan) that need all patients.
  listAll: async (query?: Omit<PatientQuery, 'page' | 'limit'>) => {
    const pageSize = 100;
    let page = 1;
    const all: Patient[] = [];

    while (true) {
      const batch = await patientsApi.list({ ...query, page, limit: pageSize });
      all.push(...batch);
      if (batch.length < pageSize) break;
      page += 1;
    }

    return all;
  },

  get: (id: number) => apiClient.get<Patient>(`/patients/${id}`),

  create: (payload: PatientPayload) => apiClient.post<Patient>('/patients', payload),

  update: (id: number, payload: Partial<PatientPayload>) =>
    apiClient.put<Patient>(`/patients/${id}`, payload),

  remove: (id: number) => apiClient.delete<void>(`/patients/${id}`),

  encounters: (id: number) => apiClient.get<Encounter[]>(`/patients/${id}/encounters`),

  getReferralSummary: () =>
    apiClient.get<ReferralSummaryResponse>('/patients/referral-summary'),
};
