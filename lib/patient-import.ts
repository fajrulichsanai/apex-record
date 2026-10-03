import { API_BASE, apiClient, ApiError } from './api-client';


export interface PatientImportRowResult {
  row: number;
  name?: string;
  noRm?: string;
  status: 'created' | 'failed';
  message?: string;
}

export interface PatientImportSummary {
  totalRows: number;
  created: number;
  failed: number;
  results: PatientImportRowResult[];
}

export const patientImportApi = {
  downloadTemplate: async () => {
    const res = await fetch(`${API_BASE}/super-admin/patients/import-template`);
    if (!res.ok) {
      let message = 'Gagal mengunduh template migrasi pasien';
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
    anchor.download = 'template-migrasi-pasien.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  importPatients: (clinicId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('clinicId', String(clinicId));
    return apiClient.postForm<PatientImportSummary>('/super-admin/patients/import', form);
  },
};
