import { apiClient } from './api-client';

export type ReferralStatus = 'draft' | 'criteria' | 'candidates' | 'sent' | 'local' | 'cancelled';

export interface ReferralCoding {
  code: string;
  display: string;
}

export interface ReferralCandidate {
  orgId: string;
  name: string;
  distanceKm: number | null;
  strata: string | null;
  bpjsCode: string | null;
}

/** Item Questionnaire FHIR dari SATUSEHAT Rujukan (kriteria / jejaring wilayah) */
export interface QuestionnaireItem {
  linkId: string;
  text?: string;
  type?: string;
  item?: QuestionnaireItem[];
  answerOption?: { valueCoding?: { code: string; display?: string; system?: string } }[];
}

export interface ReferralQuestionnaire {
  title?: string;
  item?: QuestionnaireItem[];
}

export interface Referral {
  id: number;
  encounterId: number;
  careType: 'outpatient';
  status: ReferralStatus;
  primaryDiagnosis: ReferralCoding;
  secondaryDiagnoses: ReferralCoding[] | null;
  serviceGroup: ReferralCoding;
  specialty: ReferralCoding;
  performerType: ReferralCoding | null;
  reason: string;
  patientInstruction: string | null;
  plannedDate: string;
  pcareNumber: string | null;
  targetOrgId: string | null;
  targetName: string | null;
  questionnaires: { criteria: ReferralQuestionnaire | null; area: ReferralQuestionnaire | null } | null;
  area: { provinceCode: string; provinceName: string; cityCode: string; cityName: string } | null;
  candidates: ReferralCandidate[] | null;
  serviceRequestId: string | null;
  referralNumber: string | null;
  sentAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface CreateReferralPayload {
  careType: 'outpatient';
  primaryDiagnosis: string;
  secondaryDiagnoses?: string[];
  serviceGroup: string;
  specialty: string;
  performerType?: string;
  reason: string;
  patientInstruction?: string;
  plannedDate: string;
  pcareNumber?: string;
  manual?: boolean;
  targetName?: string;
}

export type AnswerValue = boolean | string | { code: string };

type Opt = { value: string; label: string };
export interface ReferralOptions {
  careTypes: Opt[];
  serviceGroups: Opt[];
  specialties: Opt[];
  performerTypes: Opt[];
}

export const referralsApi = {
  options: () => apiClient.get<ReferralOptions>('/referrals/options'),
  list: (encounterId: number) => apiClient.get<Referral[]>(`/encounters/${encounterId}/referrals`),
  create: (encounterId: number, data: CreateReferralPayload) =>
    apiClient.post<Referral>(`/encounters/${encounterId}/referrals`, data),
  retry: (id: number) => apiClient.post<Referral>(`/referrals/${id}/retry`, {}),
  candidates: (id: number, data: { criteria: Record<string, AnswerValue>; areaAnswers?: Record<string, AnswerValue> }) =>
    apiClient.post<Referral>(`/referrals/${id}/candidates`, data),
  send: (id: number, targetOrgId: string) => apiClient.post<Referral>(`/referrals/${id}/send`, { targetOrgId }),
  cancel: (id: number) => apiClient.post<Referral>(`/referrals/${id}/cancel`, {}),
};
