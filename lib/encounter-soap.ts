import { apiClient } from './api-client';

export interface SoapNote {
  id?: number;
  encounterId?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  treatment?: string;
  plan?: string;
  signature?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface UpsertSoapNotePayload {
  subjective?: string;
  objective?: string;
  assessment?: string;
  treatment?: string;
  plan?: string;
  signature?: string;
}

export const encounterSoapApi = {
  get: (encounterId: number) =>
    apiClient.get<SoapNote | null>(`/encounters/${encounterId}/soap-note`),

  upsert: (encounterId: number, payload: UpsertSoapNotePayload) =>
    apiClient.put<SoapNote>(`/encounters/${encounterId}/soap-note`, payload),
};
