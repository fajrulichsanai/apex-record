import { apiClient } from './api-client';

export type EncounterStatus = 'arrived' | 'in_progress' | 'finished' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'insurance' | 'bpjs';

export interface VisitReportQuery {
  dateFrom: string;
  dateTo: string;
  practitionerId?: number;
  status?: EncounterStatus;
  page?: number;
  limit?: number;
}

export interface VisitReportResponse {
  data: {
    summary: {
      total: number;
      finished: number;
      cancelled: number;
      inProgress: number;
      avgDurationMinutes: number | null;
    };
    byDay: { date: string; count: number }[];
    byDoctor: { practitionerName: string; count: number }[];
    encounters: {
      encounterId: number;
      date: string;
      patientName?: string;
      practitionerName?: string;
      status: EncounterStatus;
      durationMinutes: number | null;
    }[];
  };
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface FinancialReportQuery {
  dateFrom: string;
  dateTo: string;
  type?: 'summary' | 'detailed';
}

export interface FinancialReportResponse {
  data: {
    summary: {
      totalBilling: number;
      totalPaid: number;
      totalOutstanding: number;
      collectionRate: number;
      totalRefunded: number;
    };
    byDay: { date: string; revenue: number; collected: number }[];
    byPaymentMethod: { method: PaymentMethod; amount: number }[];
    byDoctor: { practitionerName: string; revenue: number }[];
  };
}

function toQueryString(query: VisitReportQuery | FinancialReportQuery) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(query as unknown as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
  ).toString();
}

export const reportsApi = {
  getVisits: (query: VisitReportQuery) =>
    apiClient.get<VisitReportResponse>(`/reports/visits?${toQueryString(query)}`),

  getFinancial: (query: FinancialReportQuery) =>
    apiClient.get<FinancialReportResponse>(`/reports/financial?${toQueryString(query)}`),
};
