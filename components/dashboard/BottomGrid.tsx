'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import './bottom-grid.css';

interface ActivityItem {
  type: 'encounter' | 'billing';
  title: string;
  detail: string;
  timestamp: string;
  status: string;
}

function timeAgo(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

function activityColor(item: ActivityItem) {
  if (item.type === 'billing') return 'blue';
  if (item.status === 'finished') return 'green';
  if (item.status === 'arrived') return 'orange';
  return 'purple';
}

const quickActions = [
  {
    id: 1,
    label: 'Daftar Pasien',
    href: '/list-pasien',
    color: 'purple',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke="white" strokeWidth="1.8" />
        <path
          d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 8h4M18 6v4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Buat Kunjungan',
    href: '/list-kunjungan',
    color: 'blue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect
          x="3.5"
          y="4"
          width="17"
          height="16"
          rx="2"
          stroke="white"
          strokeWidth="1.8"
        />
        <path
          d="M12 9v6M9 12h6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Laporan Keuangan',
    href: '/laporan-keuangan',
    color: 'green',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 19V11M10 19V5M16 19v-7M20 19V9"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 4,
    label: 'User Management',
    href: '/user-management',
    color: 'orange',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="8.5" cy="8" r="2.6" stroke="white" strokeWidth="1.8" />
        <path
          d="M3.5 18c0-2.5 2.2-4.3 5-4.3s5 1.8 5 4.3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 9.5c1 0 1.8-.8 1.8-1.8S17 6 16 6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.8 13.7c1.8.3 3.2 1.6 3.2 4.3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomGrid() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    apiClient
      .get<ActivityItem[]>('/dashboard/activity?limit=8')
      .then(setActivities)
      .catch(() => setActivities([]));
  }, []);

  return (
    <div className="bottom-grid">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Aktivitas Terbaru</span>
          <Link href="/list-kunjungan" className="panel-link">
            Lihat semua
          </Link>
        </div>
        <div className="activity-list">
          {activities.length === 0 && (
            <div className="activity-item">
              <div className="activity-info">
                <div className="activity-detail">Belum ada aktivitas terbaru</div>
              </div>
            </div>
          )}
          {activities.map((activity, idx) => (
            <div key={idx} className="activity-item">
              <span className={`activity-dot ${activityColor(activity)}`} />
              <div className="activity-info">
                <div className="activity-title">{activity.title}</div>
                <div className="activity-detail">{activity.detail}</div>
              </div>
              <span className="activity-time">{timeAgo(activity.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Aksi Cepat</span>
        </div>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <Link key={action.id} href={action.href} className="action-item">
              <div className="action-left">
                <div className={`action-icon ${action.color}`}>
                  {action.icon}
                </div>
                <span className="action-label">{action.label}</span>
              </div>
              <span className="action-chevron">
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
