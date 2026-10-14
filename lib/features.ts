import { apiClient } from './api-client';
import type { UserRole } from '@/types/user';

/** Fitur yang aktif untuk user yang sedang login (dari server) */
export interface EffectiveFeatures {
  features: string[];
}

export interface FeatureToggle {
  key: string;
  label: string;
  enabled: boolean;
  /** Belum diatur — mengikuti bawaan */
  isDefault: boolean;
  /** Hanya pengaturan per user: bawaan role-nya */
  roleDefault?: boolean;
}

export interface ClinicFeatures {
  /** Saklar global platform; selama mati, SATUSEHAT tidak berjalan di klinik mana pun */
  satusehatGlobalEnabled: boolean;
  standard: FeatureToggle[];
}

export interface UserFeatures {
  user: { id: number; name: string; email: string; role: UserRole };
  standard: FeatureToggle[];
}

export interface PlatformSettings {
  satusehatEnabled: boolean;
}

/** Status SATUSEHAT sebuah klinik: aktif hanya bila global DAN klinik menyala */
export interface ClinicSatusehat {
  globalEnabled: boolean;
  enabled: boolean;
  active: boolean;
}

export const featuresApi = {
  me: () => apiClient.get<EffectiveFeatures>('/features/me'),

  // Owner: fitur per user
  userFeatures: (userId: number) => apiClient.get<UserFeatures>(`/users/${userId}/features`),
  setUserFeature: (userId: number, featureKey: string, enabled: boolean | null) =>
    apiClient.put<UserFeatures>(`/users/${userId}/features`, { featureKey, enabled }),

  // Owner klinik: saklar SATUSEHAT kliniknya
  clinicSatusehat: () => apiClient.get<ClinicSatusehat>('/features/clinic/satusehat'),
  setClinicSatusehat: (enabled: boolean) => apiClient.put<ClinicSatusehat>('/features/clinic/satusehat', { enabled }),

  // Super admin: fitur per klinik & pengaturan platform
  clinicFeatures: (clinicId: number) => apiClient.get<ClinicFeatures>(`/super-admin/clinics/${clinicId}/features`),
  setClinicFeature: (clinicId: number, featureKey: string, enabled: boolean | null) =>
    apiClient.put<ClinicFeatures>(`/super-admin/clinics/${clinicId}/features`, { featureKey, enabled }),
  platformSettings: () => apiClient.get<PlatformSettings>('/super-admin/platform-settings'),
  setPlatformSatusehat: (enabled: boolean) =>
    apiClient.put<PlatformSettings>('/super-admin/platform-settings/satusehat', { enabled }),
};
