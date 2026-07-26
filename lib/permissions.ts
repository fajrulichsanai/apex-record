import type { UserRole } from '@/types/user';

export type FeatureKey =
  | 'dashboard'
  | 'pasien'
  | 'reservasi'
  | 'kunjungan'
  | 'billing'
  | 'operasional'
  | 'laporan-kunjungan'
  | 'laporan-keuangan'
  | 'info-klinik'
  | 'tarif'
  | 'user-management';

const FULL_ACCESS: FeatureKey[] = [
  'dashboard',
  'pasien',
  'reservasi',
  'kunjungan',
  'billing',
  'operasional',
  'laporan-kunjungan',
  'laporan-keuangan',
  'info-klinik',
  'tarif',
  'user-management',
];

const ROLE_FEATURES: Record<UserRole, FeatureKey[]> = {
  super_admin: FULL_ACCESS,
  owner: FULL_ACCESS,
  admin: [
    'dashboard',
    'pasien',
    'reservasi',
    'kunjungan',
    'billing',
    'operasional',
    'laporan-kunjungan',
    'info-klinik',
    'tarif',
  ],
  dokter: ['pasien', 'reservasi', 'kunjungan'],
  pending: [],
};

const VIEW_ONLY_FEATURES: Partial<Record<UserRole, FeatureKey[]>> = {
  admin: ['info-klinik', 'tarif'],
};

export function canAccessFeature(role: UserRole | undefined, feature: FeatureKey): boolean {
  if (!role) return false;
  return ROLE_FEATURES[role]?.includes(feature) ?? false;
}

export function isFeatureViewOnly(role: UserRole | undefined, feature: FeatureKey): boolean {
  if (!role) return false;
  return VIEW_ONLY_FEATURES[role]?.includes(feature) ?? false;
}

export function defaultRouteForRole(role: UserRole | undefined): string {
  if (role === 'dokter') return '/list-pasien';
  return '/dashboard';
}
