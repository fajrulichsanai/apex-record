'use client';

import { useAuth } from '@/lib/auth-context';
import { canAccessFeature, isFeatureViewOnly, type FeatureKey } from '@/lib/permissions';
import './feature-guard.css';

interface FeatureGuardProps {
  feature: FeatureKey;
  /** Block access entirely for roles that only have view-only access to this feature. */
  requireWrite?: boolean;
  children: React.ReactNode;
}

export default function FeatureGuard({ feature, requireWrite, children }: FeatureGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return null;

  const denied =
    !canAccessFeature(user?.role, feature) || (requireWrite && isFeatureViewOnly(user?.role, feature));

  if (denied) {
    return (
      <div className="access-denied">
        <div className="access-denied-icon">🔒</div>
        <h2>Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return <>{children}</>;
}
