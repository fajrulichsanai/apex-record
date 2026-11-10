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

export interface OperationalSummary {
  /** Total & jumlah catatan untuk periode + pencarian (tidak terpengaruh filter kategori). */
  total: number;
  count: number;
  byKategori: { kategori: string; total: number; count: number }[];
  /** Total untuk daftar yang sedang tampil (memperhitungkan filter kategori). */
  filteredTotal: number;
}

export interface OperationalListResponse {
  data: OperationalRecord[];
  meta: { total: number; page: number; limit: number; totalPages?: number };
  summary?: OperationalSummary;
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

/** Tampilan tiap kategori di layar: ikon, warna, dan contoh keterangan. */
export interface KategoriMeta {
  icon: string;
  tone: 'green' | 'blue' | 'orange' | 'violet' | 'red' | 'gray';
  example: string;
}

export const KATEGORI_META: Record<string, KategoriMeta> = {
  bahan_habis_pakai: { icon: 'inventory_2', tone: 'green', example: 'mis. Sarung tangan, masker, cotton roll' },
  gaji: { icon: 'payments', tone: 'blue', example: 'mis. Gaji perawat Oktober' },
  sewa: { icon: 'storefront', tone: 'violet', example: 'mis. Sewa ruko bulan ini' },
  listrik: { icon: 'bolt', tone: 'orange', example: 'mis. Tagihan PLN Oktober' },
  air: { icon: 'water_drop', tone: 'blue', example: 'mis. Tagihan PDAM' },
  internet: { icon: 'wifi', tone: 'violet', example: 'mis. Wifi & pulsa kantor' },
  maintenance: { icon: 'build', tone: 'orange', example: 'mis. Servis dental unit / AC' },
  atk: { icon: 'edit_note', tone: 'green', example: 'mis. Kertas, tinta printer' },
  alat_dental: { icon: 'medical_services', tone: 'red', example: 'mis. Scaler baru, handpiece' },
  biaya_iklan: { icon: 'campaign', tone: 'violet', example: 'mis. Iklan Instagram' },
  barang_investasi: { icon: 'trending_up', tone: 'blue', example: 'mis. Kursi gigi, kompresor' },
  barang_hiburan: { icon: 'sports_esports', tone: 'gray', example: 'mis. TV ruang tunggu' },
  lainnya: { icon: 'more_horiz', tone: 'gray', example: 'mis. Parkir, konsumsi, dll.' },
};

/** Kategori buatan sendiri (di luar daftar) memakai tampilan "lainnya". */
export const kategoriMeta = (value: string): KategoriMeta => KATEGORI_META[value] ?? { icon: 'sell', tone: 'gray', example: '' };

/** Urutan tombol kategori di formulir: yang paling sering dipakai klinik di depan. */
export const KATEGORI_FORM_ORDER = [
  'bahan_habis_pakai',
  'gaji',
  'sewa',
  'listrik',
  'air',
  'internet',
  'maintenance',
  'atk',
  'alat_dental',
  'biaya_iklan',
  'barang_investasi',
  'barang_hiburan',
  'lainnya',
] as const;

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
