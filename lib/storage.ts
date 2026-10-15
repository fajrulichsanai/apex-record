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
  adjust: (payload: { clinicId?: number; ownerId?: number; gb: number; note?: string }) =>
    apiClient.post<StorageQuota>('/storage/addons/adjust', payload),
};

/** Tahunan = 10× bulanan, sama seperti harga paket. */
export function storageAddonCost(extraGb: number, pricePerGb: number, cycle: 'monthly' | 'yearly' | string | null | undefined) {
  return Math.max(0, extraGb) * pricePerGb * (cycle === 'yearly' ? 10 : 1);
}

const GB = 1024 ** 3;

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString('id-ID', { maximumFractionDigits: 2 })} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`;
  if (bytes > 0) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('id-ID')} KB`;
  return '0 MB';
}

/** 0..1, and the tone the meter should use. */
export function storageLevel(used: number, limit: number): { ratio: number; tone: '' | 'warn' | 'bad' } {
  const ratio = limit > 0 ? used / limit : used > 0 ? 1 : 0;
  return { ratio, tone: ratio >= 1 ? 'bad' : ratio >= 0.9 ? 'warn' : '' };
}
