import { apiClient } from './api-client';

export interface ToothCondition {
  id?: number;
  patientId?: number;
  toothNumber: number;
  wholeCondition?: string;
  surfaceMesial?: string;
  surfaceDistal?: string;
  surfaceVestibular?: string;
  surfaceLingual?: string;
  surfaceOcclusal?: string;
  notes?: string;
}

export interface DentalBridge {
  id: number;
  patientId?: number;
  fromTooth: number;
  toTooth: number;
  label: string;
  notes?: string;
}

export interface OdontogramData {
  teeth: ToothCondition[];
  bridges: DentalBridge[];
}

export interface UpsertToothConditionPayload {
  wholeCondition?: string;
  surfaceMesial?: string;
  surfaceDistal?: string;
  surfaceVestibular?: string;
  surfaceLingual?: string;
  surfaceOcclusal?: string;
  notes?: string;
}

export interface CreateBridgePayload {
  fromTooth: number;
  toTooth: number;
  label?: string;
  notes?: string;
}

export const odontogramApi = {
  get: (patientId: number) =>
    apiClient.get<OdontogramData>(`/patients/${patientId}/odontogram`),

  upsertTooth: (patientId: number, toothNumber: number, payload: UpsertToothConditionPayload) =>
    apiClient.put<ToothCondition>(`/patients/${patientId}/odontogram/teeth/${toothNumber}`, payload),

  createBridge: (patientId: number, payload: CreateBridgePayload) =>
    apiClient.post<DentalBridge>(`/patients/${patientId}/odontogram/bridges`, payload),

  removeBridge: (patientId: number, bridgeId: number) =>
    apiClient.delete<void>(`/patients/${patientId}/odontogram/bridges/${bridgeId}`),
};
