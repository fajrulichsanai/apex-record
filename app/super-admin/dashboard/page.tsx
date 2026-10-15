'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { PageHeader, SkeletonBlock, StatCard, StatusBadge, formatDate } from '@/components/super-admin/ui';
import { superAdminReportApi } from '@/lib/subscription';
import { superAdminApi } from '@/lib/super-admin';
import type { SuperAdminQueue, SuperAdminReportSummary } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

function daysLabel(days: number) {
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'besok';
  return `${days} hari lagi`;
}

/** Antrian dulu (PRD DB-01..03): blok "Perlu tindakan", lalu 4 angka. */
export default function SuperAdminDashboardPage() {
  const [summary, setSummary] = useState<SuperAdminReportSummary | null>(null);
  const [queue, setQueue] = useState<SuperAdminQueue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([superAdminReportApi.summary(), superAdminApi.queue()])
      .then(([s, q]) => {
        setSummary(s);
        setQueue(q);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat ringkasan'));
  }, []);

  const items = queue
    ? [
        queue.pendingPayments > 0 && {
          key: 'payments',
          href: '/super-admin/payments',
          label: `${queue.pendingPayments} pembayaran menunggu konfirmasi`,
          tone: 'warn' as const,
          tag: 'Keuangan',
        },
        queue.openDataRequests > 0 && {
          key: 'requests',
          href: '/super-admin/data-requests',
          label:
            `${queue.openDataRequests} permintaan data terbuka` +
            (queue.overdueDataRequests > 0 ? ` · ${queue.overdueDataRequests} lewat batas 3 × 24 jam` : ''),
          tone: queue.overdueDataRequests > 0 ? ('bad' as const) : ('warn' as const),
          tag: 'UU PDP',
        },
        queue.satusehatNotReady > 0 && {
          key: 'satusehat',
          href: '/super-admin/satusehat',
          label: `${queue.satusehatNotReady} klinik SATUSEHAT belum siap`,
          tone: 'info' as const,
          tag: 'SATUSEHAT',
        },
        ...queue.expiringSoon.map((e) => ({
          key: `exp-${e.clinicId}`,
          href: `/super-admin/clinics/${e.clinicId}?tab=langganan`,
          label: `${e.clinicName}: langganan${e.tier === 'trial' ? ' (masa coba)' : ''} habis ${daysLabel(e.daysLeft)} (${formatDate(e.endDate)})`,
          tone: 'warn' as const,
          tag: 'Habis ≤ 7 hari',
        })),
        ...(queue.followUps ?? []).map((f) => ({
          key: `fu-${f.id}`,
          href: `/super-admin/clinics/${f.clinicId}`,
          label: `${f.clinicName}: ${f.body.length > 80 ? `${f.body.slice(0, 80)}…` : f.body}`,
          tone: 'info' as const,
          tag: `Tindak lanjut ${formatDate(f.followUpOn)}`,
        })),
        ...queue.dataDeletions.map((d) => ({
          key: `del-${d.clinicId}`,
          href: '/super-admin/penghapusan-data',
          label: `${d.clinicName}: data dihapus ${d.daysLeft < 0 ? 'menunggu tindakan (masa unduh lewat)' : `setelah ${formatDate(d.deleteAfter)} (${daysLabel(d.daysLeft)})`}`,
          tone: d.daysLeft <= 7 ? ('bad' as const) : ('neutral' as const),
          tag: 'Penghapusan data',
        })),
      ].filter(Boolean)
    : [];

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <PageHeader title="Dashboard" subtitle="Pekerjaan yang menunggu dan kondisi platform hari ini." />

        {error && <div className="alert-error">{error}</div>}

        <div className="card">
          <h3>Perlu tindakan</h3>
          {!queue ? (
            !error && <SkeletonBlock lines={3} />
          ) : items.length === 0 ? (
            <p className="attention-empty">Tidak ada yang menunggu. Semua beres.</p>
          ) : (
            <ul className="attention-list">
              {items.map((item) =>
                item ? (
                  <li key={item.key}>
                    <Link href={item.href}>
                      <span>{item.label}</span>
                      <StatusBadge tone={item.tone}>{item.tag}</StatusBadge>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </div>

        {summary ? (
          <div className="stat-grid">
            <StatCard label="Klinik aktif" value={summary.activeClinics} href="/super-admin/clinics?status=active" />
            <StatCard label="Klinik kadaluarsa" value={summary.expiredClinics} href="/super-admin/clinics?status=expired" />
            <StatCard
              label="MRR (30 hari terakhir)"
              value={`Rp ${formatCurrency(summary.mrr)}`}
              sub={<Link href="/super-admin/reports">Pendapatan &amp; tren di Laporan &rarr;</Link>}
            />
            <StatCard label="Klinik baru bulan ini" value={summary.newClinicsThisMonth ?? 0} />
          </div>
        ) : (
          !error && <SkeletonBlock lines={2} />
        )}
      </div>
    </SuperAdminLayout>
  );
}
