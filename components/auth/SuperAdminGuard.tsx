'use client';

import { useAuth } from '@/lib/auth-context';
import './feature-guard.css';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user?.role !== 'super_admin') {
    return (
      <div className="access-denied">
        <div className="access-denied-icon">🔒</div>
        <h2>Akses Ditolak</h2>
        <p>Halaman ini hanya dapat diakses oleh Super Admin.</p>
      </div>
    );
  }

  return <>{children}</>;
}
