import { apiClient, toQueryString } from './api-client';
import type { ClinicResponse, UpdateClinicPayload } from './clinic';
import type { Payment } from '@/types/subscription';

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

  /** Multi-klinik owner: view/edit one of their own linked clinics' Info Klinik. */
  getClinic: (clinicId: number) => apiClient.get<ClinicResponse>(`/multi-clinic/clinics/${clinicId}`),

  updateClinic: (clinicId: number, payload: UpdateClinicPayload) =>
    apiClient.put<ClinicResponse>(`/multi-clinic/clinics/${clinicId}`, payload),

  uploadClinicLogo: (clinicId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.postForm<{ logoUrl: string }>(`/multi-clinic/clinics/${clinicId}/logo`, form);
  },

  /**
   * Multi-klinik owner: bayar sekali untuk paket Multi Klinik — mencakup
   * semua klinik yang sedang terhubung ke akun ini (quantity dihitung di
   * server dari jumlah klinik tersebut, bukan dari input).
   */
  claimPayment: (payload: { planId: number; notes?: string }, proof?: File) => {
    if (!proof) {
      return apiClient.post<Payment>('/multi-clinic/payments/claim', payload);
    }
    const form = new FormData();
    form.append('planId', String(payload.planId));
    if (payload.notes) form.append('notes', payload.notes);
    form.append('proof', proof);
    return apiClient.postForm<Payment>('/multi-clinic/payments/claim', form);
  },

  listMyPayments: (query?: { status?: 'pending' | 'confirmed' | 'rejected'; page?: number; limit?: number }) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/multi-clinic/payments/mine?${toQueryString(query || {})}`,
    ),
};
