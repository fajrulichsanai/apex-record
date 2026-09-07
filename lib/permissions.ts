import type { UserRole } from '@/types/user';

export type FeatureKey =
  | 'dashboard'
  | 'pasien'
  | 'reservasi'
  | 'kunjungan'
  | 'billing'
  | 'operasional'
  | 'share-fee-dokter'
  | 'recall-reminder'
  | 'informed-consent'
  | 'gudang'
  | 'laporan-kunjungan'
  | 'laporan-keuangan'
  | 'laporan-keuangan-pro'
  | 'info-klinik'
  | 'tarif'
  | 'user-management'
  | 'referral'
  | 'audit-log'
  | 'langganan';

const FULL_ACCESS: FeatureKey[] = [
  'dashboard',
  'pasien',
  'reservasi',
  'kunjungan',
  'billing',
  'operasional',
  'share-fee-dokter',
  'recall-reminder',
  'informed-consent',
  'gudang',
  'laporan-kunjungan',
  'laporan-keuangan',
  'laporan-keuangan-pro',
  'info-klinik',
  'tarif',
  'user-management',
  'referral',
  'audit-log',
  'langganan',
];

const ROLE_FEATURES: Record<UserRole, FeatureKey[]> = {
  super_admin: FULL_ACCESS,
  multi_clinic_owner: [],
  owner: FULL_ACCESS,
  admin: [
    'dashboard',
    'pasien',
    'reservasi',
    'kunjungan',
    'billing',
    'operasional',
    'recall-reminder',
    'informed-consent',
    'gudang',
    'laporan-kunjungan',
    'info-klinik',
    'tarif',
    'referral',
    'langganan',
  ],
  dokter: ['pasien', 'reservasi', 'kunjungan', 'informed-consent'],
  pending: [],
};

const VIEW_ONLY_FEATURES: Partial<Record<UserRole, FeatureKey[]>> = {
  admin: ['info-klinik', 'tarif', 'langganan'],
};

export function canAccessFeature(role: UserRole | undefined, feature: FeatureKey): boolean {
  if (!role) return false;
  return ROLE_FEATURES[role]?.includes(feature) ?? false;
}

export function isFeatureViewOnly(role: UserRole | undefined, feature: FeatureKey): boolean {
  if (!role) return false;
  return VIEW_ONLY_FEATURES[role]?.includes(feature) ?? false;
}

export function canSeeHargaModal(role: UserRole | undefined): boolean {
  return role !== 'admin' && role !== 'pending';
}

export function defaultRouteForRole(role: UserRole | undefined): string {
  if (role === 'super_admin') return '/super-admin/dashboard';
  if (role === 'multi_clinic_owner') return '/multi-klinik/dashboard';
  if (role === 'dokter') return '/list-pasien';
  return '/dashboard';
}
