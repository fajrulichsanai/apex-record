'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { superAdminReportApi } from '@/lib/subscription';
import type { SuperAdminReportSummary } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

export default function SuperAdminDashboardPage() {
  const [summary, setSummary] = useState<SuperAdminReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setSummary(await superAdminReportApi.summary());
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat ringkasan');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Dashboard Super Admin</h1>
            </div>
            <p className="page-subtitle">Ringkasan seluruh klinik dan langganan pada platform.</p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : summary ? (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-card-label">Total Klinik</div>
                <div className="stat-card-value">{summary.totalClinics}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Klinik Aktif</div>
                <div className="stat-card-value">{summary.activeClinics}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Klinik Kadaluarsa</div>
                <div className="stat-card-value">{summary.expiredClinics}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Menunggu Konfirmasi</div>
                <div className="stat-card-value">{summary.pendingConfirmations}</div>
                {summary.pendingConfirmations > 0 && (
                  <div className="stat-card-sub">
                    <Link href="/super-admin/payments">Lihat antrian &rarr;</Link>
                  </div>
                )}
              </div>
              <div className="stat-card">
                <div className="stat-card-label">MRR (30 hari terakhir)</div>
                <div className="stat-card-value">Rp {formatCurrency(summary.mrr)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total Pendapatan</div>
                <div className="stat-card-value">Rp {formatCurrency(summary.totalRevenue)}</div>
              </div>
            </div>

            <div className="card">
              <h3>Navigasi Cepat</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/super-admin/clinics" className="btn-outline">Kelola Klinik</Link>
                <Link href="/super-admin/plans" className="btn-outline">Paket Langganan</Link>
                <Link href="/super-admin/payments" className="btn-outline">Konfirmasi Pembayaran</Link>
                <Link href="/super-admin/reports" className="btn-outline">Laporan</Link>
                <Link href="/super-admin/audit-log" className="btn-outline">Log Aktivitas</Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </SuperAdminLayout>
  );
}
