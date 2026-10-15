import { apiClient, toQueryString } from './api-client';
import type { ClinicResponse, UpdateClinicPayload } from './clinic';
import type { Payment, PriceQuote } from '@/types/subscription';

export type BranchBillingMode = 'owner' | 'self' | 'stopped';
export type LinkStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface OwnedClinic {
  id: number;
  name: string;
  address?: string;
  /** Siapa yang membayar cabang ini mulai periode berikutnya. */
  billingMode?: BranchBillingMode;
}

export interface BranchLink {
  id: number;
  clinicId: number;
  clinicName: string | null;
  status: LinkStatus;
  billingMode: BranchBillingMode;
  requestedAt: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
}

export interface BranchSubscription {
  status: 'active' | 'expired' | 'cancelled' | string;
  endDate: string;
  planName: string | null;
}

export interface MultiClinicReport {
  range: { dateFrom: string; dateTo: string };
  totals: {
    visits: number;
    finished: number;
    cancelled: number;
    revenue: number;
    collected: number;
    outstanding: number;
    billings: number;
  };
  clinics: {
    clinic: { id: number; name: string };
    visits: number;
    finished: number;
    cancelled: number;
    billings: number;
    revenue: number;
    collected: number;
    outstanding: number;
  }[];
  byDay: { date: string; visits: number; revenue: number }[];
}

export interface MultiClinicDashboardRow {
  clinic: { id: number; name: string };
  billingMode?: BranchBillingMode;
  subscription?: BranchSubscription | null;
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
  /** Every approved branch (for the filter), whatever the filter is. */
  branches?: { id: number; name: string }[];
  /** Requests still waiting for the clinic owner's approval. */
  pending?: BranchLink[];
  quota?: {
    accountsUsed: number;
    accountsLimit: number;
    activeBranches: number;
    storageGbLimit: number;
    storageUsedBytes?: number;
    storageLimitBytes?: number;
  };
}

export interface MultiClinicOwner {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  clinics: OwnedClinic[];
  /** Every link of this owner, with its approval status. */
  links?: BranchLink[];
}

export const multiClinicApi = {
  myClinics: () => apiClient.get<OwnedClinic[]>('/multi-clinic/my-clinics'),

  dashboard: (clinicId?: number) =>
    apiClient.get<MultiClinicDashboard>(`/multi-clinic/dashboard?${toQueryString({ clinicId })}`),

  report: (query: { dateFrom: string; dateTo: string; clinicId?: number }) =>
    apiClient.get<MultiClinicReport>(`/multi-clinic/reports?${toQueryString(query)}`),

  pending: () => apiClient.get<BranchLink[]>('/multi-clinic/pending'),

  setBillingMode: (clinicId: number, billingMode: BranchBillingMode) =>
    apiClient.put<BranchLink>(`/multi-clinic/clinics/${clinicId}/billing-mode`, { billingMode }),

  listOwners: () => apiClient.get<MultiClinicOwner[]>('/multi-clinic/owners'),

  /**
   * Super Admin: ajukan hubungan (menunggu persetujuan owner klinik), atau
   * `direct` untuk cabang baru yang dibuat untuk owner ini.
   */
  linkClinic: (ownerId: number, clinicId: number, direct = false) =>
    apiClient.post<BranchLink>(`/multi-clinic/owners/${ownerId}/clinics`, { clinicId, direct }),

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
  quotePayment: (query: { planId: number; months?: number }) =>
    apiClient.get<PriceQuote>(`/multi-clinic/payments/quote?${toQueryString(query)}`),

  claimPayment: (payload: { planId: number; months?: number; notes?: string }, proof?: File) => {
    if (!proof) {
      return apiClient.post<Payment>('/multi-clinic/payments/claim', payload);
    }
    const form = new FormData();
    form.append('planId', String(payload.planId));
    if (payload.months) form.append('months', String(payload.months));
    if (payload.notes) form.append('notes', payload.notes);
    form.append('proof', proof);
    return apiClient.postForm<Payment>('/multi-clinic/payments/claim', form);
  },

  listMyPayments: (query?: { status?: 'pending' | 'confirmed' | 'rejected'; page?: number; limit?: number }) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/multi-clinic/payments/mine?${toQueryString(query || {})}`,
    ),
};
