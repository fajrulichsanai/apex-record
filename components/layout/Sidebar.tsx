'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { canAccessFeature, type FeatureKey } from '@/lib/permissions';
import {
  FiGrid,
  FiUsers,
  FiClock,
  FiCalendar,
  FiClipboard,
  FiEdit3,
  FiCreditCard,
  FiDollarSign,
  FiBriefcase,
  FiBarChart2,
  FiActivity,
  FiTrendingUp,
  FiSettings,
  FiHome,
  FiUserCheck,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import './sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLeaf {
  label: string;
  icon: React.ReactNode;
  href?: string;
  feature: FeatureKey;
}

interface NavGroupDef {
  title: string;
  groupId: string;
  icon: React.ReactNode;
  items: NavLeaf[];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const canManageUsers = user?.role === 'owner' || user?.role === 'super_admin';
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const handleNavItemClick = () => {
    if (window.innerWidth <= 860) {
      onClose();
    }
  };

  const groupDefs: NavGroupDef[] = [
    {
      title: 'Pasien',
      groupId: 'pasien',
      icon: <FiUsers />,
      items: [{ label: 'Daftar & Tambah Pasien', icon: <FiEdit3 />, href: '/list-pasien', feature: 'pasien' }],
    },
    {
      title: 'Reservasi',
      groupId: 'reservasi',
      icon: <FiCalendar />,
      items: [{ label: 'Daftar Reservasi', icon: <FiCalendar />, href: '/reservasi', feature: 'reservasi' }],
    },
    {
      title: 'Kunjungan',
      groupId: 'kunjungan',
      icon: <FiClipboard />,
      items: [{ label: 'Daftar & Buat Kunjungan', icon: <FiEdit3 />, href: '/list-kunjungan', feature: 'kunjungan' }],
    },
    {
      title: 'Billing & Kasir',
      groupId: 'billing',
      icon: <FiCreditCard />,
      items: [{ label: 'Riwayat Transaksi', icon: <FiClock />, href: '/transaksi', feature: 'billing' }],
    },
    {
      title: 'Operasional',
      groupId: 'operasional',
      icon: <FiBriefcase />,
      items: [
        { label: 'Catat Operasional', icon: <FiEdit3 />, href: '/catat-operasional', feature: 'operasional' },
        { label: 'Share Fee Dokter', icon: <FiDollarSign />, href: '/share-fee-dokter', feature: 'share-fee-dokter' },
      ],
    },
    {
      title: 'Laporan',
      groupId: 'laporan',
      icon: <FiBarChart2 />,
      items: [
        { label: 'Kunjungan', icon: <FiActivity />, href: '/laporan-kunjungan', feature: 'laporan-kunjungan' },
        { label: 'Keuangan', icon: <FiTrendingUp />, href: '/laporan-keuangan', feature: 'laporan-keuangan' },
        { label: 'Referral', icon: <FiUsers />, href: '/referral', feature: 'referral' },
      ],
    },
    {
      title: 'Pengaturan',
      groupId: 'pengaturan',
      icon: <FiSettings />,
      items: [
        { label: 'Info Klinik', icon: <FiHome />, href: '/info-klinik', feature: 'info-klinik' },
        ...(canManageUsers
          ? [{ label: 'User Management', icon: <FiUserCheck />, href: '/user-management', feature: 'user-management' as FeatureKey }]
          : []),
        { label: 'Tarif & Tindakan', icon: <FiDollarSign />, href: '/tarif', feature: 'tarif' },
      ],
    },
  ];

  // Buang item tanpa href/tanpa akses, lalu buang grup yang jadi kosong.
  const visibleGroups = groupDefs
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item): item is NavLeaf & { href: string } => !!item.href && canAccessFeature(user?.role, item.feature)
      ),
    }))
    .filter((g) => g.items.length > 0);

  const canViewDashboard = canAccessFeature(user?.role, 'dashboard');

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="logo">
            <div className="logo-icon">
              <img src="/logo-apex-record.png" alt="ApexRecord" className="logo-img" />
            </div>
            <span className="logo-text">ApexRecord</span>
          </div>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
            title={collapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="nav">
          {canViewDashboard && (
            <Link
              href="/dashboard"
              className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
              onClick={handleNavItemClick}
              title="Dashboard"
            >
              <div className="nav-item-left">
                <span className="nav-icon">
                  <FiGrid />
                </span>
                <span className="nav-label">Dashboard</span>
              </div>
            </Link>
          )}

          {visibleGroups.map((group) =>
            group.items.length === 1 ? (
              <Link
                key={group.groupId}
                href={group.items[0].href!}
                className={`nav-item ${pathname === group.items[0].href ? 'active' : ''}`}
                onClick={handleNavItemClick}
                title={group.title}
              >
                <div className="nav-item-left">
                  <span className="nav-icon">{group.icon}</span>
                  <span className="nav-label">{group.title}</span>
                </div>
              </Link>
            ) : (
              <NavGroup
                key={group.groupId}
                title={group.title}
                groupId={group.groupId}
                isExpanded={expandedGroups.includes(group.groupId)}
                onToggle={() => toggleGroup(group.groupId)}
                onItemClick={handleNavItemClick}
                pathname={pathname}
                icon={group.icon}
                items={group.items}
              />
            )
          )}
        </nav>
      </aside>
    </>
  );
}

interface NavGroupProps {
  title: string;
  groupId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick: () => void;
  pathname: string;
  icon: React.ReactNode;
  items: { label: string; icon: React.ReactNode; href: string; feature: FeatureKey }[];
}

function NavGroup({
  title,
  groupId,
  isExpanded,
  onToggle,
  onItemClick,
  pathname,
  icon,
  items,
}: NavGroupProps) {
  const hasActiveItem = items.some((item) => item.href === pathname);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="nav-group">
      <a
        className={`nav-item nav-toggle ${isExpanded ? 'expanded' : ''} ${hasActiveItem ? 'active' : ''}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${title} menu`}
      >
        <div className="nav-item-left">
          <span className="nav-icon" aria-hidden="true">
            {icon}
          </span>
          <span className="nav-label">{title}</span>
        </div>
        <span className="chevron" aria-hidden="true">
          <FiChevronRight />
        </span>
      </a>
      <div className={`submenu ${isExpanded ? 'open' : ''}`} role="region" aria-label={`${title} submenu`}>
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`sub-item ${pathname === item.href ? 'active' : ''}`}
            onClick={onItemClick}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            <span className="sub-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
