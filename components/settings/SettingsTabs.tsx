'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { canAccessFeature, type FeatureKey } from '@/lib/permissions';
import './settings-tabs.css';

const TABS: { label: string; href: string; feature: FeatureKey; requireManageUsers?: boolean }[] = [
  { label: 'Info Klinik', href: '/info-klinik', feature: 'info-klinik' },
  { label: 'User Management', href: '/user-management', feature: 'user-management', requireManageUsers: true },
  { label: 'Tarif & Tindakan', href: '/tarif', feature: 'tarif' },
  { label: 'Log Aktivitas', href: '/audit-log', feature: 'audit-log' },
  { label: 'Langganan', href: '/langganan', feature: 'langganan' },
  { label: 'Tampilan', href: '/tampilan', feature: 'tampilan' },
  { label: 'API', href: '/api-klinik', feature: 'api' },
  { label: 'Keamanan Akun', href: '/keamanan', feature: 'keamanan' },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const canManageUsers = user?.role === 'owner' || user?.role === 'super_admin';

  const visibleTabs = TABS.filter(
    (tab) => (!tab.requireManageUsers || canManageUsers) && canAccessFeature(user?.role, tab.feature)
  );

  if (visibleTabs.length <= 1) return null;

  return (
    <nav className="settings-tabs" aria-label="Navigasi pengaturan">
      {visibleTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`settings-tab${pathname === tab.href || pathname.startsWith(`${tab.href}/`) ? ' active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
