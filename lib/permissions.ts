import type { UserRole } from '@/types/user';

export type FeatureKey =
  | 'dashboard'
  | 'pasien'
  | 'reservasi'
  | 'kunjungan'
  | 'billing'
  | 'operasional'
  | 'share-fee-dokter'
  | 'share-fee-saya'
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
  | 'langganan'
  | 'onboarding'
  | 'tampilan'
  | 'api'
  | 'data-privasi'
  | 'konten'
  | 'satusehat'
  | 'imunisasi';

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
  'tampilan',
  'api',
  'konten',
  'satusehat',
];

const ROLE_FEATURES: Record<UserRole, FeatureKey[]> = {
  // A super admin belongs to no clinic, so clinic pages have nothing to show
  // (the backend refuses them with NO_CLINIC_ASSIGNED); clinic data is reached
  // by impersonating the owner. The API and user pages have their own clinic picker.
  super_admin: ['api', 'user-management', 'tampilan'],
  multi_clinic_owner: ['tampilan'],
  // Data requests (UU PDP) are the clinic owner's to make.
  owner: [...FULL_ACCESS, 'onboarding', 'data-privasi'],
  admin: [
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
    'konten',
    'tampilan',
    'satusehat',
  ],
  dokter: ['pasien', 'reservasi', 'kunjungan', 'informed-consent', 'share-fee-saya', 'tampilan'],
  // Perawat: akses sama persis dengan dokter
  perawat: ['pasien', 'reservasi', 'kunjungan', 'informed-consent', 'share-fee-saya', 'tampilan'],
  pending: ['tampilan'],
};

const VIEW_ONLY_FEATURES: Partial<Record<UserRole, FeatureKey[]>> = {
  admin: ['info-klinik', 'tarif', 'langganan', 'satusehat'],
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
  if (role === 'dokter' || role === 'perawat') return '/list-pasien';
  if (role === 'admin') return '/list-kunjungan';
  return '/dashboard';
}
