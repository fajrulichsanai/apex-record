'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiUsers, FiShare2 } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { patientsApi, type ReferralSummaryResponse, type SumberInformasi } from '@/lib/patients';
import { useToast } from '@/lib/toast-context';
import '../styles/laporan.css';
import '../styles/referral.css';

const SUMBER_LABELS: Record<SumberInformasi, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  google_maps: 'Google Maps',
  facebook: 'Facebook',
  teman_keluarga: 'Teman / Keluarga',
  lewat_depan_klinik: 'Lewat Depan Klinik',
  brosur: 'Brosur',
  lainnya: 'Lainnya',
};

export default function ReferralPage() {
  const { error } = useToast();
  const [summary, setSummary] = useState<ReferralSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    patientsApi
      .getReferralSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Gagal memuat data referral';
        error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [error]);

  const totalBySource = summary?.bySource.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <DashboardLayout>
      <FeatureGuard feature="referral">
        <main className="content laporan-page referral-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Referral</h1>
              </div>
              <p className="page-subtitle">Sumber informasi pasien dan daftar pasien yang mereferensikan.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">hourglass_empty</span>
              </div>
              <div className="empty-title">Memuat data referral...</div>
            </div>
          ) : (
            <>
              <div className="panel referral-panel">
                <div className="panel-header">
                  <h2>
                    <FiShare2 /> Sumber Informasi Pasien
                  </h2>
                  <span className="referral-panel-sub">{totalBySource} pasien tercatat</span>
                </div>
                {summary && summary.bySource.length > 0 ? (
                  <div className="stat-grid referral-source-grid">
                    {summary.bySource.map((row) => {
                      const pct = totalBySource > 0 ? Math.round((row.count / totalBySource) * 100) : 0;
                      return (
                        <div className="stat-card total" key={row.sumberInformasi}>
                          <div className="stat-info">
                            <div className="stat-value">{row.count}</div>
                            <div className="stat-label">{SUMBER_LABELS[row.sumberInformasi] ?? row.sumberInformasi}</div>
                            <div className="stat-sub">{pct}% dari total</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-list">
                    <div className="empty-title">Belum ada data sumber informasi</div>
                  </div>
                )}
              </div>

              <div className="panel referral-panel">
                <div className="panel-header">
                  <h2>
                    <FiUsers /> Pasien Perujuk Teratas
                  </h2>
                </div>
                {summary && summary.byReferrer.length > 0 ? (
                  <div className="referral-table-wrap">
                    <table className="referral-table">
                      <thead>
                        <tr>
                          <th>Nama Pasien</th>
                          <th>Jumlah Referral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byReferrer.map((row) => (
                          <tr key={row.referrerPatientId}>
                            <td>
                              <Link href={`/list-pasien/edit/${row.referrerPatientId}`}>{row.referrerName}</Link>
                            </td>
                            <td>{row.referralCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-list">
                    <div className="empty-title">Belum ada pasien yang mereferensikan pasien lain</div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
