import { apiClient } from './api-client';
import type { SoapDiagnosis } from './terminology';

export interface SoapTemplateBody {
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  treatment?: string | null;
  plan?: string | null;
  diagnoses?: SoapDiagnosis[] | null;
}

export interface SoapPreset extends SoapTemplateBody {
  key: string;
  name: string;
  category: string;
}

export interface SoapTemplate extends SoapTemplateBody {
  id: number;
  name: string;
  isShared: boolean;
  createdBy: number;
}

export const soapTemplateApi = {
  presets: () => apiClient.get<SoapPreset[]>('/settings/soap-templates/presets'),
  list: () => apiClient.get<SoapTemplate[]>('/settings/soap-templates'),
  create: (body: SoapTemplateBody & { name: string; isShared?: boolean }) =>
    apiClient.post<SoapTemplate>('/settings/soap-templates', body),
  remove: (id: number) => apiClient.delete<void>(`/settings/soap-templates/${id}`),
};

/** Ganti `{gigi}` dengan nomor gigi; bila kosong, token dihapus rapi. */
export function fillTemplate(text: string | null | undefined, gigi: string): string {
  if (!text) return '';
  const value = gigi.trim();
  return (value ? text.replace(/\{gigi\}/g, value) : text.replace(/\s*\{gigi\}/g, '')).trim();
}
