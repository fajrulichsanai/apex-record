'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiGrid, FiHome, FiCreditCard, FiChevronLeft, FiChevronRight, FiBarChart2, FiMessageCircle } from 'react-icons/fi';
import { COMPANY } from '@/lib/company';
import './sidebar.css';

interface MultiClinicSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <FiGrid />, href: '/multi-klinik/dashboard' },
  { label: 'Laporan', icon: <FiBarChart2 />, href: '/multi-klinik/laporan' },
  { label: 'Info Klinik', icon: <FiHome />, href: '/multi-klinik/info-klinik' },
  { label: 'Langganan', icon: <FiCreditCard />, href: '/multi-klinik/langganan' },
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

      <p className="sidebar-desc">
        Ringkasan dan pengaturan lintas cabang. Untuk mengubah pasien, transaksi, tarif, atau pengguna satu klinik,
        pilih &ldquo;Atur cabang&rdquo; pada klinik itu di Dashboard.
      </p>

      <span className="nav-section-label">Semua Cabang</span>
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

      <div className="sidebar-help">
        <span className="sidebar-help-title">
          <FiMessageCircle /> Butuh bantuan?
        </span>
        <p>Tim ApexRecord siap bantu soal cabang, langganan, atau kendala lain.</p>
        <a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
          Chat WhatsApp
        </a>
      </div>
    </aside>
  );
}
