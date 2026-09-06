import { apiClient } from './api-client';

export interface ProbingDepthEntry {
  toothNumber: number;
  buccal?: number;
  lingual?: number;
}

export interface DentalExamination {
  id?: number;
  encounterId?: number;
  createdAt?: string;
  updatedAt?: string;

  ohisDebris?: number;
  ohisCalculus?: number;
  gingivalIndex?: number;

  plaqueSurfacesWithPlaque?: number;
  plaqueSurfacesExamined?: number;

  probingDepths?: ProbingDepthEntry[];
  notes?: string;
}

export type UpsertDentalExaminationPayload = Omit<DentalExamination, 'id' | 'encounterId'>;

export const dentalExaminationApi = {
  get: (encounterId: number) =>
    apiClient.get<DentalExamination | null>(`/encounters/${encounterId}/dental-examination`),

  upsert: (encounterId: number, payload: UpsertDentalExaminationPayload) =>
    apiClient.put<DentalExamination>(`/encounters/${encounterId}/dental-examination`, payload),
};
