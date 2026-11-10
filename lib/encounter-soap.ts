import { apiClient } from './api-client';
import type { SoapDiagnosis } from './terminology';

export type DischargeCondition = 'stable' | 'improved' | 'worsened';
export type Prognosis = 'good' | 'fair' | 'guarded' | 'bad';

export const DISCHARGE_CONDITION_OPTIONS: { value: DischargeCondition; label: string }[] = [
  { value: 'stable', label: 'Stabil' },
  { value: 'improved', label: 'Membaik' },
  { value: 'worsened', label: 'Memburuk' },
];

export const PROGNOSIS_OPTIONS: { value: Prognosis; label: string }[] = [
  { value: 'good', label: 'Baik (bonam)' },
  { value: 'fair', label: 'Dubia ad bonam' },
  { value: 'guarded', label: 'Dubia ad malam' },
  { value: 'bad', label: 'Buruk (malam)' },
];

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
  /** Data terkode untuk SATUSEHAT (RME Rawat Jalan) */
  chiefComplaintCode?: string | null;
  chiefComplaintDisplay?: string | null;
  educationGiven?: boolean | null;
  dischargeCondition?: DischargeCondition | null;
  prognosis?: Prognosis | null;
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
  /** Kode SNOMED keluhan utama; '' menghapus */
  chiefComplaintCode?: string;
  educationGiven?: boolean;
  dischargeCondition?: DischargeCondition;
  prognosis?: Prognosis;
  signature?: string;
}

export const encounterSoapApi = {
  get: (encounterId: number) =>
    apiClient.get<SoapNote | null>(`/encounters/${encounterId}/soap-note`),

  upsert: (encounterId: number, payload: UpsertSoapNotePayload) =>
    apiClient.put<SoapNote>(`/encounters/${encounterId}/soap-note`, payload),
};
