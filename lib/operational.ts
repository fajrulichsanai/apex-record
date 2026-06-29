export type OperationalKategori =
  | 'listrik'
  | 'air'
  | 'atk'
  | 'maintenance'
  | 'gaji'
  | 'sewa'
  | 'internet'
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
  { value: 'lainnya', label: 'Lainnya' },
];

const delay = <T,>(value: T, ms = 350) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

function generateMockOperationalRecords(): OperationalRecord[] {
  const now = new Date();
  const seed: Array<{ offsetMonth: number; day: number; kategori: string; deskripsi: string; nominal: number }> = [
    { offsetMonth: 0, day: 2, kategori: 'listrik', deskripsi: 'Pembayaran listrik bulanan', nominal: 1250000 },
    { offsetMonth: 0, day: 3, kategori: 'air', deskripsi: 'Pembayaran PDAM', nominal: 320000 },
    { offsetMonth: 0, day: 5, kategori: 'atk', deskripsi: 'Beli ATK & alat tulis kantor', nominal: 450000 },
    { offsetMonth: 0, day: 7, kategori: 'internet', deskripsi: 'Internet & WiFi klinik', nominal: 500000 },
    { offsetMonth: 0, day: 10, kategori: 'maintenance', deskripsi: 'Servis AC ruang tindakan', nominal: 750000 },
    { offsetMonth: 0, day: 12, kategori: 'gaji', deskripsi: 'Honor perawat paruh waktu', nominal: 2500000 },
    { offsetMonth: 0, day: 15, kategori: 'sewa', deskripsi: 'Sewa tempat bulanan', nominal: 5000000 },
    { offsetMonth: 0, day: 18, kategori: 'lainnya', deskripsi: 'Konsumsi rapat staf', nominal: 175000 },
    { offsetMonth: 0, day: 20, kategori: 'maintenance', deskripsi: 'Perbaikan dental chair', nominal: 980000 },
    { offsetMonth: 0, day: 22, kategori: 'atk', deskripsi: 'Cetak formulir rekam medis', nominal: 260000 },
    { offsetMonth: 1, day: 2, kategori: 'listrik', deskripsi: 'Pembayaran listrik bulanan', nominal: 1180000 },
    { offsetMonth: 1, day: 4, kategori: 'air', deskripsi: 'Pembayaran PDAM', nominal: 300000 },
    { offsetMonth: 1, day: 6, kategori: 'internet', deskripsi: 'Internet & WiFi klinik', nominal: 500000 },
    { offsetMonth: 1, day: 9, kategori: 'gaji', deskripsi: 'Honor perawat paruh waktu', nominal: 2500000 },
    { offsetMonth: 1, day: 11, kategori: 'sewa', deskripsi: 'Sewa tempat bulanan', nominal: 5000000 },
    { offsetMonth: 1, day: 14, kategori: 'maintenance', deskripsi: 'Servis sterilisator', nominal: 620000 },
    { offsetMonth: 1, day: 17, kategori: 'lainnya', deskripsi: 'Cetak banner promosi', nominal: 350000 },
    { offsetMonth: 1, day: 21, kategori: 'atk', deskripsi: 'Beli tinta printer', nominal: 220000 },
    { offsetMonth: 2, day: 1, kategori: 'listrik', deskripsi: 'Pembayaran listrik bulanan', nominal: 1300000 },
    { offsetMonth: 2, day: 5, kategori: 'air', deskripsi: 'Pembayaran PDAM', nominal: 310000 },
    { offsetMonth: 2, day: 8, kategori: 'gaji', deskripsi: 'Honor perawat paruh waktu', nominal: 2500000 },
    { offsetMonth: 2, day: 13, kategori: 'sewa', deskripsi: 'Sewa tempat bulanan', nominal: 5000000 },
    { offsetMonth: 2, day: 16, kategori: 'maintenance', deskripsi: 'Servis genset cadangan', nominal: 890000 },
    { offsetMonth: 2, day: 19, kategori: 'internet', deskripsi: 'Internet & WiFi klinik', nominal: 500000 },
    { offsetMonth: 2, day: 24, kategori: 'lainnya', deskripsi: 'Konsumsi pelatihan staf', nominal: 410000 },
  ];

  return seed.map((item, idx) => {
    const date = new Date(now.getFullYear(), now.getMonth() - item.offsetMonth, item.day);
    const iso = date.toISOString().slice(0, 10);
    return {
      id: idx + 1,
      clinicId: 1,
      tanggal: iso,
      kategori: item.kategori,
      deskripsi: item.deskripsi,
      nominal: item.nominal,
      createdAt: iso,
      updatedAt: iso,
    };
  });
}

let _mockStore: OperationalRecord[] = generateMockOperationalRecords();
let _nextId = _mockStore.length + 1;

function filterAndPaginate(query?: OperationalListQuery): OperationalListResponse {
  const q = query?.search?.toLowerCase() ?? '';
  const kategori = query?.kategori ?? '';
  const start = query?.startDate;
  const end = query?.endDate;

  const filtered = _mockStore.filter((item) => {
    const matchQ = !q || item.deskripsi.toLowerCase().includes(q);
    const matchKategori = !kategori || item.kategori === kategori;
    const matchStart = !start || item.tanggal >= start;
    const matchEnd = !end || item.tanggal <= end;
    return matchQ && matchKategori && matchStart && matchEnd;
  });

  const sorted = [...filtered].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

  return {
    data: sorted,
    meta: { total: sorted.length, page: query?.page ?? 1, limit: query?.limit ?? sorted.length },
  };
}

function mustFind(id: number): OperationalRecord {
  const found = _mockStore.find((item) => item.id === id);
  if (!found) throw new Error('Operational record not found');
  return found;
}

function insertRecord(payload: CreateOperationalPayload): OperationalRecord {
  const now = new Date().toISOString();
  const record: OperationalRecord = {
    id: _nextId++,
    clinicId: 1,
    tanggal: payload.tanggal,
    kategori: payload.kategori,
    deskripsi: payload.deskripsi,
    nominal: payload.nominal,
    createdAt: now,
    updatedAt: now,
  };
  _mockStore = [record, ..._mockStore];
  return record;
}

function updateRecord(id: number, payload: UpdateOperationalPayload): OperationalRecord {
  const existing = mustFind(id);
  const updated: OperationalRecord = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  _mockStore = _mockStore.map((item) => (item.id === id ? updated : item));
  return updated;
}

function deleteRecord(id: number): { success: boolean } {
  mustFind(id);
  _mockStore = _mockStore.filter((item) => item.id !== id);
  return { success: true };
}

export const operationalApi = {
  list: (query?: OperationalListQuery) => delay(filterAndPaginate(query)),
  get: (id: number) => delay(mustFind(id)),
  create: (payload: CreateOperationalPayload) => delay(insertRecord(payload)),
  update: (id: number, payload: UpdateOperationalPayload) => delay(updateRecord(id, payload)),
  delete: (id: number) => delay(deleteRecord(id)),

  // REAL IMPLEMENTATION (swap in when backend is ready, keep signatures identical):
  // list: (query) => apiClient.get<OperationalListResponse>('/operational-records' + (query ? '?' + new URLSearchParams(query as any).toString() : '')),
  // get: (id) => apiClient.get<OperationalRecord>(`/operational-records/${id}`),
  // create: (payload) => apiClient.post<OperationalRecord>('/operational-records', payload),
  // update: (id, payload) => apiClient.put<OperationalRecord>(`/operational-records/${id}`, payload),
  // delete: (id) => apiClient.delete<{ success: boolean }>(`/operational-records/${id}`),
};
