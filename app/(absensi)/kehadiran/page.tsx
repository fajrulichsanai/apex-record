'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import TodayTab from './TodayTab';
import RecapTab from './RecapTab';
import SettingsTab from './SettingsTab';
import '../../styles/absensi.css';

type Tab = 'today' | 'recap' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Hari ini' },
  { id: 'recap', label: 'Rekap' },
  { id: 'settings', label: 'Jadwal & pengaturan' },
];

export default function KehadiranPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const isOwner = user?.role === 'owner';
  const canView = user?.role === 'owner' || user?.role === 'admin';

  return (
    <DashboardLayout>
      <FeatureGuard feature="absensi">
        <main className="content ab-scope">
          <div className="ab-page">
            <div className="ab-head">
              <div>
                <h1>Kehadiran Pegawai</h1>
                <p>Absen admin, dokter, dan perawat dari HP masing-masing. Rekap untuk dilihat, bukan untuk penggajian.</p>
              </div>
            </div>

            {!canView ? (
              <div className="ab-card">
                <p className="ab-hint">Halaman ini hanya untuk owner dan admin klinik.</p>
              </div>
            ) : (
              <>
                <div className="ab-tabs" role="tablist" aria-label="Kehadiran">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      className={`ab-tab ${tab === t.id ? 'active' : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {tab === 'today' && <TodayTab isOwner={isOwner} currentUserId={user?.id} />}
                {tab === 'recap' && <RecapTab currentUserId={user?.id} />}
                {tab === 'settings' && <SettingsTab isOwner={isOwner} />}
              </>
            )}
          </div>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
