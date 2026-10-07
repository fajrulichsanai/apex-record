import { apiClient } from './api-client';
import type { TerminologySystem } from './terminology';

export type SyncState = 'pending' | 'synced' | 'failed';

/** Daftar masalah pasien (Condition SATUSEHAT, kategori problem-list-item) */
export interface PatientCondition {
  id: number;
  patientId: number;
  encounterId: number;
  lastEncounterId: number;
  codeSystem: TerminologySystem;
  code: string;
  display: string;
  nameId: string | null;
  clinicalStatus: string;
  verificationStatus: string;
  severity: string | null;
  onsetDate: string | null;
  abatementDate: string | null;
  note: string | null;
  syncStatus: SyncState;
  syncError: string | null;
  satusehatId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Observasi tambahan (Observation SATUSEHAT) dari katalog tetap */
export interface ClinicalObservation {
  id: number;
  encounterId: number;
  observationKey: string;
  valueNumber: number | null;
  valueCode: string | null;
  effectiveAt: string;
  note: string | null;
  syncStatus: SyncState;
  syncError: string | null;
  satusehatId: string | null;
}

export interface Option {
  value: string;
  label: string;
}

export interface ObservationType {
  key: string;
  label: string;
  group: string;
  kind: 'quantity' | 'coded';
  unit: string | null;
  min: number | null;
  max: number | null;
  decimals: number | null;
  loinc: string;
  answers?: { code: string; label: string }[];
  hint: string | null;
}

export interface ClinicalRecordOptions {
  clinicalStatuses: Option[];
  verificationStatuses: Option[];
  severities: Option[];
  abatedStatuses: string[];
  observations: ObservationType[];
}

export interface ConditionPayload {
  clinicalStatus?: string;
  verificationStatus?: string;
  severity?: string | null;
  onsetDate?: string | null;
  abatementDate?: string | null;
  note?: string | null;
}

export interface ObservationPayload {
  value?: number | null;
  valueCode?: string | null;
  effectiveAt?: string;
  note?: string | null;
}

export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  steps: { step: string; resourceType: string; status: string; message?: string }[];
}

let optionsCache: Promise<ClinicalRecordOptions> | null = null;

export const clinicalRecordsApi = {
  options: () => {
    optionsCache ??= apiClient.get<ClinicalRecordOptions>('/clinical-records/options').catch((err) => {
      optionsCache = null;
      throw err;
    });
    return optionsCache;
  },
  forEncounter: (encounterId: number) =>
    apiClient.get<{
      encounterSynced: boolean;
      conditions: PatientCondition[];
      observations: ClinicalObservation[];
    }>(`/encounters/${encounterId}/clinical-records`),
  forPatient: (patientId: number) =>
    apiClient.get<{ conditions: PatientCondition[]; observations: ClinicalObservation[] }>(
      `/patients/${patientId}/clinical-records`,
    ),
  createCondition: (encounterId: number, data: ConditionPayload & { system: TerminologySystem; code: string }) =>
    apiClient.post<PatientCondition>(`/encounters/${encounterId}/conditions`, data),
  updateCondition: (encounterId: number, id: number, data: ConditionPayload) =>
    apiClient.patch<PatientCondition>(`/encounters/${encounterId}/conditions/${id}`, data),
  removeCondition: (encounterId: number, id: number) =>
    apiClient.delete<{ removed: true; pendingSync: boolean }>(`/encounters/${encounterId}/conditions/${id}`),
  createObservation: (encounterId: number, data: ObservationPayload & { observationKey: string }) =>
    apiClient.post<ClinicalObservation>(`/encounters/${encounterId}/observations`, data),
  updateObservation: (encounterId: number, id: number, data: ObservationPayload) =>
    apiClient.patch<ClinicalObservation>(`/encounters/${encounterId}/observations/${id}`, data),
  removeObservation: (encounterId: number, id: number) =>
    apiClient.delete<{ removed: true; pendingSync: boolean }>(`/encounters/${encounterId}/observations/${id}`),
  send: (encounterId: number) => apiClient.post<SendResult>(`/encounters/${encounterId}/clinical-records/send`),
};

export function labelOf(options: Option[] | undefined, value: string | null | undefined) {
  return options?.find((o) => o.value === value)?.label ?? value ?? '—';
}

/** "24,5 kg/m²" / "Mantan perokok" */
export function observationValueText(type: ObservationType | undefined, o: ClinicalObservation) {
  if (!type) return o.valueNumber ?? o.valueCode ?? '—';
  if (type.kind === 'coded') return type.answers?.find((a) => a.code === o.valueCode)?.label ?? o.valueCode ?? '—';
  if (o.valueNumber === null) return '—';
  const n = o.valueNumber.toLocaleString('id-ID', { maximumFractionDigits: type.decimals ?? 2 });
  return type.unit ? `${n} ${type.unit}` : n;
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
