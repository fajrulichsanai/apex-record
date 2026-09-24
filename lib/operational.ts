import { apiClient, toQueryString } from './api-client';

export type OperationalKategori =
  | 'listrik'
  | 'air'
  | 'atk'
  | 'maintenance'
  | 'gaji'
  | 'sewa'
  | 'internet'
  | 'bahan_habis_pakai'
  | 'alat_dental'
  | 'biaya_iklan'
  | 'barang_investasi'
  | 'barang_hiburan'
  | 'lainnya';

export interface OperationalRecord {
  id: number;
  clinicId: number;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperationalPayload {
  tanggal: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
}

export type UpdateOperationalPayload = Partial<CreateOperationalPayload>;

export interface OperationalListQuery {
  search?: string;
  kategori?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OperationalListResponse {
  data: OperationalRecord[];
  meta: { total: number; page: number; limit: number };
}

export const OPERASIONAL_KATEGORI_OPTIONS: { value: string; label: string }[] = [
  { value: 'listrik', label: 'Listrik' },
  { value: 'air', label: 'Air' },
  { value: 'atk', label: 'ATK & Perlengkapan' },
  { value: 'maintenance', label: 'Maintenance & Perbaikan' },
  { value: 'gaji', label: 'Gaji & Honor' },
  { value: 'sewa', label: 'Sewa Tempat' },
  { value: 'internet', label: 'Internet & Komunikasi' },
  { value: 'bahan_habis_pakai', label: 'Beli Bahan Habis Pakai' },
  { value: 'alat_dental', label: 'Beli Alat Dental' },
  { value: 'biaya_iklan', label: 'Biaya Iklan Klinik' },
  { value: 'barang_investasi', label: 'Beli Barang Investasi' },
  { value: 'barang_hiburan', label: 'Beli Barang Hiburan' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const operationalApi = {
  list: (query?: OperationalListQuery) =>
    apiClient.get<OperationalListResponse>(
      '/operational-records' + (query ? '?' + toQueryString(query) : '')
    ),

  get: (id: number) => apiClient.get<OperationalRecord>(`/operational-records/${id}`),

  create: (payload: CreateOperationalPayload) =>
    apiClient.post<OperationalRecord>('/operational-records', payload),

  update: (id: number, payload: UpdateOperationalPayload) =>
    apiClient.put<OperationalRecord>(`/operational-records/${id}`, payload),

  delete: (id: number) => apiClient.delete<{ success: boolean }>(`/operational-records/${id}`),
};
