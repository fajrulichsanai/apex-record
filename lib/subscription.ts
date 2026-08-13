import { apiClient, toQueryString } from './api-client';
import type {
  ClinicSubscription,
  ClinicSubscriptionSummary,
  Payment,
  SubscriptionPlan,
  SuperAdminReportSummary,
} from '@/types/subscription';

export interface CreatePaymentPayload {
  planId: number;
  amount: number;
  notes?: string;
}

export interface ConfirmPaymentPayload {
  notes?: string;
}

export interface ManualExtendPayload {
  clinicId: number;
  planId: number;
  notes?: string;
}

export interface PaymentListQuery {
  status?: 'pending' | 'confirmed' | 'rejected';
  clinicId?: number;
  page?: number;
  limit?: number;
}

export interface ClinicListQuery {
  status?: 'active' | 'expired';
  search?: string;
  page?: number;
  limit?: number;
}

export const subscriptionPlanApi = {
  list: () => apiClient.get<SubscriptionPlan[]>('/subscription-plans'),
  create: (payload: Omit<SubscriptionPlan, 'id'>) =>
    apiClient.post<SubscriptionPlan>('/subscription-plans', payload),
  update: (id: number, payload: Partial<Omit<SubscriptionPlan, 'id'>>) =>
    apiClient.patch<SubscriptionPlan>(`/subscription-plans/${id}`, payload),
  remove: (id: number) => apiClient.delete<void>(`/subscription-plans/${id}`),
};

export const clinicSubscriptionApi = {
  getCurrent: () => apiClient.get<ClinicSubscription | null>('/clinic-subscriptions/current'),
  listAll: (query?: ClinicListQuery) =>
    apiClient.get<{ data: ClinicSubscriptionSummary[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/clinic-subscriptions?${toQueryString(query || {})}`,
    ),
  getForClinic: (clinicId: number) =>
    apiClient.get<ClinicSubscription[]>(`/clinic-subscriptions/clinic/${clinicId}`),
  manualExtend: (payload: ManualExtendPayload) =>
    apiClient.post<ClinicSubscription>('/clinic-subscriptions/extend', payload),
};

export const paymentApi = {
  create: (payload: CreatePaymentPayload, proof?: File) => {
    if (!proof) {
      return apiClient.post<Payment>('/subscription-payments', payload);
    }
    const form = new FormData();
    form.append('planId', String(payload.planId));
    form.append('amount', String(payload.amount));
    if (payload.notes) form.append('notes', payload.notes);
    form.append('proof', proof);
    return apiClient.postForm<Payment>('/subscription-payments', form);
  },
  listMine: (query?: PaymentListQuery) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/subscription-payments/mine?${toQueryString(query || {})}`,
    ),
  listQueue: (query?: PaymentListQuery) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/subscription-payments?${toQueryString(query || {})}`,
    ),
  confirm: (id: number, payload?: ConfirmPaymentPayload) =>
    apiClient.post<Payment>(`/subscription-payments/${id}/confirm`, payload),
  reject: (id: number, payload?: ConfirmPaymentPayload) =>
    apiClient.post<Payment>(`/subscription-payments/${id}/reject`, payload),
};

export const superAdminReportApi = {
  summary: (query?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<SuperAdminReportSummary>(`/super-admin/reports/summary?${toQueryString(query || {})}`),
};
