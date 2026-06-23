export type UserRole = 'super_admin' | 'owner' | 'admin' | 'dokter' | 'pending';

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
}

export interface RoleOption {
  value: UserRole;
  label: string;
}
