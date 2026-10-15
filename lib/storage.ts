import { apiClient } from './api-client';

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  /** clinic = jatah klinik sendiri; multiklinik = dipakai bersama semua cabang. */
  scope: 'clinic' | 'multiklinik';
  clinicUsedBytes: number;
  activeBranches?: number;
  /** Jatah dari paket (GB). */
  includedGb: number;
  /** Storage tambahan yang berlaku (GB). */
  extraGb: number;
  /** Harga storage tambahan per GB per bulan. */
  pricePerGb: number;
  /** Bagian storage tambahan yang ditagih saat ini (bonus yang masih gratis tidak). */
  billableExtraGb: number;
  /** Bonus Super Admin yang masih gratis; freeUntil null = selamanya. */
  bonuses: { id: number; gb: number; freeUntil: string | null }[];
}

export interface StorageAddonRow {
  id: number;
  gb: number;
  source: 'purchase' | 'admin';
  note: string | null;
  isFree: boolean;
  freeUntil: string | null;
  createdAt: string;
}

export interface ClinicStorageRow {
  clinicId: number;
  clinicName: string;
  usedBytes: number;
  limitBytes: number;
  scope: 'clinic' | 'multiklinik';
  poolUsedBytes: number;
  extraGb: number;
}

export const storageApi = {
  usage: () => apiClient.get<StorageQuota>('/storage/usage'),
  /** Owner multiklinik: jatah bersama semua cabang. */
  pool: () => apiClient.get<StorageQuota>('/storage/pool'),
  /** Beli storage tambahan: langsung aktif, ditagih di perpanjangan berikutnya. */
  purchase: (gb: number) => apiClient.post<StorageQuota>('/storage/addons', { gb }),
  clinics: () => apiClient.get<ClinicStorageRow[]>('/storage/clinics'),
  owner: (ownerId: number) => apiClient.get<StorageQuota>(`/storage/owners/${ownerId}`),
  /** Super Admin: tambah (gb > 0) atau kurangi (gb < 0) storage tambahan. */
  adjust: (payload: {
    clinicId?: number;
    ownerId?: number;
    gb: number;
    note?: string;
    /** Bonus gratis; freeMonths null = selamanya. */
    free?: boolean;
    freeMonths?: number | null;
  }) => apiClient.post<StorageQuota>('/storage/addons/adjust', payload),
  /** Super Admin: riwayat storage tambahan & bonus. */
  addons: (target: { clinicId?: number; ownerId?: number }) =>
    apiClient.get<StorageAddonRow[]>(`/storage/addons?${new URLSearchParams(
      Object.entries(target).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    ).toString()}`),
  /** Super Admin: cabut bonus. */
  revokeBonus: (id: number) => apiClient.delete(`/storage/addons/${id}`),
};

/** Tahunan = 10× bulanan, sama seperti harga paket. */
export function storageAddonCost(extraGb: number, pricePerGb: number, cycle: 'monthly' | 'yearly' | string | null | undefined) {
  return Math.max(0, extraGb) * pricePerGb * (cycle === 'yearly' ? 10 : 1);
}

/** Satuan desimal (1 GB = 1000 MB), sama dengan backend. */
export const GB = 1000 ** 3;
const MB = 1000 ** 2;

export function formatDateId(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "100 MB" untuk 0,1 GB, "5 GB" untuk 5. */
export function formatGb(gb: number): string {
  return formatBytes(Math.round(gb * GB));
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString('id-ID', { maximumFractionDigits: 2 })} GB`;
  if (bytes >= MB) return `${(bytes / MB).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
  if (bytes > 0) return `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('id-ID')} KB`;
  return '0 MB';
}

/** 0..1, and the tone the meter should use. */
export function storageLevel(used: number, limit: number): { ratio: number; tone: '' | 'warn' | 'bad' } {
  const ratio = limit > 0 ? used / limit : used > 0 ? 1 : 0;
  return { ratio, tone: ratio >= 1 ? 'bad' : ratio >= 0.9 ? 'warn' : '' };
}
