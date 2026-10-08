import { apiClient } from './api-client';

export type PractitionerGender = 'male' | 'female';

export interface Practitioner {
  id: number;
  name: string;
  /** NIK tidak pernah dikirim utuh oleh backend — pakai nikMasked */
  nik?: string;
  nikMasked?: string | null;
  hasNik?: boolean;
  gender?: PractitionerGender | null;
  profession?: string | null;
  birthPlace?: string | null;
  birthDate?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  sipNumber?: string | null;
  sipExpiredAt?: string | null;
  strNumber?: string | null;
  strExpiredAt?: string | null;
  specialization?: string | null;
  satusehatPractitionerId?: string | null;
  userId?: number | null;
  isActive?: boolean;
  clinicId: number;
  createdAt: string;
  updatedAt?: string;
}

/** Field yang bisa diisi saat tambah/revisi. '' = kosongkan. */
export interface PractitionerInput {
  name?: string;
  nik?: string;
  gender?: PractitionerGender;
  profession?: string;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  email?: string;
  sipNumber?: string;
  sipExpiredAt?: string;
  strNumber?: string;
  strExpiredAt?: string;
  specialization?: string;
  satusehatPractitionerId?: string;
  isActive?: boolean;
  /** Alasan revisi (dicatat di riwayat) */
  reason?: string;
}

export interface PractitionerRevision {
  id: number;
  createdAt: string;
  changedByName: string | null;
  reason: string | null;
  changes: { field: string; label: string; from: string | null; to: string | null }[];
}

export interface SatusehatPractitioner {
  id: string;
  name: string | null;
  gender: string | null;
  birthDate: string | null;
  nikMasked: string | null;
  city: string | null;
  inClinic: { id: number; name: string } | null;
}

export interface SatusehatMatch {
  found: boolean;
  message?: string;
  satusehatId?: string;
  satusehatName?: string | null;
  satusehatGender?: string | null;
  satusehatBirthDate?: string | null;
  nameMatches?: boolean;
  practitioner?: Practitioner;
}

export const PROFESSIONS: { value: string; label: string }[] = [
  { value: 'dokter', label: 'Dokter Umum' },
  { value: 'dokter_gigi', label: 'Dokter Gigi' },
  { value: 'dokter_spesialis', label: 'Dokter Spesialis' },
  { value: 'dokter_gigi_spesialis', label: 'Dokter Gigi Spesialis' },
  { value: 'perawat', label: 'Perawat' },
  { value: 'perawat_gigi', label: 'Terapis Gigi & Mulut' },
  { value: 'bidan', label: 'Bidan' },
  { value: 'apoteker', label: 'Apoteker' },
  { value: 'tenaga_teknis_kefarmasian', label: 'Tenaga Teknis Kefarmasian' },
  { value: 'analis_kesehatan', label: 'Ahli Teknologi Lab Medik' },
  { value: 'radiografer', label: 'Radiografer' },
  { value: 'nutrisionis', label: 'Nutrisionis' },
  { value: 'fisioterapis', label: 'Fisioterapis' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const professionLabel = (v?: string | null) =>
  PROFESSIONS.find((p) => p.value === v)?.label ?? null;

const BASE = '/settings/practitioners';

export const practitionersApi = {
  list: () => apiClient.get<Practitioner[]>(BASE),
  create: (body: PractitionerInput) => apiClient.post<Practitioner>(BASE, body),
  update: (id: number, body: PractitionerInput) => apiClient.put<Practitioner>(`${BASE}/${id}`, body),
  remove: (id: number) => apiClient.delete<{ message: string }>(`${BASE}/${id}`),
  revisions: (id: number) => apiClient.get<PractitionerRevision[]>(`${BASE}/${id}/revisions`),
  matchSatusehat: (id: number) => apiClient.post<SatusehatMatch>(`${BASE}/${id}/match-satusehat`),
  searchSatusehat: (q: { nik?: string; ihsId?: string; name?: string; gender?: string; birthDate?: string }) =>
    apiClient.post<{ found: boolean; results: SatusehatPractitioner[] }>(`${BASE}/search-satusehat`, q),
};
