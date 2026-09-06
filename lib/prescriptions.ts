import { apiClient } from './api-client';

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
};
