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
  create: (payload: CreatePaymentPayload) => apiClient.post<Payment>('/payments', payload),
  listMine: (query?: PaymentListQuery) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/payments/mine?${toQueryString(query || {})}`,
    ),
  listQueue: (query?: PaymentListQuery) =>
    apiClient.get<{ data: Payment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/payments?${toQueryString(query || {})}`,
    ),
  confirm: (id: number, payload?: ConfirmPaymentPayload) =>
    apiClient.post<Payment>(`/payments/${id}/confirm`, payload),
  reject: (id: number, payload?: ConfirmPaymentPayload) =>
    apiClient.post<Payment>(`/payments/${id}/reject`, payload),
};

export const superAdminReportApi = {
  summary: (query?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<SuperAdminReportSummary>(`/super-admin/reports/summary?${toQueryString(query || {})}`),
};
