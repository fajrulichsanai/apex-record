'use client';

import { useEffect, useState } from 'react';
import { superAdminApi } from '@/lib/super-admin';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiHome,
  FiCreditCard,
  FiDollarSign,
  FiBarChart2,
  FiShield,
  FiUser,
  FiUsers,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiDatabase,
  FiCloud,
  FiMapPin,
  FiMap,
  FiSliders,
} from 'react-icons/fi';
import './sidebar.css';

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type QueueKey = 'payments' | 'dataRequests' | 'deletions';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  /** Also active on these path prefixes (detail pages). */
  match?: string[];
  badge?: QueueKey;
}

/** Lima kelompok menu sesuai alur kerja Super Admin (PRD Super Admin). */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Ringkasan',
    items: [
      { label: 'Dashboard', icon: <FiGrid />, href: '/super-admin/dashboard' },
      { label: 'Laporan', icon: <FiBarChart2 />, href: '/super-admin/reports' },
    ],
  },
  {
    title: 'Klinik & Pengguna',
    items: [
      { label: 'Klinik', icon: <FiHome />, href: '/super-admin/clinics', match: ['/super-admin/clinics/'] },
      { label: 'Pengguna', icon: <FiUser />, href: '/super-admin/users' },
      { label: 'Multi-Klinik Owner', icon: <FiUsers />, href: '/super-admin/multi-clinic-owners' },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { label: 'Konfirmasi Pembayaran', icon: <FiCreditCard />, href: '/super-admin/payments', badge: 'payments' },
      { label: 'Paket Langganan', icon: <FiDollarSign />, href: '/super-admin/plans' },
    ],
  },
  {
    title: 'SATUSEHAT',
    items: [
      { label: 'Status Integrasi', icon: <FiCloud />, href: '/super-admin/satusehat' },
      { label: 'Master Sarana (MSI)', icon: <FiMapPin />, href: '/super-admin/satusehat/sarana' },
      { label: 'Master Wilayah', icon: <FiMap />, href: '/super-admin/satusehat/wilayah' },
    ],
  },
  {
    title: 'Kepatuhan & Sistem',
    items: [
      { label: 'Permintaan Data', icon: <FiDatabase />, href: '/super-admin/data-requests', badge: 'dataRequests' },
      { label: 'Penghapusan Data', icon: <FiTrash2 />, href: '/super-admin/penghapusan-data', badge: 'deletions' },
      { label: 'Log Aktivitas', icon: <FiShield />, href: '/super-admin/audit-log' },
      { label: 'Pengaturan Platform', icon: <FiSliders />, href: '/super-admin/pengaturan' },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  return pathname === item.href || (item.match ?? []).some((m) => pathname.startsWith(m));
}

export default function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [queue, setQueue] = useState<Record<QueueKey, number>>({ payments: 0, dataRequests: 0, deletions: 0 });

  // Angka antrian, diperbarui setiap pindah halaman (PRD UM-01).
  useEffect(() => {
    let alive = true;
    superAdminApi
      .queue()
      .then((q) => {
        if (!alive) return;
        setQueue({
          payments: q.pendingPayments,
          dataRequests: q.openDataRequests,
          // Hanya yang tinggal ≤ 7 hari, agar angkanya berarti "perlu dilihat".
          deletions: q.dataDeletions.filter((d) => d.daysLeft <= 7).length,
        });
      })
      .catch(() => {
        // Badges are a convenience; the pages themselves still load.
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  const handleNavItemClick = () => {
    if (window.innerWidth <= 860) {
      onClose();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-icon">
            <img src="/logo-apex-record.png" alt="ApexRecord" className="logo-img" />
          </div>
          <span className="logo-text">Super Admin</span>
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

      <nav className="nav" aria-label="Menu Super Admin">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-section">
            {!collapsed && <div className="nav-section-label">{group.title}</div>}
            {group.items.map((item) => {
              const count = item.badge ? queue[item.badge] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(pathname, item) ? 'active' : ''}`}
                  onClick={handleNavItemClick}
                  title={count ? `${item.label} (${count})` : item.label}
                >
                  <div className="nav-item-left">
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </div>
                  {count > 0 && (
                    <span className="nav-badge nav-badge-alert" aria-label={`${count} menunggu`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
