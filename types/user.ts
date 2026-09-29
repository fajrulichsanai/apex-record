export type UserRole = 'super_admin' | 'multi_clinic_owner' | 'owner' | 'admin' | 'dokter' | 'pending';

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
  mfaEnabled?: boolean;
  /** Set by the backend: this account must turn MFA on first. False while MFA is switched off. */
  mfaRequired?: boolean;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}
