export type UserRole =
  | 'super_admin'
  | 'multi_clinic_owner'
  | 'owner'
  | 'manajer_cabang'
  | 'admin'
  | 'dokter'
  | 'perawat'
  | 'pending';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  clinicId: number | null;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  /** Password sementara yang wajib diganti sebelum memakai aplikasi. */
  mustChangePassword?: boolean;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}
