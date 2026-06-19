'use client';

import { useState } from 'react';
import './sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 2C7 2 6 3.5 6 5.5V7H5C3.34 7 2 8.34 2 10v9c0 1.66 1.34 3 3 3h14c1.66 0 3-1.34 3-3v-9c0-1.66-1.34-3-3-3h-1V5.5C18 3.5 17 2 15 2H9zm0 2h6c.55 0 1 .67 1 1.5V7H8V5.5C8 4.67 8.45 4 9 4zm2 8h2v2h2v2h-2v2h-2v-2H9v-2h2v-2z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="logo-text">ApexRecord</span>
        </div>

        <nav className="nav">
          <a
            className="nav-item active"
            onClick={handleNavItemClick}
            role="button"
            tabIndex={0}
          >
            <div className="nav-item-left">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    fill="currentColor"
                  />
                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    fill="currentColor"
                  />
                  <rect
                    x="3"
                    y="14"
                    width="7"
                    height="7"
                    rx="1.5"
                    fill="currentColor"
                  />
                  <rect
                    x="14"
                    y="14"
                    width="7"
                    height="7"
                    rx="1.5"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Dashboard
            </div>
          </a>

          <NavGroup
            title="Pasien"
            groupId="pasien"
            isExpanded={expandedGroups.includes('pasien')}
            onToggle={() => toggleGroup('pasien')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M15.5 13.6c2.3.3 4 2.1 4 4.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            }
            items={[
              { label: 'Daftar Pasien', icon: '📋' },
              { label: 'Tambah Pasien', icon: '➕' },
            ]}
          />

          <NavGroup
            title="Antrian"
            groupId="antrian"
            isExpanded={expandedGroups.includes('antrian')}
            onToggle={() => toggleGroup('antrian')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h10M4 18h13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            }
            items={[
              { label: 'Antrian Pasien', icon: '⏳' },
              { label: 'Monitor Panggilan', icon: '📺' },
              { label: 'Jadwal Dokter', icon: '📅' },
            ]}
          />

          <NavGroup
            title="Kunjungan"
            groupId="kunjungan"
            isExpanded={expandedGroups.includes('kunjungan')}
            onToggle={() => toggleGroup('kunjungan')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="3.5"
                  y="4"
                  width="17"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 9v6M9 12h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            }
            items={[
              { label: 'Daftar Kunjungan', icon: '📝' },
              { label: 'Buat Kunjungan', icon: '➕' },
            ]}
          />

          <NavGroup
            title="Farmasi"
            groupId="farmasi"
            isExpanded={expandedGroups.includes('farmasi')}
            onToggle={() => toggleGroup('farmasi')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="3.5"
                  y="3.5"
                  width="17"
                  height="17"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M8 8h8M8 12h8M8 16h5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            }
            items={[
              { label: 'Resep', icon: '📄' },
              { label: 'Pengeluaran Obat', icon: '💊' },
            ]}
          />

          <NavGroup
            title="Billing & Kasir"
            groupId="billing"
            isExpanded={expandedGroups.includes('billing')}
            onToggle={() => toggleGroup('billing')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="6"
                  width="18"
                  height="13"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M3 10h18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            }
            items={[
              { label: 'Input Pembayaran', icon: '💰' },
              { label: 'Invoice', icon: '🧾' },
              { label: 'Riwayat Transaksi', icon: '⏱️' },
            ]}
          />

          <a
            className="nav-item"
            onClick={handleNavItemClick}
            role="button"
            tabIndex={0}
          >
            <div className="nav-item-left">
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="2.6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </span>
              Payroll
            </div>
          </a>

          <NavGroup
            title="Laporan"
            groupId="laporan"
            isExpanded={expandedGroups.includes('laporan')}
            onToggle={() => toggleGroup('laporan')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 19V11M10 19V5M16 19v-7M20 19V9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            }
            items={[
              { label: 'Kunjungan', icon: '📊' },
              { label: 'Keuangan', icon: '📈' },
              { label: 'SATUSEHAT', icon: '🔄' },
            ]}
          />

          <NavGroup
            title="Pengaturan"
            groupId="pengaturan"
            isExpanded={expandedGroups.includes('pengaturan')}
            onToggle={() => toggleGroup('pengaturan')}
            onItemClick={handleNavItemClick}
            icon={
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M19.4 13.5c.1-.5.1-1 0-1.5l1.5-1.2-1.5-2.6-1.8.5c-.4-.3-.8-.6-1.3-.8L16 5.5h-3l-.3 2.4c-.5.2-.9.5-1.3.8l-1.8-.5-1.5 2.6 1.5 1.2c-.1.5-.1 1 0 1.5L7.1 14.7l1.5 2.6 1.8-.5c.4.3.8.6 1.3.8l.3 2.4h3l.3-2.4c.5-.2.9-.5 1.3-.8l1.8.5 1.5-2.6-1.5-1.2z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            }
            items={[
              { label: 'Info Klinik', icon: '🏥' },
              { label: 'User Management', icon: '👥' },
              { label: 'Practitioner', icon: '👨‍⚕️' },
              { label: 'Tarif & Tindakan', icon: '💵' },
              { label: 'Template SOAP', icon: '📋' },
              { label: 'SATUSEHAT Config', icon: '⚙️' },
            ]}
          />
        </nav>

        <div className="sidebar-collapse">
          <div className="collapse-btn">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
            >
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
  icon: React.ReactNode;
  items: { label: string; icon: string }[];
}

function NavGroup({
  title,
  groupId,
  isExpanded,
  onToggle,
  onItemClick,
  icon,
  items,
}: NavGroupProps) {
  return (
    <div className="nav-group">
      <a
        className={`nav-item nav-toggle ${isExpanded ? 'expanded' : ''}`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
      >
        <div className="nav-item-left">
          <span className="nav-icon">{icon}</span>
          {title}
        </div>
        <span className="chevron">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
      <div className={`submenu ${isExpanded ? 'open' : ''}`}>
        {items.map((item) => (
          <a
            key={item.label}
            className="sub-item"
            onClick={onItemClick}
            role="button"
            tabIndex={0}
          >
            <span className="sub-icon">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}
