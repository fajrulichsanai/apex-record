import { apiClient } from './api-client';

export interface PayrollEmployee {
  userId: number;
  name: string;
  role: string;
  isDoctor: boolean;
  baseSalary: number;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
}

export interface PayrollAttendance {
  workDays: number;
  presentDays: number;
  lateCount: number;
  lateMinutes: number;
  absentDays: number;
}

export interface PayrollRow {
  id: number | null;
  userId: number;
  name: string;
  role: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  shareFee: number;
  total: number;
  attendance: PayrollAttendance | null;
  note: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
}

export interface PayrollView {
  period: string;
  run: { id: number; status: 'draft' | 'paid'; paidAt: string | null; createdAt: string } | null;
  items: PayrollRow[];
  totals: { baseSalary: number; bonus: number; deduction: number; shareFee: number; total: number };
}

export interface PayrollRunSummary {
  id: number;
  period: string;
  status: 'draft' | 'paid';
  paidAt: string | null;
  employees: number;
  total: number;
}

export const payrollApi = {
  employees: () => apiClient.get<PayrollEmployee[]>('/payroll/employees'),
  saveEmployee: (
    userId: number,
    body: { baseSalary?: number; bankName?: string; bankAccount?: string; bankHolder?: string },
  ) => apiClient.put<PayrollEmployee>(`/payroll/employees/${userId}`, body),
  runs: () => apiClient.get<PayrollRunSummary[]>('/payroll/runs'),
  run: (period: string) => apiClient.get<PayrollView>(`/payroll/runs/${period}`),
  generate: (period: string) => apiClient.post<PayrollView>(`/payroll/runs/${period}/generate`, {}),
  updateItem: (period: string, id: number, body: { bonus?: number; deduction?: number; note?: string }) =>
    apiClient.patch<PayrollView>(`/payroll/runs/${period}/items/${id}`, body),
  pay: (period: string, tanggal?: string) =>
    apiClient.post<PayrollView>(`/payroll/runs/${period}/pay`, tanggal ? { tanggal } : {}),
  reopen: (period: string) => apiClient.post<PayrollView>(`/payroll/runs/${period}/reopen`, {}),
  recapPdfPath: (period: string) => `/payroll/runs/${period}/recap.pdf`,
  slipPdfPath: (period: string, userId: number) => `/payroll/runs/${period}/slip/${userId}.pdf`,
};

export const ROLE_LABEL: Record<string, string> = { admin: 'Admin', dokter: 'Dokter', perawat: 'Perawat' };
