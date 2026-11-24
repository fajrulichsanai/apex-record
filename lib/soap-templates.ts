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

/** Satu pilihan jawaban; `text` (bila ada) yang masuk ke catatan, selain label tombol. */
export type SoapQuestionOption = string | { label: string; text: string };

/** Pertanyaan cepat untuk asisten: jawaban mengisi token `{key}` di teks template. */
export interface SoapQuestion {
  key: string;
  label: string;
  section: 'S' | 'O' | 'A' | 'Tr' | 'P';
  options: SoapQuestionOption[];
  multi?: boolean;
}

/** Jawaban terpilih per pertanyaan (label tombol). */
export type SoapAnswers = Record<string, string[]>;

export const optionLabel = (o: SoapQuestionOption) => (typeof o === 'string' ? o : o.label);

export interface SoapPreset extends SoapTemplateBody {
  key: string;
  name: string;
  category: string;
  questions?: SoapQuestion[];
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

/**
 * Isi token template: jawaban pertanyaan cepat (`{key}`; belum dijawab = "-")
 * lalu `{gigi}` dengan nomor gigi (kosong = token dihapus rapi).
 */
export function fillTemplate(
  text: string | null | undefined,
  gigi: string,
  answers?: SoapAnswers,
  questions?: SoapQuestion[],
): string {
  if (!text) return '';
  let out = text;
  for (const q of questions ?? []) {
    const parts = (answers?.[q.key] ?? []).map((label) => {
      const opt = q.options.find((o) => optionLabel(o) === label);
      return typeof opt === 'object' ? opt.text : label;
    });
    out = out.split(`{${q.key}}`).join(parts.length ? parts.join(', ') : '-');
  }
  const value = gigi.trim();
  return (value ? out.replace(/\{gigi\}/g, value) : out.replace(/\s*\{gigi\}/g, '')).trim();
}
