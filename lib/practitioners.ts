import { apiClient } from './api-client';

export interface Practitioner {
  id: number;
  name: string;
  nik?: string;
  gender?: string;
  phone?: string;
  email?: string;
  sipNumber?: string;
  specialization?: string;
  satusehatPractitionerId?: string;
  clinicId: number;
  createdAt: string;
}

export const practitionersApi = {
  list: () => apiClient.get<Practitioner[]>('/settings/practitioners'),
};
