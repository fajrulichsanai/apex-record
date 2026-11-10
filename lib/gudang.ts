import { apiClient, toQueryString } from './api-client';

export interface Barang {
  id: number;
  clinicId: number;
  name: string;
  sku: string;
  kategori?: string;
  satuanBeli: string;
  satuanPakai: string;
  konversiQty: number;
  supplierName?: string;
  hargaBeli: number;
  stokMinimum: number;
  stokSaatIni: number;
  trackExpiry: boolean;
  lokasiSimpan?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBarangPayload {
  name: string;
  sku: string;
  kategori?: string;
  satuanBeli: string;
  satuanPakai: string;
  konversiQty?: number;
  supplierName?: string;
  hargaBeli?: number;
  stokMinimum?: number;
  trackExpiry?: boolean;
  lokasiSimpan?: string;
}

export interface UpdateBarangPayload extends Partial<CreateBarangPayload> {
  isActive?: boolean;
}

export interface BarangListResponse {
  data: Barang[];
  meta: { total: number; page: number; limit: number };
}

export type StokTransaksiType = 'in' | 'out' | 'adjustment' | 'expired';

export interface StokTransaksi {
  id: number;
  clinicId: number;
  barangId: number;
  barang?: Barang;
  type: StokTransaksiType;
  qty: number;
  hargaBeli?: number;
  noFaktur?: string;
  noBatch?: string;
  tanggalExpiry?: string;
  alasan?: string;
  tanggal: string;
  createdByUserId?: number;
  createdAt: string;
}

export interface CreateStokTransaksiPayload {
  barangId: number;
  type: StokTransaksiType;
  qty: number;
  hargaBeli?: number;
  noFaktur?: string;
  noBatch?: string;
  tanggalExpiry?: string;
  alasan?: string;
  tanggal: string;
}

export interface StokTransaksiListResponse {
  data: StokTransaksi[];
  meta: { total: number; page: number; limit: number };
}

export interface TindakanBom {
  id: number;
  clinicId: number;
  tarifId: number;
  barangId: number;
  barang?: Barang;
  qtyPakai: number;
  wajib: boolean;
}

export interface CreateTindakanBomPayload {
  tarifId: number;
  barangId: number;
  qtyPakai: number;
  wajib?: boolean;
}

export interface UpdateTindakanBomPayload {
  qtyPakai?: number;
  wajib?: boolean;
}

export interface GudangDashboard {
  totalItems: number;
  lowStockCount: number;
  lowStockItems: { id: number; name: string; sku: string; stokSaatIni: number; stokMinimum: number }[];
  totalInventoryValue: number;
  nearExpiryCount: number;
}

export const gudangApi = {
  listBarang: (query?: { search?: string; kategori?: string; isActive?: boolean; lowStock?: boolean; page?: number; limit?: number }) =>
    apiClient.get<BarangListResponse>('/gudang/barang' + (query ? '?' + toQueryString(query) : '')),

  getBarang: (id: number) =>
    apiClient.get<Barang>(`/gudang/barang/${id}`),

  createBarang: (payload: CreateBarangPayload) =>
    apiClient.post<Barang>('/gudang/barang', payload),

  updateBarang: (id: number, payload: UpdateBarangPayload) =>
    apiClient.patch<Barang>(`/gudang/barang/${id}`, payload),

  deleteBarang: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/gudang/barang/${id}`),

  listTransaksi: (query?: { barangId?: number; type?: StokTransaksiType; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    apiClient.get<StokTransaksiListResponse>('/gudang/transaksi' + (query ? '?' + toQueryString(query) : '')),

  createTransaksi: (payload: CreateStokTransaksiPayload) =>
    apiClient.post<StokTransaksi>('/gudang/transaksi', payload),

  getDashboard: () =>
    apiClient.get<GudangDashboard>('/gudang/dashboard'),

  listOpname: () => apiClient.get<StockOpnameSummary[]>('/gudang/opname'),

  getOpname: (id: number) => apiClient.get<StockOpnameDetail>(`/gudang/opname/${id}`),

  createOpname: (payload: {
    tanggal: string;
    note?: string;
    items: { barangId: number; stokFisik: number; catatan?: string }[];
  }) => apiClient.post<StockOpnameDetail>('/gudang/opname', payload),

  listBom: (tarifId: number) =>
    apiClient.get<TindakanBom[]>(`/gudang/bom?tarifId=${tarifId}`),

  createBom: (payload: CreateTindakanBomPayload) =>
    apiClient.post<TindakanBom>('/gudang/bom', payload),

  updateBom: (id: number, payload: UpdateTindakanBomPayload) =>
    apiClient.patch<TindakanBom>(`/gudang/bom/${id}`, payload),

  deleteBom: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/gudang/bom/${id}`),
};

export interface StockOpnameSummary {
  id: number;
  tanggal: string;
  note: string | null;
  totalSelisihNilai: number;
  createdByName: string | null;
  createdAt: string;
  itemCount: number;
  selisihCount: number;
}

export interface StockOpnameDetail {
  id: number;
  tanggal: string;
  note: string | null;
  totalSelisihNilai: number;
  createdByName: string | null;
  createdAt: string;
  items: {
    id: number;
    barangId: number;
    name: string;
    stokSistem: number;
    stokFisik: number;
    selisih: number;
    hargaBeli: number;
    catatan: string | null;
  }[];
}
