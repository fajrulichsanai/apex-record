import { apiClient } from './api-client';

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  /** clinic = jatah klinik sendiri; multiklinik = dipakai bersama semua cabang. */
  scope: 'clinic' | 'multiklinik';
  clinicUsedBytes: number;
  activeBranches?: number;
}

export interface ClinicStorageRow {
  clinicId: number;
  clinicName: string;
  usedBytes: number;
  limitBytes: number;
  scope: 'clinic' | 'multiklinik';
  poolUsedBytes: number;
}

export const storageApi = {
  usage: () => apiClient.get<StorageQuota>('/storage/usage'),
  clinics: () => apiClient.get<ClinicStorageRow[]>('/storage/clinics'),
};

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
  return { ratio, tone: ratio >= 1 ? 'bad' : ratio >= 0.85 ? 'warn' : '' };
}
