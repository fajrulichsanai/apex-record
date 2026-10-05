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

  /** Pemeriksaan fungsional (SATUSEHAT RME Rawat Jalan) */
  psychologicalStatus?: PsychologicalStatus | string;
  psychologicalNote?: string;
  pregnancyStatus?: PregnancyStatus | string;
}

export type PsychologicalStatus = 'normal' | 'anxious' | 'afraid' | 'angry' | 'sad' | 'other';
export type PregnancyStatus = 'pregnant' | 'not_pregnant' | 'unknown';

export const PSYCHOLOGICAL_STATUS_OPTIONS: { value: PsychologicalStatus; label: string }[] = [
  { value: 'normal', label: 'Tidak ada kelainan' },
  { value: 'anxious', label: 'Cemas' },
  { value: 'afraid', label: 'Takut' },
  { value: 'angry', label: 'Marah' },
  { value: 'sad', label: 'Sedih' },
  { value: 'other', label: 'Lainnya' },
];

export const PREGNANCY_STATUS_OPTIONS: { value: PregnancyStatus; label: string }[] = [
  { value: 'not_pregnant', label: 'Tidak hamil' },
  { value: 'pregnant', label: 'Hamil' },
  { value: 'unknown', label: 'Tidak diketahui' },
];

export type UpsertPhysicalExaminationPayload = Omit<PhysicalExamination, 'id' | 'encounterId'>;

export const physicalExaminationApi = {
  get: (encounterId: number) =>
    apiClient.get<PhysicalExamination | null>(`/encounters/${encounterId}/physical-examination`),

  upsert: (encounterId: number, payload: UpsertPhysicalExaminationPayload) =>
    apiClient.put<PhysicalExamination>(`/encounters/${encounterId}/physical-examination`, payload),
};
