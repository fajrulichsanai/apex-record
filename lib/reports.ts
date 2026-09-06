import { apiClient, ApiError } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  demographics: {
    byGender: { gender: 'male' | 'female' | null; count: number }[];
    byAgeGroup: { group: string; count: number }[];
    newVsReturning: { new: number; returning: number };
  };
  procedureMix: {
    topProcedures: { tarifName: string; kategori: string; count: number }[];
    byKategori: { kategori: string; count: number }[];
    avgProceduresPerVisit: number;
  };
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { day: string; count: number }[];
  comparison: {
    previousTotal: number;
    changePercent: number | null;
  };
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
  comparison: {
    previousPendapatan: number;
    changePercent: number | null;
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
  businessMetrics: {
    ltv: { averageLtv: number; averageVisitsPerPatient: number; patientCount: number };
    arpv: number;
    pareto: { top20PercentPatientShare: number; patientCount: number };
    dso: { averageDays: number; outstandingCount: number };
    retention: {
      retentionRatePercent: number | null;
      previousPeriodPatients: number;
      returningPatients: number;
    };
    categoryProfitability: {
      kategori: string;
      frekuensi: number;
      pendapatan: number;
      modal: number;
      labaBersih: number;
      marginPersen: number;
    }[];
  };
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

  downloadInvestorReportPdf: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_URL}/reports/investor/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      let message = 'Gagal mengunduh laporan investor';
      try {
        const body = await res.json();
        if (body?.error?.message) message = body.error.message;
      } catch {
        // ignore — fall back to the generic message
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'laporan-investor.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
