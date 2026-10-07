import { apiClient, toQueryString } from './api-client';

/** Pemeriksaan dari katalog LOINC Laboratorium SATUSEHAT */
export interface LabTest {
  code: string;
  name: string | null;
  display: string | null;
  category: string | null;
  specimen: string | null;
  /** Quantitative | Ordinal | Nominal | OrdQn | Narrative */
  scale: string | null;
  unit: string | null;
  use: string | null;
}

export interface LabAnswer {
  code: string;
  display: string;
}

export interface LabTestDetail extends LabTest {
  answers: LabAnswer[];
  /** Parameter hasil untuk pemeriksaan ini (beserta pilihan jawabannya) */
  results: (LabTest & { answers: LabAnswer[] })[];
}

export interface RadiologyTest {
  code: string;
  name: string | null;
  display: string | null;
  category: string | null;
}

export type FastingStatus = 'fasting' | 'not_fasting' | 'not_required';
export type LabOrderStatus = 'ordered' | 'collected' | 'completed' | 'cancelled';
export type RadiologyStatus = 'ordered' | 'completed' | 'cancelled';
export type LabInterpretation = 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A' | 'POS' | 'NEG';

export interface LabResult {
  id: number;
  code: string;
  display: string;
  nameId: string | null;
  valueNumber: string | null;
  unit: string | null;
  valueCode: string | null;
  valueCodeDisplay: string | null;
  valueText: string | null;
  refLow: string | null;
  refHigh: string | null;
  interpretation: LabInterpretation | null;
}

export interface LabOrder {
  id: number;
  code: string;
  display: string;
  nameId: string;
  category: string | null;
  specimenType: string | null;
  fasting: FastingStatus | null;
  note: string | null;
  status: LabOrderStatus;
  specimenCollectedAt: string | null;
  resultedAt: string | null;
  conclusion: string | null;
  results: LabResult[];
}

export interface RadiologyOrder {
  id: number;
  code: string;
  display: string;
  nameId: string;
  modality: string;
  accessionNumber: string;
  note: string | null;
  status: RadiologyStatus;
  resultText: string | null;
  conclusion: string | null;
  resultedAt: string | null;
}

export interface LabResultInput {
  code: string;
  valueNumber?: number;
  valueCode?: string;
  valueText?: string;
  refLow?: number;
  refHigh?: number;
  interpretation?: LabInterpretation;
}

export const FASTING_OPTIONS: { value: FastingStatus; label: string }[] = [
  { value: 'not_required', label: 'Tidak perlu puasa' },
  { value: 'fasting', label: 'Puasa' },
  { value: 'not_fasting', label: 'Tidak puasa' },
];

export const INTERPRETATION_LABEL: Record<LabInterpretation, string> = {
  N: 'Normal',
  L: 'Rendah',
  H: 'Tinggi',
  LL: 'Sangat rendah',
  HH: 'Sangat tinggi',
  A: 'Abnormal',
  POS: 'Positif',
  NEG: 'Negatif',
};

export const LAB_STATUS_LABEL: Record<LabOrderStatus, string> = {
  ordered: 'Diminta',
  collected: 'Spesimen diambil',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const RAD_STATUS_LABEL: Record<RadiologyStatus, string> = {
  ordered: 'Diminta',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const base = (encounterId: number) => `/encounters/${encounterId}`;

export const diagnosticsApi = {
  searchLab: (q: string) =>
    apiClient.get<LabTest[]>(`/terminology/lab-tests?${toQueryString({ q, use: 'request', limit: 15 })}`),
  labDetail: (code: string) => apiClient.get<LabTestDetail>(`/terminology/lab-tests/${encodeURIComponent(code)}`),
  searchRadiology: (q: string, dental?: boolean) =>
    apiClient.get<RadiologyTest[]>(
      `/terminology/radiology-tests?${toQueryString({ q, limit: 15, ...(dental === undefined ? {} : { dental: String(dental) }) })}`,
    ),

  listLab: (encounterId: number) => apiClient.get<LabOrder[]>(`${base(encounterId)}/lab-orders`),
  createLab: (encounterId: number, data: { code: string; fasting?: FastingStatus; note?: string }) =>
    apiClient.post<LabOrder>(`${base(encounterId)}/lab-orders`, data),
  updateLab: (
    encounterId: number,
    id: number,
    data: { status?: LabOrderStatus; specimenCollectedAt?: string; fasting?: FastingStatus; note?: string; conclusion?: string },
  ) => apiClient.patch<LabOrder>(`${base(encounterId)}/lab-orders/${id}`, data),
  saveLabResults: (encounterId: number, id: number, data: { results: LabResultInput[]; conclusion?: string }) =>
    apiClient.put<LabOrder>(`${base(encounterId)}/lab-orders/${id}/results`, data),
  removeLab: (encounterId: number, id: number) => apiClient.delete(`${base(encounterId)}/lab-orders/${id}`),

  listRadiology: (encounterId: number) => apiClient.get<RadiologyOrder[]>(`${base(encounterId)}/radiology-orders`),
  createRadiology: (encounterId: number, data: { code: string; note?: string }) =>
    apiClient.post<RadiologyOrder>(`${base(encounterId)}/radiology-orders`, data),
  updateRadiology: (
    encounterId: number,
    id: number,
    data: { status?: RadiologyStatus; resultText?: string; conclusion?: string; note?: string },
  ) => apiClient.patch<RadiologyOrder>(`${base(encounterId)}/radiology-orders/${id}`, data),
  removeRadiology: (encounterId: number, id: number) => apiClient.delete(`${base(encounterId)}/radiology-orders/${id}`),
};

/** Interpretasi otomatis dari nilai rujukan */
export function autoInterpretation(value: number, low?: number, high?: number): LabInterpretation | undefined {
  if (Number.isNaN(value)) return undefined;
  if (low !== undefined && !Number.isNaN(low) && value < low) return 'L';
  if (high !== undefined && !Number.isNaN(high) && value > high) return 'H';
  if ((low !== undefined && !Number.isNaN(low)) || (high !== undefined && !Number.isNaN(high))) return 'N';
  return undefined;
}
