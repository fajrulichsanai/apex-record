import { apiClient } from './api-client';
import type { UserRole } from '@/types/user';

/** Fitur yang aktif untuk user yang sedang login (dari server) */
export interface EffectiveFeatures {
  features: string[];
  custom: { key: string; name: string }[];
}

export interface FeatureToggle {
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  /** Belum diatur — mengikuti bawaan */
  isDefault: boolean;
  /** Hanya pengaturan per user: bawaan role-nya */
  roleDefault?: boolean;
}

export interface ClinicFeatures {
  standard: FeatureToggle[];
  custom: FeatureToggle[];
}

export interface UserFeatures extends ClinicFeatures {
  user: { id: number; name: string; email: string; role: UserRole };
}

export interface CustomFeature {
  id: number;
  key: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export const featuresApi = {
  me: () => apiClient.get<EffectiveFeatures>('/features/me'),

  // Owner: fitur per user
  userFeatures: (userId: number) => apiClient.get<UserFeatures>(`/users/${userId}/features`),
  setUserFeature: (userId: number, featureKey: string, enabled: boolean | null) =>
    apiClient.put<UserFeatures>(`/users/${userId}/features`, { featureKey, enabled }),

  // Super admin: fitur per klinik & fitur custom
  clinicFeatures: (clinicId: number) => apiClient.get<ClinicFeatures>(`/super-admin/clinics/${clinicId}/features`),
  setClinicFeature: (clinicId: number, featureKey: string, enabled: boolean | null) =>
    apiClient.put<ClinicFeatures>(`/super-admin/clinics/${clinicId}/features`, { featureKey, enabled }),
  listCustom: () => apiClient.get<CustomFeature[]>('/super-admin/custom-features'),
  createCustom: (payload: { key: string; name: string; description?: string }) =>
    apiClient.post<CustomFeature>('/super-admin/custom-features', payload),
  deleteCustom: (id: number) => apiClient.delete<null>(`/super-admin/custom-features/${id}`),
};
