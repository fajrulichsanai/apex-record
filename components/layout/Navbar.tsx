'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import './navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  dokter: 'Dokter',
  pending: 'Pending',
};

export default function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div>
          <div className="topbar-title">ApexRecord</div>
          <div className="topbar-subtitle">Dashboard</div>
        </div>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Dark mode">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.5A9 9 0 1111.5 3a7 7 0 009.5 9.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 8a6 6 0 1112 0c0 3 1 5 1.5 6H4.5C5 13 6 11 6 8z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 18a2.5 2.5 0 005 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="user-chip" onClick={() => setMenuOpen((v) => !v)} style={{ position: 'relative', cursor: 'pointer' }}>
          <div className="avatar">{initials}</div>
          <span className="user-name">
            {user?.name || 'User'}
            {user?.role && <small style={{ display: 'block', opacity: 0.6, fontSize: '11px' }}>{ROLE_LABEL[user.role] || user.role}</small>}
          </span>
          <span className="chip-chevron">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                minWidth: 140,
                zIndex: 50,
              }}
            >
              <div
                onClick={handleLogout}
                style={{ padding: '10px 14px', cursor: 'pointer', color: '#dc2626' }}
              >
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
