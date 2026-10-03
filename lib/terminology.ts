import { apiClient, toQueryString } from './api-client';

export type TerminologySystem = 'icd10' | 'snomed';

export const TERMINOLOGY_LABEL: Record<TerminologySystem, string> = {
  icd10: 'ICD-10',
  snomed: 'SNOMED CT',
};

export interface TerminologyHit {
  system: TerminologySystem;
  code: string;
  display: string;
  /** Indonesian name, for common dental/systemic diagnoses. */
  nameId: string | null;
}

export interface TerminologyDetail extends TerminologyHit {
  aliases: string[];
  explanation: string | null;
  classification: {
    chapter: { roman: string; range: string; name: string } | null;
    block: { range: string; name: string } | null;
    category: { code: string; display: string } | null;
  } | null;
  equivalent: { system: TerminologySystem; code: string; display: string } | null;
}

/** A coded diagnosis on a SOAP note. */
export interface SoapDiagnosis {
  system: TerminologySystem;
  code: string;
  display: string;
  nameId?: string | null;
  primary: boolean;
  note?: string | null;
}

export const terminologyApi = {
  search: (system: TerminologySystem, q: string, limit = 12) =>
    apiClient.get<TerminologyHit[]>(`/terminology/search?${toQueryString({ system, q, limit })}`),
  detail: (system: TerminologySystem, code: string) =>
    apiClient.get<TerminologyDetail>(`/terminology/${system}/${encodeURIComponent(code)}`),
};
