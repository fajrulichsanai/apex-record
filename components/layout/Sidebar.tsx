'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  FiGrid,
  FiUsers,
  FiClock,
  FiMonitor,
  FiCalendar,
  FiClipboard,
  FiEdit3,
  FiPackage,
  FiFileText,
  FiBox,
  FiCreditCard,
  FiFile,
  FiDollarSign,
  FiBriefcase,
  FiBarChart2,
  FiActivity,
  FiTrendingUp,
  FiRefreshCw,
  FiSettings,
  FiHome,
  FiUserCheck,
  FiUser,
  FiSliders,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import './sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const canManageUsers = user?.role === 'owner' || user?.role === 'super_admin';
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

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

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo">
          <div className="logo-icon">
            <FiActivity />
          </div>
          <span className="logo-text">ApexRecord</span>
        </div>

        <nav className="nav">
          <Link
            href="/dashboard"
            className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
            onClick={handleNavItemClick}
          >
            <div className="nav-item-left">
              <span className="nav-icon">
                <FiGrid />
              </span>
              Dashboard
            </div>
          </Link>

          <NavGroup
            title="Pasien"
            groupId="pasien"
            isExpanded={expandedGroups.includes('pasien')}
            onToggle={() => toggleGroup('pasien')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiUsers />}
            items={[
              { label: 'Daftar & Tambah Pasien', icon: <FiEdit3 />, href: '/list-pasien' },
            ]}
          />

          <NavGroup
            title="Antrian"
            groupId="antrian"
            isExpanded={expandedGroups.includes('antrian')}
            onToggle={() => toggleGroup('antrian')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiClock />}
            items={[
              { label: 'Antrian Pasien', icon: <FiClock />, href: '/antrian-pasien' },
              { label: 'Monitor Panggilan', icon: <FiMonitor />, href: '/antrian-pasien/display' },
              { label: 'Jadwal Dokter', icon: <FiCalendar /> },
            ]}
          />

          <NavGroup
            title="Kunjungan"
            groupId="kunjungan"
            isExpanded={expandedGroups.includes('kunjungan')}
            onToggle={() => toggleGroup('kunjungan')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiClipboard />}
            items={[
              { label: 'Daftar & Buat Kunjungan', icon: <FiEdit3 />, href: '/list-kunjungan' },
            ]}
          />

          <NavGroup
            title="Farmasi"
            groupId="farmasi"
            isExpanded={expandedGroups.includes('farmasi')}
            onToggle={() => toggleGroup('farmasi')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiPackage />}
            items={[
              { label: 'Resep', icon: <FiFileText /> },
              { label: 'Pengeluaran Obat', icon: <FiBox /> },
            ]}
          />

          <NavGroup
            title="Billing & Kasir"
            groupId="billing"
            isExpanded={expandedGroups.includes('billing')}
            onToggle={() => toggleGroup('billing')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiCreditCard />}
            items={[
              { label: 'Riwayat Transaksi', icon: <FiClock />, href: '/transaksi' },
              { label: 'Invoice', icon: <FiFile /> },
            ]}
          />

          <NavGroup
            title="Operasional"
            groupId="operasional"
            isExpanded={expandedGroups.includes('operasional')}
            onToggle={() => toggleGroup('operasional')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiBriefcase />}
            items={[
              { label: 'Catat Operasional', icon: <FiEdit3 />, href: '/catat-operasional' },
              { label: 'Share Fee Dokter', icon: <FiDollarSign />, href: '/share-fee-dokter' },
            ]}
          />

          <NavGroup
            title="Laporan"
            groupId="laporan"
            isExpanded={expandedGroups.includes('laporan')}
            onToggle={() => toggleGroup('laporan')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiBarChart2 />}
            items={[
              { label: 'Kunjungan', icon: <FiActivity />, href: '/laporan-kunjungan' },
              { label: 'Keuangan', icon: <FiTrendingUp />, href: '/laporan-keuangan' },
              { label: 'SATUSEHAT', icon: <FiRefreshCw /> },
            ]}
          />

          <NavGroup
            title="Pengaturan"
            groupId="pengaturan"
            isExpanded={expandedGroups.includes('pengaturan')}
            onToggle={() => toggleGroup('pengaturan')}
            onItemClick={handleNavItemClick}
            pathname={pathname}
            icon={<FiSettings />}
            items={[
              { label: 'Info Klinik', icon: <FiHome />, href: '/info-klinik' },
              ...(canManageUsers
                ? [{ label: 'User Management', icon: <FiUserCheck />, href: '/user-management' }]
                : []),
              { label: 'Tarif & Tindakan', icon: <FiDollarSign />, href: '/tarif' },
              { label: 'Practitioner', icon: <FiUser /> },
              { label: 'Template SOAP', icon: <FiFileText /> },
              { label: 'SATUSEHAT Config', icon: <FiSliders /> },
            ]}
          />
        </nav>

        <div className="sidebar-collapse">
          <div className="collapse-btn">
            <FiChevronLeft />
          </div>
        </div>
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
  items: { label: string; icon: React.ReactNode; href?: string }[];
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
          {title}
        </div>
        <span className="chevron" aria-hidden="true">
          <FiChevronRight />
        </span>
      </a>
      <div className={`submenu ${isExpanded ? 'open' : ''}`} role="region" aria-label={`${title} submenu`}>
        {items.map((item) =>
          item.href ? (
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
          ) : (
            <a key={item.label} className="sub-item disabled" aria-disabled="true">
              <span className="sub-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}
