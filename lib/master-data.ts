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
  jenis_sarana?: { kode: string; nama: string };
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
}

export const saranaApi = {
  search: (query: SearchSaranaQuery) =>
    apiClient.get<SaranaListResponse>(
      `/api/master-data/sarana?${toQueryString(query)}`
    ),

  getByKodeSatusehat: (kode: string) =>
    apiClient.get<SaranaItem>(`/api/master-data/sarana/${kode}`),
};
