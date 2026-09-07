'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import { clinicApi } from '@/lib/clinic';
import { patientRecallApi, type PatientRecall } from '@/lib/recall';
import RecallDueList from './RecallDueList';
import RecallIntervalConfigTable from './RecallIntervalConfigTable';
import '../../styles/recall-reminder.css';

type TabValue = 'due' | 'config';

function isOverdue(dueDate: string) {
  const today = new Date(new Date().toDateString());
  return new Date(`${dueDate}T00:00:00`) < today;
}

export default function RecallReminderPage() {
  const { user } = useAuth();
  const canEditInterval = user?.role === 'owner' || user?.role === 'super_admin';

  const [tab, setTab] = useState<TabValue>('due');
  const [summary, setSummary] = useState<PatientRecall[]>([]);
  const [clinicName, setClinicName] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    patientRecallApi.list({ limit: 100 }).then((res) => setSummary(res.data));
  }, [refreshKey]);

  useEffect(() => {
    clinicApi.get().then((res) => setClinicName(res.name)).catch(() => {});
  }, []);

  const belumDihubungi = summary.filter((r) => r.status === 'belum_dihubungi');
  const overdueCount = belumDihubungi.filter((r) => isOverdue(r.dueDate)).length;
  const bookingUlangCount = summary.filter((r) => r.status === 'sudah_booking_ulang').length;

  return (
    <DashboardLayout>
      <FeatureGuard feature="recall-reminder">
        <main className="content recall-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Recall &amp; Reminder</h1>
              </div>
              <p className="page-subtitle">Pasien yang sudah waktunya kontrol kembali, dijadwalkan otomatis dari tindakan yang punya interval recall.</p>
            </div>
          </div>

          <div className="tab-bar">
            <button type="button" className={`filter-tab ${tab === 'due' ? 'active' : ''}`} onClick={() => setTab('due')}>
              Perlu Dihubungi
            </button>
            <button type="button" className={`filter-tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>
              Konfigurasi Interval
            </button>
          </div>

          {tab === 'due' ? (
            <>
              <div className="stat-grid">
                <div className="stat-card total">
                  <div className="stat-icon">
                    <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>event_repeat</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{belumDihubungi.length}</div>
                    <div className="stat-label">Belum Dihubungi</div>
                  </div>
                </div>
                <div className="stat-card warn">
                  <div className="stat-icon">
                    <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{overdueCount}</div>
                    <div className="stat-label">Sudah Lewat Jatuh Tempo</div>
                  </div>
                </div>
                <div className="stat-card done">
                  <div className="stat-icon">
                    <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                  </div>
                  <div className="stat-info">
                    <div className="stat-value">{bookingUlangCount}</div>
                    <div className="stat-label">Sudah Booking Ulang</div>
                  </div>
                </div>
              </div>

              <RecallDueList key={refreshKey} clinicName={clinicName} />
            </>
          ) : (
            <div className="panel">
              <div className="panel-toolbar">
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                  {canEditInterval
                    ? 'Atur berapa lama setelah tindakan ini, pasien perlu dihubungi kembali untuk kontrol.'
                    : 'Hanya Owner yang dapat mengubah interval recall.'}
                </span>
              </div>
              <RecallIntervalConfigTable canEdit={canEditInterval} onChanged={() => setRefreshKey((k) => k + 1)} />
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
