'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { notificationApi, type AppNotification, type NotificationType } from '@/lib/notifications';
import { formatCurrency } from '@/lib/format';
import './navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  multi_clinic_owner: 'Multi-Klinik Owner',
  owner: 'Owner',
  admin: 'Admin',
  dokter: 'Dokter',
  pending: 'Pending',
};

const NOTIF_ROUTE: Record<NotificationType, string> = {
  PATIENT_NEW: '/list-pasien',
  KUNJUNGAN_NEW: '/list-kunjungan',
  PAYMENT_NEW: '/transaksi',
  USER_JOINED: '/user-management',
};

const POLL_INTERVAL_MS = 60_000;

function NotifIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'PATIENT_NEW':
      return (
        <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M17 8h4M19 6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      );
    case 'KUNJUNGAN_NEW':
      return (
        <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M3 9.5h18M8 3v3M16 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      );
    case 'PAYMENT_NEW':
      return (
        <svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M2.5 10h19" stroke="currentColor" strokeWidth="2" /></svg>
      );
    case 'USER_JOINED':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" /><path d="M1.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" /><path d="M14.8 20c.4-2.7 2.1-4.5 4.2-4.5 2.3 0 4.1 2 4.4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      );
  }
}

function notifMessage(n: AppNotification): string | null {
  if (!n.message) return null;
  return n.type === 'PAYMENT_NEW' ? `Rp ${formatCurrency(n.message)}` : n.message;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await notificationApi.list({ limit: 10 });
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // silent — the bell is supplementary, not critical to the page's purpose
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const id = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleNotifClick = async (n: AppNotification) => {
    setNotifOpen(false);
    if (!n.isRead) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationApi.markRead(n.id).catch(() => {});
    }
    router.push(NOTIF_ROUTE[n.type] || '/dashboard');
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllRead();
    } catch {
      // best-effort — next poll will resync the true state anyway
    }
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
        <div className="notif-wrap" ref={notifRef}>
          <button
            className="icon-btn"
            aria-label="Notifikasi"
            title="Lihat notifikasi"
            onClick={() => setNotifOpen((v) => !v)}
          >
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
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                  <button type="button" className="notif-mark-all" onClick={handleMarkAllRead}>
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">Belum ada notifikasi baru.</div>
                ) : (
                  notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      className={`notif-item ${n.isRead ? '' : 'unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <span className="notif-item-icon">
                        <NotifIcon type={n.type} />
                      </span>
                      <span className="notif-item-body">
                        <span className="notif-item-title">{n.title}</span>
                        {notifMessage(n) && <span className="notif-item-message">{notifMessage(n)}</span>}
                        <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="notif-item-dot" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(23,22,15,0.08)',
                minWidth: 140,
                zIndex: 50,
              }}
            >
              <div
                onClick={handleLogout}
                style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--red, #dc2626)' }}
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
