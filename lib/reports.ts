import { apiClient } from './api-client';

export type EncounterStatus = 'arrived' | 'in_progress' | 'finished' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'insurance' | 'bpjs';

export interface VisitReportQuery {
  dateFrom: string;
  dateTo: string;
  practitionerId?: number;
  status?: EncounterStatus;
  page?: number;
  limit?: number;
}

export interface VisitReportResponse {
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
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface FinancialReportQuery {
  dateFrom: string;
  dateTo: string;
  type?: 'summary' | 'detailed';
}

export interface FinancialReportResponse {
  summary: {
    totalBilling: number;
    totalPaid: number;
    totalOutstanding: number;
    collectionRate: number;
    totalRefunded: number;
  };
  byDay: { date: string; revenue: number; collected: number }[];
  byPaymentMethod: { method: PaymentMethod; amount: number }[];
  byDoctor: { practitionerName: string; revenue: number; doctorFeeShare: number }[];
  ringkasan: {
    pendapatanTotal: number;
    modal: number;
    labaBersih: number;
    pengeluaran: number;
    marginPersen: number;
  };
  tindakanTerlaris: {
    tarifId: number;
    namaTindakan: string;
    modal: number;
    hargaJual: number;
    frekuensi: number;
    totalDiskon: number;
    labaBersih: number;
  }[];
}

export interface FinancialVisitDetailQuery {
  dateFrom: string;
  dateTo: string;
  page?: number;
  limit?: number;
}

export interface FinancialVisitDetailResponse {
  data: {
    encounterId: number;
    patientName: string;
    birthDate: string | null;
    tindakan: string;
    jamMasuk: string;
    jamKeluar: string | null;
  }[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function toQueryString(
  query: VisitReportQuery | FinancialReportQuery | FinancialVisitDetailQuery,
) {
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

  getFinancialVisitDetail: (query: FinancialVisitDetailQuery) =>
    apiClient.get<FinancialVisitDetailResponse>(
      `/reports/financial/visit-detail?${toQueryString(query)}`,
    ),
};
