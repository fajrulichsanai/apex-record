import { apiClient } from './api-client';

export interface ImmunizationRecord {
  id: number;
  encounterId: number;
  kfaCode: string;
  vaccineName: string;
  doseNumber: number;
  doseMl: string | null;
  route: string | null;
  site: string | null;
  lotNumber: string | null;
  expirationDate: string | null;
  occurredAt: string;
  note: string | null;
}

export interface ImmunizationPayload {
  kfaCode: string;
  vaccineName: string;
  doseNumber: number;
  doseMl?: number;
  route?: string;
  site?: string;
  lotNumber?: string;
  expirationDate?: string;
  note?: string;
}

type Opt = { value: string; label: string };

export const immunizationsApi = {
  options: () => apiClient.get<{ routes: Opt[]; sites: Opt[] }>('/immunizations/options'),
  list: (encounterId: number) => apiClient.get<ImmunizationRecord[]>(`/encounters/${encounterId}/immunizations`),
  create: (encounterId: number, data: ImmunizationPayload) =>
    apiClient.post<ImmunizationRecord>(`/encounters/${encounterId}/immunizations`, data),
  remove: (encounterId: number, id: number) =>
    apiClient.delete<{ removed: true; pendingSync: boolean }>(`/encounters/${encounterId}/immunizations/${id}`),
};
