import { apiClient } from './api-client';

export type ApiGender = 'male' | 'female';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface Patient {
  id: number;
  clinicId: number;
  noRm: string;
  nik?: string;
  nikIbu?: string;
  name: string;
  birthDate?: string;
  gender: ApiGender;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  maritalStatus?: MaritalStatus;
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
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  maritalStatus?: MaritalStatus;
  isNewborn?: boolean;
  nikIbu?: string;
}

export interface Encounter {
  id: number;
  status: string;
  serviceType: string;
  arrivedTime: string;
  finishedTime?: string;
}

export interface SatusehatPatientResult {
  nik: string;
  name: string;
  birthDate?: string;
  gender?: ApiGender;
  address?: string;
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

  searchSatusehat: (nik: string) =>
    apiClient.get<SatusehatPatientResult[]>(
      `/patients/search-satusehat?nik=${encodeURIComponent(nik)}`
    ),
};
