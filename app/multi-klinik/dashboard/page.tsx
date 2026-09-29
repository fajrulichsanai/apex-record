'use client';

import { useEffect, useState } from 'react';
import MultiClinicLayout from '@/components/layout/MultiClinicLayout';
import { multiClinicApi, type MultiClinicDashboard } from '@/lib/multi-clinic';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

export default function MultiClinicDashboardPage() {
  const [dashboard, setDashboard] = useState<MultiClinicDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setDashboard(await multiClinicApi.dashboard());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MultiClinicLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Dashboard Multi-Klinik</h1>
            </div>
            <p className="page-subtitle">Ringkasan gabungan seluruh klinik yang Anda miliki.</p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : dashboard && dashboard.clinics.length === 0 ? (
          <div className="alert-error" style={{ background: '#F5F6FA', color: '#6B7A99', border: '1px solid #E8ECF4' }}>
            Belum ada klinik yang dihubungkan ke akun Anda. Hubungi Super Admin untuk menghubungkan klinik.
          </div>
        ) : dashboard ? (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-label">Total Klinik</div>
                <div className="stat-card-value">{dashboard.clinics.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total Pasien</div>
                <div className="stat-card-value">{dashboard.totals.totalPatients}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Kunjungan Hari Ini</div>
                <div className="stat-card-value">{dashboard.totals.todayVisits}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Omzet Bulan Ini</div>
                <div className="stat-card-value">Rp {formatCurrency(dashboard.totals.monthlyRevenue)}</div>
              </div>
            </div>

            <div className="table-wrap" style={{ marginTop: 24 }}>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Klinik</th>
                    <th>Pasien</th>
                    <th>Dokter Aktif</th>
                    <th>Kunjungan Hari Ini</th>
                    <th>Transaksi</th>
                    <th>Omzet Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clinics.map((row) => (
                    <tr key={row.clinic.id}>
                      <td style={{ fontWeight: 600 }}>{row.clinic.name}</td>
                      <td>{row.summary.totalPatients}</td>
                      <td>{row.summary.activePractitioners}</td>
                      <td>{row.summary.todayVisits}</td>
                      <td>{row.summary.totalTransactions}</td>
                      <td>Rp {formatCurrency(row.summary.monthlyRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </MultiClinicLayout>
  );
}
