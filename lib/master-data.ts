import { apiClient, toQueryString } from './api-client';

export interface WilayahItem {
  code: string;
  parent_code: string;
  bps_code: string;
  name: string;
}

export const masterDataApi = {
  getProvinces: () =>
    apiClient.get<WilayahItem[]>('/api/master-data/provinces'),

  getCities: (provinceCode: string) =>
    apiClient.get<WilayahItem[]>(
      `/api/master-data/cities?province_codes=${provinceCode}`
    ),

  getDistricts: (cityCode: string) =>
    apiClient.get<WilayahItem[]>(
      `/api/master-data/districts?city_codes=${cityCode}`
    ),

  getSubDistricts: (districtCode: string) =>
    apiClient.get<WilayahItem[]>(
      `/api/master-data/sub-districts?district_codes=${districtCode}`
    ),
};

// ── Master Sarana Index (MSI) SATUSEHAT ──────────────────────────────────

export const JENIS_SARANA_OPTIONS = [
  { value: 101, label: 'Praktik Mandiri' },
  { value: 102, label: 'Puskesmas' },
  { value: 103, label: 'Klinik' },
  { value: 104, label: 'Rumah Sakit' },
] as const;

export interface SaranaWilayah {
  kode: string;
  nama: string;
}

export interface SaranaItem {
  kode_satusehat: string;
  kode_sarana: string;
  nama: string;
  telp?: string;
  email?: string;
  alamat?: string;
  provinsi?: SaranaWilayah;
  kabkota?: SaranaWilayah;
  website?: string;
  jenis_sarana?: { kode: string; nama: string; nama_alt?: string };
  subjenis?: { kode: string; nama: string };
  kelas_sarana?: { kode: string; nama: string };
  sarana_administrasi?: { kode?: string; nama?: string; kode_sarana?: string };
  status_sarana?: string;
  status_aktif?: boolean;
}

export interface SaranaListResponse {
  page: number;
  totalPage: number;
  items: SaranaItem[];
}

export interface SearchSaranaQuery {
  page?: number;
  limit?: number;
  jenis_sarana?: number;
  nama?: string;
  kode_satusehat?: string;
  kode_sarana?: string;
  kode_provinsi?: string;
  kode_kabkota?: string;
  status_aktif?: 'true' | 'false';
  status_sarana?: 'draft' | 'verified' | 'valid' | 'reverified';
}

export const saranaApi = {
  search: (query: SearchSaranaQuery) =>
    apiClient.get<SaranaListResponse>(
      `/api/master-data/sarana?${toQueryString(query)}`
    ),

  getByKodeSatusehat: (kode: string) =>
    apiClient.get<SaranaItem>(`/api/master-data/sarana/${kode}`),
};

// ── Master Wilayah v2 (berhalaman) ───────────────────────────────────────

export type WilayahLevel = 'provinces' | 'cities' | 'districts' | 'sub-districts';

export interface WilayahV2Response {
  items: WilayahItem[];
  meta: {
    item_count?: number;
    page?: { current?: number; next?: number; total_page?: number };
  } | null;
}

export const wilayahV2Api = {
  list: (
    level: WilayahLevel,
    query: {
      current_page?: number;
      codes?: string;
      province_codes?: string;
      city_codes?: string;
      district_codes?: string;
    },
  ) => apiClient.get<WilayahV2Response>(`/api/master-data/v2/${level}?${toQueryString(query)}`),
};

// ── Kamus Farmasi & Alat Kesehatan (KFA) SATUSEHAT ───────────────────────

export interface KfaCoding {
  code: string;
  name: string;
}

export interface KfaProduct {
  kfaCode: string;
  name: string;
  active: boolean;
  group: string | null;
  dosageForm: KfaCoding | null;
  route: KfaCoding | null;
  uom: string | null;
  manufacturer: string | null;
  nie: string | null;
  generic: boolean | null;
  template: KfaCoding | null;
  activeIngredients: { kfaCode: string; name: string; strength: string | null }[];
}

export interface KfaSearchResult {
  total: number;
  page: number;
  size: number;
  items: KfaProduct[];
}

export const kfaApi = {
  search: (keyword: string, page = 1, size = 20) =>
    apiClient.get<KfaSearchResult>(
      `/api/master-data/kfa/products?${toQueryString({ keyword, page, size, product_type: 'farmasi' })}`,
    ),
  get: (kfaCode: string) => apiClient.get<KfaProduct>(`/api/master-data/kfa/products/${kfaCode}`),
};
