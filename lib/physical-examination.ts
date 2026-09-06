import { apiClient } from './api-client';

export interface PhysicalExamination {
  id?: number;
  encounterId?: number;
  createdAt?: string;
  updatedAt?: string;

  generalCondition?: string;
  consciousness?: string;
  nutritionalStatus?: string;
  height?: number;
  weight?: number;

  painScale?: number;
  painPoints?: { x: number; y: number }[];

  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;

  cyanosis?: string;
  edema?: string;
  anemia?: string;
  jaundice?: string;

  skin?: string;
  lymphNodes?: string;
  head?: string;
  hair?: string;
  eyes?: string;
  ears?: string;
  nose?: string;
  mouth?: string;
  neck?: string;

  lungInspection?: string;
  lungPalpation?: string;
  lungPercussion?: string;
  lungAuscultation?: string;

  heartInspection?: string;
  heartPalpation?: string;
  heartPercussion?: string;
  heartAuscultation?: string;

  abdomenInspection?: string;
  abdomenPalpation?: string;
  abdomenPercussion?: string;
  abdomenAuscultation?: string;

  extremities?: string;
  genitalia?: string;
  rectal?: string;
}

export type UpsertPhysicalExaminationPayload = Omit<PhysicalExamination, 'id' | 'encounterId'>;

export const physicalExaminationApi = {
  get: (encounterId: number) =>
    apiClient.get<PhysicalExamination | null>(`/encounters/${encounterId}/physical-examination`),

  upsert: (encounterId: number, payload: UpsertPhysicalExaminationPayload) =>
    apiClient.put<PhysicalExamination>(`/encounters/${encounterId}/physical-examination`, payload),
};
