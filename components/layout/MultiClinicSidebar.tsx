'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiHome, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './sidebar.css';

interface MultiClinicSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <FiGrid />, href: '/multi-klinik/dashboard' },
  { label: 'Info Klinik', icon: <FiHome />, href: '/multi-klinik/info-klinik' },
];

export default function MultiClinicSidebar({ isOpen, onClose }: MultiClinicSidebarProps) {
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
          <span className="logo-text">Multi-Klinik</span>
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
