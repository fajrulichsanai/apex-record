'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiHome,
  FiCreditCard,
  FiDollarSign,
  FiBarChart2,
  FiShield,
  FiKey,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import './sidebar.css';

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <FiGrid />, href: '/super-admin/dashboard' },
  { label: 'Klinik', icon: <FiHome />, href: '/super-admin/clinics' },
  { label: 'Owner Code', icon: <FiKey />, href: '/super-admin/owner-codes' },
  { label: 'Paket Langganan', icon: <FiDollarSign />, href: '/super-admin/plans' },
  { label: 'Konfirmasi Pembayaran', icon: <FiCreditCard />, href: '/super-admin/payments' },
  { label: 'Laporan', icon: <FiBarChart2 />, href: '/super-admin/reports' },
  { label: 'Log Aktivitas', icon: <FiShield />, href: '/super-admin/audit-log' },
];

export default function SuperAdminSidebar({ isOpen, onClose }: SuperAdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            onClick={handleNavItemClick}
            title={item.label}
          >
            <div className="nav-item-left">
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
