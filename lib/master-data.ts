import { apiClient } from './api-client';

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
