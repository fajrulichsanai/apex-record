import { apiClient } from './api-client';

export interface Location {
  id: number;
  name: string;
  type?: string;
  description?: string;
  isActive: boolean;
  satusehatLocationId?: string;
  clinicId: number;
  createdAt: string;
}

export const locationsApi = {
  list: (activeOnly = true) =>
    apiClient.get<Location[]>(`/settings/locations?activeOnly=${activeOnly}`),
};
