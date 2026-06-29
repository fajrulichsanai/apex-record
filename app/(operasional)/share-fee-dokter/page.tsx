'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { doctorFeeApi, type DoctorFeeConfig } from '@/lib/doctor-fee';
import FeeConfigTable from './FeeConfigTable';
import MonthlyReportPanel from './MonthlyReportPanel';
import '../../styles/share-fee-dokter.css';

type TabValue = 'config' | 'report';

export default function ShareFeeDokterPage() {
  const [tab, setTab] = useState<TabValue>('config');
  const [configs, setConfigs] = useState<DoctorFeeConfig[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    doctorFeeApi.listConfigs().then(setConfigs);
  }, [refreshKey]);

  const totalConfigured = configs.length;
  const percentageConfigs = configs.filter((c) => c.feeType === 'percentage');
  const avgPercentage = percentageConfigs.length > 0
    ? Math.round(percentageConfigs.reduce((s, c) => s + c.feeValue, 0) / percentageConfigs.length)
    : 0;
  const totalFixed = configs.filter((c) => c.feeType === 'fixed').reduce((s, c) => s + c.feeValue, 0);

  return (
    <DashboardLayout>
      <main className="content share-fee-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Share Fee Dokter</h1>
            </div>
            <p className="page-subtitle">Konfigurasi fee per tindakan dan laporan share fee dokter bulanan.</p>
          </div>
        </div>

        <div className="tab-bar">
          <button
            type="button"
            className={`filter-tab ${tab === 'config' ? 'active' : ''}`}
            onClick={() => setTab('config')}
          >
            Konfigurasi Fee
          </button>
          <button
            type="button"
            className={`filter-tab ${tab === 'report' ? 'active' : ''}`}
            onClick={() => setTab('report')}
          >
            Laporan Bulanan
          </button>
        </div>

        {tab === 'config' ? (
          <>
            <div className="stat-grid">
              <div className="stat-card total">
                <div className="stat-icon">
                  <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                    medical_services
                  </span>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{totalConfigured}</div>
                  <div className="stat-label">Total Tindakan Dikonfigurasi</div>
                </div>
              </div>
              <div className="stat-card rata">
                <div className="stat-icon">
                  <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                    percent
                  </span>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{avgPercentage}%</div>
                  <div className="stat-label">Rata-rata Fee Persentase</div>
                </div>
              </div>
              <div className="stat-card fixed">
                <div className="stat-icon">
                  <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                    payments
                  </span>
                </div>
                <div className="stat-info">
                  <div className="stat-value">Rp {totalFixed.toLocaleString('id-ID')}</div>
                  <div className="stat-label">Total Fee Fixed Terdaftar</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <FeeConfigTable key={refreshKey} onChanged={() => setRefreshKey((k) => k + 1)} />
            </div>
          </>
        ) : (
          <MonthlyReportPanel />
        )}
      </main>
    </DashboardLayout>
  );
}
