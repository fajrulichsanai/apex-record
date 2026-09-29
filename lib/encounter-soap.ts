import { apiClient } from './api-client';
import type { SoapDiagnosis } from './terminology';

export interface SoapNote {
  id?: number;
  encounterId?: number;
  subjective?: string;
  objective?: string;
  assessment?: string;
  diagnoses?: SoapDiagnosis[] | null;
  treatment?: string;
  plan?: string;
  controlPlan?: string;
  signature?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface UpsertSoapNotePayload {
  subjective?: string;
  objective?: string;
  assessment?: string;
  /** Replaces the saved list when sent; the server fills in the names. */
  diagnoses?: Array<Pick<SoapDiagnosis, 'system' | 'code' | 'primary' | 'note'>>;
  treatment?: string;
  plan?: string;
  controlPlan?: string;
  signature?: string;
}

export const encounterSoapApi = {
  get: (encounterId: number) =>
    apiClient.get<SoapNote | null>(`/encounters/${encounterId}/soap-note`),

  upsert: (encounterId: number, payload: UpsertSoapNotePayload) =>
    apiClient.put<SoapNote>(`/encounters/${encounterId}/soap-note`, payload),
};
