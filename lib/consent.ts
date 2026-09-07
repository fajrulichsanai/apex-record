import { apiClient, ApiError } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ConsentTemplate {
  id: number;
  clinicId: number;
  tarifId: number;
  title: string;
  content: string;
  tarif?: { id: number; name: string };
}

export type PatientConsentStatus = 'draft' | 'partial' | 'completed';

export interface PatientConsent {
  id: number;
  clinicId: number;
  patientId: number;
  encounterId: number | null;
  tarifId: number | null;
  templateId: number | null;
  title: string;
  content: string;
  status: PatientConsentStatus;
  patientSignature: string | null;
  patientSignerName: string | null;
  patientSignedAt: string | null;
  doctorSignature: string | null;
  doctorSignedBy: number | null;
  doctorSignedAt: string | null;
  createdAt: string;
  patient?: { id: number; name: string; noRm?: string };
  tarif?: { id: number; name: string } | null;
}

export interface PatientConsentListResponse {
  data: PatientConsent[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface PatientConsentQuery {
  patientId?: number;
  encounterId?: number;
  status?: PatientConsentStatus;
  page?: number;
  limit?: number;
}

function toQueryString(query?: PatientConsentQuery) {
  if (!query) return '';
  const params = new URLSearchParams(
    Object.entries(query as unknown as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const consentTemplateApi = {
  list: () => apiClient.get<ConsentTemplate[]>('/consent-templates'),

  upsert: (tarifId: number, payload: { title: string; content: string }) =>
    apiClient.put<ConsentTemplate>(`/consent-templates/${tarifId}`, payload),

  remove: (tarifId: number) =>
    apiClient.delete<{ success: boolean }>(`/consent-templates/${tarifId}`),
};

export const patientConsentApi = {
  list: (query?: PatientConsentQuery) =>
    apiClient.get<PatientConsentListResponse>(`/patient-consents${toQueryString(query)}`),

  get: (id: number) => apiClient.get<PatientConsent>(`/patient-consents/${id}`),

  create: (payload: { patientId: number; encounterId?: number; tarifId?: number; templateId?: number }) =>
    apiClient.post<PatientConsent>('/patient-consents', payload),

  sign: (id: number, payload: { role: 'patient' | 'doctor'; signatureDataUrl: string; signerName?: string }) =>
    apiClient.patch<PatientConsent>(`/patient-consents/${id}/sign`, payload),

  downloadPdf: async (id: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_URL}/patient-consents/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      let message = 'Gagal mengunduh formulir persetujuan PDF';
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        // ignore — fall back to the generic message
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename = `consent-${id}.pdf`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
