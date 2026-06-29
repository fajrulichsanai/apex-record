import { apiClient } from './api-client';

export type FeeType = 'fixed' | 'percentage';

export interface DoctorFeeConfig {
  id: number;
  tarifId: number;
  tarifName: string;
  feeType: FeeType;
  feeValue: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertDoctorFeeConfigPayload {
  tarifId: number;
  feeType: FeeType;
  feeValue: number;
  isActive?: boolean;
}

export interface DoctorMonthlyShareBreakdownItem {
  tarifId: number;
  tarifName: string;
  count: number;
  feeType: FeeType;
  feeValue: number;
  totalShare: number;
}

export interface DoctorMonthlyShareReport {
  practitionerId: number;
  practitionerName: string;
  breakdown: DoctorMonthlyShareBreakdownItem[];
  totalTindakan: number;
  totalShareFee: number;
}

export interface MonthlyShareReportQuery {
  year: number;
  month: number; // 1-12
}

export const doctorFeeApi = {
  listConfigs: () => apiClient.get<DoctorFeeConfig[]>('/settings/doctor-fee-configs'),

  upsertConfig: (payload: UpsertDoctorFeeConfigPayload) =>
    apiClient.post<DoctorFeeConfig>('/settings/doctor-fee-configs', payload),

  monthlyReport: (query: MonthlyShareReportQuery) =>
    apiClient.get<DoctorMonthlyShareReport[]>(
      '/reports/doctor-fee-share?' + new URLSearchParams(query as any).toString()
    ),
};
