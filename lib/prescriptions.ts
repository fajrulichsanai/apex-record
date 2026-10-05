import { API_BASE, apiClient, ApiError } from './api-client';
import type { Signa } from './signa';


export interface PrescriptionItem {
  id: number;
  encounterId?: number;
  drugName: string;
  /** Kode KFA (SATUSEHAT); null bila obat diketik bebas */
  kfaCode?: string | null;
  kfaName?: string | null;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
  /** Bentuk sediaan, mis. "Tablet" */
  dosageForm?: string | null;
  /** Numero (jumlah) — ditulis "No. XV" */
  numero?: number | null;
  /** Aturan pakai terstruktur */
  signa?: Signa | null;
  /** Racikan: SD = d.t.d, EP = dibagi rata */
  compoundType?: CompoundType | null;
  compoundFormCode?: string | null;
  compoundFormName?: string | null;
  compoundUnit?: string | null;
  ingredients?: CompoundIngredient[] | null;
  routeCode?: string | null;
}

export type CompoundType = 'SD' | 'EP';

/** Tanda tangan dokter pada lembar resep */
export interface PrescriptionSignature {
  signature: string;
  signedAt: string;
  signedBy: number | null;
}

export interface CompoundIngredient {
  /** Kode KFA zat aktif (91…) atau produk (92…/93…) */
  kfaCode: string;
  name: string;
  amount: number;
  amountUnit: string;
  perAmount: number;
  perUnit: string;
}

/** Pasang kode KFA, atau jadikan racikan dengan bahan berkode KFA */
export interface PrescriptionCodingPayload {
  kfaCode?: string;
  kfaName?: string;
  compoundType?: CompoundType;
  compoundFormCode?: string;
  compoundFormName?: string;
  compoundUnit?: string;
  ingredients?: CompoundIngredient[];
  routeCode?: string;
}

/** Bentuk sediaan racikan (medication-form, kode dari playbook resmi SATUSEHAT) */
export const COMPOUND_FORMS: { code: string; name: string; unit: string }[] = [
  { code: 'BS047', name: 'Serbuk Oral (puyer)', unit: 'POWD' },
  { code: 'BS019', name: 'Kapsul', unit: 'CAP' },
  { code: 'BS066', name: 'Tablet', unit: 'TAB' },
  { code: 'BS055', name: 'Sirup', unit: 'SYRUP' },
  { code: 'BS030', name: 'Krim / salep', unit: 'CRM' },
  { code: 'BS059', name: 'Supositoria', unit: 'SUPP' },
];

export const STRENGTH_UNITS = ['mg', 'g', 'mcg', 'mL', 'IU', 'TAB', 'CAP', 'POWD', 'OINT', 'CRM', 'SUPP', 'SYRUP'];

/** Rute pemberian WHO ATC */
export const ROUTE_OPTIONS: { code: string; name: string }[] = [
  { code: 'O', name: 'Oral' },
  { code: 'SL', name: 'Sublingual' },
  { code: 'R', name: 'Rektal' },
  { code: 'V', name: 'Vaginal' },
  { code: 'N', name: 'Nasal' },
  { code: 'TD', name: 'Transdermal / topikal' },
  { code: 'P', name: 'Parenteral' },
];

export interface CreatePrescriptionItemPayload {
  drugName: string;
  kfaCode?: string;
  kfaName?: string;
  dosageForm?: string;
  numero?: number;
  signa?: Signa;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export const prescriptionsApi = {
  list: (encounterId: number) =>
    apiClient.get<PrescriptionItem[]>(`/encounters/${encounterId}/prescriptions`),

  create: (encounterId: number, payload: CreatePrescriptionItemPayload) =>
    apiClient.post<PrescriptionItem>(`/encounters/${encounterId}/prescriptions`, payload),

  setCoding: (encounterId: number, itemId: number, payload: PrescriptionCodingPayload) =>
    apiClient.put<PrescriptionItem>(`/encounters/${encounterId}/prescriptions/${itemId}/coding`, payload),

  getSignature: (encounterId: number) =>
    apiClient.get<PrescriptionSignature | null>(`/encounters/${encounterId}/prescriptions/signature`),

  saveSignature: (encounterId: number, signature: string) =>
    apiClient.put<PrescriptionSignature>(`/encounters/${encounterId}/prescriptions/signature`, { signature }),

  removeSignature: (encounterId: number) =>
    apiClient.delete<null>(`/encounters/${encounterId}/prescriptions/signature`),

  remove: (encounterId: number, itemId: number) =>
    apiClient.delete<void>(`/encounters/${encounterId}/prescriptions/${itemId}`),

  downloadPdf: async (encounterId: number) => {
    const res = await fetch(`${API_BASE}/encounters/${encounterId}/prescriptions/pdf`);
    if (!res.ok) {
      let message = 'Gagal mengunduh resep PDF';
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        // ignore — fall back to the generic message
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename = `resep-${encounterId}.pdf`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
