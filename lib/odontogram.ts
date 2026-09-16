import { apiClient } from './api-client';

export type SurfaceCondition = 'karies' | 'komposit' | 'gic' | null;
export type ToothStatusBelow = 'MISSING' | 'CFR' | 'RRX' | null;

export interface ToothSurfaces {
  buccal?: SurfaceCondition;
  palatal?: SurfaceCondition;
  mesial?: SurfaceCondition;
  distal?: SurfaceCondition;
  occlusal?: SurfaceCondition;
}

export interface ToothData {
  surfaces?: ToothSurfaces;
  statusAbove?: string | null;
  statusBelow?: ToothStatusBelow;
  isRCT?: boolean;
}

export interface AdditionalFindings {
  occlusion?: string | null;
  diastema?: boolean;
  anomaly?: string | null;
}

export interface OdontogramData {
  id?: number;
  encounterId: number;
  teeth: Record<string, ToothData>;
  dmftDecayed?: number;
  dmftMissing?: number;
  dmftFilled?: number;
  dmftTotal?: number;
  additionalFindings?: AdditionalFindings | null;
}

export interface UpsertOdontogramPayload {
  teeth: Record<string, ToothData>;
  additionalFindings?: AdditionalFindings;
}

export const odontogramApi = {
  get: (encounterId: number) =>
    apiClient.get<OdontogramData | null>(`/encounters/${encounterId}/odontogram`),

  upsert: (encounterId: number, payload: UpsertOdontogramPayload) =>
    apiClient.put<OdontogramData>(`/encounters/${encounterId}/odontogram`, payload),
};
