import { API_BASE, apiClient, ApiError } from './api-client';


export interface PrescriptionItem {
  id: number;
  encounterId?: number;
  drugName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export interface CreatePrescriptionItemPayload {
  drugName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export const prescriptionsApi = {
  list: (encounterId: number) =>
    apiClient.get<PrescriptionItem[]>(`/encounters/${encounterId}/prescriptions`),

  create: (encounterId: number, payload: CreatePrescriptionItemPayload) =>
    apiClient.post<PrescriptionItem>(`/encounters/${encounterId}/prescriptions`, payload),

  remove: (encounterId: number, itemId: number) =>
    apiClient.delete<void>(`/encounters/${encounterId}/prescriptions/${itemId}`),

  downloadPdf: async (encounterId: number) => {
    const res = await fetch(`${API_BASE}/encounters/${encounterId}/prescriptions/pdf`);
    if (!res.ok) {
      let message = 'Gagal mengunduh resep PDF';
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        // ignore — fall back to the generic message
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename = `resep-${encounterId}.pdf`;
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
