'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { canAccessFeature, type FeatureKey } from '@/lib/permissions';

const SETTINGS_ORDER: { href: string; feature: FeatureKey; requireManageUsers?: boolean }[] = [
  { href: '/info-klinik', feature: 'info-klinik' },
  { href: '/user-management', feature: 'user-management', requireManageUsers: true },
  { href: '/tarif', feature: 'tarif' },
  { href: '/audit-log', feature: 'audit-log' },
  { href: '/langganan', feature: 'langganan' },
  { href: '/tampilan', feature: 'tampilan' },
  { href: '/keamanan', feature: 'keamanan' },
];

export default function PengaturanPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    const canManageUsers = user.role === 'owner' || user.role === 'super_admin';
    const target = SETTINGS_ORDER.find(
      (s) => (!s.requireManageUsers || canManageUsers) && canAccessFeature(user.role, s.feature)
    );
    router.replace(target?.href ?? '/dashboard');
  }, [loading, user, router]);

  return (
    <DashboardLayout>
      <main className="content">
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
          Memuat pengaturan…
        </div>
      </main>
    </DashboardLayout>
  );
}
