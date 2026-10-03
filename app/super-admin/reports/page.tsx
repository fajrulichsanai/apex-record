'use client';

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { superAdminReportApi } from '@/lib/subscription';
import type { SuperAdminReportSummary } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

export default function SuperAdminReportsPage() {
  const [summary, setSummary] = useState<SuperAdminReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setSummary(await superAdminReportApi.summary({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat laporan');
      } finally {
        setLoading(false);
      }
    })();
  }, [dateFrom, dateTo]);

  const maxRevenue = summary ? Math.max(1, ...summary.revenueByPeriod.map((p) => p.revenue)) : 1;
  const maxNewClinics = summary ? Math.max(1, ...summary.newClinicsByPeriod.map((p) => p.count)) : 1;
  const maxPlanCount = summary ? Math.max(1, ...summary.planDistribution.map((p) => p.count)) : 1;

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Laporan</h1>
            </div>
            <p className="page-subtitle">Pendapatan, pertumbuhan klinik, dan distribusi paket langganan.</p>
          </div>
        </div>

        <div className="filter-bar">
          <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Dari tanggal" />
          <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Sampai tanggal" />
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : summary ? (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-label">Total Pendapatan</div>
                <div className="stat-card-value">Rp {formatCurrency(summary.totalRevenue)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">MRR (30 hari)</div>
                <div className="stat-card-value">Rp {formatCurrency(summary.mrr)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Klinik Aktif / Total</div>
                <div className="stat-card-value">{summary.activeClinics} / {summary.totalClinics}</div>
              </div>
            </div>

            <div className="card">
              <h3>Pendapatan per Bulan</h3>
              {summary.revenueByPeriod.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada pembayaran terkonfirmasi.</p>
              ) : (
                <div className="period-list">
                  {summary.revenueByPeriod.map((p) => (
                    <div className="period-row" key={p.period}>
                      <span className="period-label">{p.period}</span>
                      <div className="period-bar-wrap">
                        <div className="period-bar" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                      </div>
                      <span className="period-value">Rp {formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Klinik Baru per Bulan</h3>
              {summary.newClinicsByPeriod.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada data.</p>
              ) : (
                <div className="period-list">
                  {summary.newClinicsByPeriod.map((p) => (
                    <div className="period-row" key={p.period}>
                      <span className="period-label">{p.period}</span>
                      <div className="period-bar-wrap">
                        <div className="period-bar" style={{ width: `${(p.count / maxNewClinics) * 100}%` }} />
                      </div>
                      <span className="period-value">{p.count} klinik</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3>Distribusi Paket (klinik aktif)</h3>
              {summary.planDistribution.every((p) => p.count === 0) ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum ada klinik aktif.</p>
              ) : (
                <div className="period-list">
                  {summary.planDistribution.map((p) => (
                    <div className="period-row" key={p.planId}>
                      <span className="period-label">{p.planName}</span>
                      <div className="period-bar-wrap">
                        <div className="period-bar" style={{ width: `${(p.count / maxPlanCount) * 100}%` }} />
                      </div>
                      <span className="period-value">{p.count} klinik</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </SuperAdminLayout>
  );
}
