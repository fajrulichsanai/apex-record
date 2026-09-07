import { apiClient } from './api-client';

export interface OwnedClinic {
  id: number;
  name: string;
  address?: string;
}

export interface MultiClinicDashboardRow {
  clinic: { id: number; name: string };
  summary: {
    totalPatients: number;
    activePractitioners: number;
    todayVisits: number;
    pendingVisits: number;
    monthlyRevenue: number;
    activeTarifs: number;
    totalTransactions: number;
    registeredUsers: number;
  };
}

export interface MultiClinicDashboard {
  totals: {
    totalPatients: number;
    activePractitioners: number;
    todayVisits: number;
    monthlyRevenue: number;
    totalTransactions: number;
  };
  clinics: MultiClinicDashboardRow[];
}

export interface MultiClinicOwner {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  clinics: OwnedClinic[];
}

export const multiClinicApi = {
  myClinics: () => apiClient.get<OwnedClinic[]>('/multi-clinic/my-clinics'),

  dashboard: () => apiClient.get<MultiClinicDashboard>('/multi-clinic/dashboard'),

  listOwners: () => apiClient.get<MultiClinicOwner[]>('/multi-clinic/owners'),

  linkClinic: (ownerId: number, clinicId: number) =>
    apiClient.post(`/multi-clinic/owners/${ownerId}/clinics`, { clinicId }),

  unlinkClinic: (ownerId: number, clinicId: number) =>
    apiClient.delete(`/multi-clinic/owners/${ownerId}/clinics/${clinicId}`),
};
