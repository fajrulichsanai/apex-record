'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MultiClinicLayout from '@/components/layout/MultiClinicLayout';
import { multiClinicApi, type BranchBillingMode, type MultiClinicDashboard } from '@/lib/multi-clinic';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/format';
import '../../styles/multi-klinik.css';

const BILLING_LABEL: Record<BranchBillingMode, string> = {
  owner: 'Ditanggung owner',
  self: 'Bayar sendiri',
  stopped: 'Berhenti',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(date: string) {
  const end = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((end - today) / 86_400_000);
}

function SubscriptionPill({ sub }: { sub: MultiClinicDashboard['clinics'][number]['subscription'] }) {
  if (!sub) return <span className="mk-pill">Belum berlangganan</span>;
  const left = daysUntil(sub.endDate);
  if (sub.status !== 'active' || left < 0) return <span className="mk-pill bad">Berakhir {formatDate(sub.endDate)}</span>;
  if (left <= 7) return <span className="mk-pill warn">{left === 0 ? 'Berakhir hari ini' : `${left} hari lagi`}</span>;
  return <span className="mk-pill ok">Aktif s.d. {formatDate(sub.endDate)}</span>;
}

export default function MultiClinicDashboardPage() {
  const { enterBranch } = useAuth();
  const [clinicId, setClinicId] = useState<number | ''>('');
  const [dashboard, setDashboard] = useState<MultiClinicDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    multiClinicApi
      .dashboard(clinicId || undefined)
      .then((data) => {
        if (!active) return;
        setDashboard(data);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Gagal memuat dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  const branches = dashboard?.branches ?? dashboard?.clinics.map((c) => c.clinic) ?? [];
  const pending = dashboard?.pending ?? [];
  const quota = dashboard?.quota;
  const quotaRatio = quota && quota.accountsLimit > 0 ? quota.accountsUsed / quota.accountsLimit : 0;
  const noBranches = !!dashboard && branches.length === 0;

  return (
    <MultiClinicLayout>
      <div className="mk-scope mk-page">
        <div className="mk-head">
          <div>
            <h1>Dashboard Multi-Klinik</h1>
            <p>Ringkasan semua cabang. Pilih &ldquo;Atur cabang&rdquo; untuk masuk ke satu cabang dan mengubah pengguna, tarif, Info Klinik, atau SATUSEHAT-nya.</p>
          </div>
          {branches.length > 1 && (
            <div className="mk-filters">
              <label className="mk-field">
                Tampilkan
                <select
                  value={clinicId}
                  onChange={(e) => {
                    setLoading(true);
                    setClinicId(e.target.value ? Number(e.target.value) : '');
                  }}
                >
                  <option value="">Semua cabang</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {error && <div className="mk-alert bad">{error}</div>}

        {pending.length > 0 && (
          <div className="mk-alert info">
            {pending.length} cabang menunggu persetujuan owner kliniknya:{' '}
            <strong>{pending.map((p) => p.clinicName ?? `Klinik #${p.clinicId}`).join(', ')}</strong>. Cabang
            akan muncul di sini setelah disetujui.
          </div>
        )}

        {loading && !dashboard ? (
          <div className="mk-card mk-muted">Memuat dashboard…</div>
        ) : noBranches ? (
          <div className="mk-card mk-empty">
            <h2>Belum ada cabang terhubung</h2>
            <p className="mk-hint">
              Hubungi tim ApexRecord dan sebutkan klinik-klinik milik Anda. Super Admin akan mengajukan hubungan, lalu
              owner tiap klinik menyetujuinya dari aplikasi mereka. Klinik baru yang dibuat untuk Anda langsung
              terhubung.
            </p>
          </div>
        ) : dashboard ? (
          <>
            <div className="mk-stats" aria-busy={loading}>
              <div className="mk-stat">
                <span className="l">{clinicId ? 'Cabang' : 'Cabang aktif'}</span>
                <span className="v">{dashboard.clinics.length}</span>
              </div>
              <div className="mk-stat">
                <span className="l">Total pasien</span>
                <span className="v">{dashboard.totals.totalPatients.toLocaleString('id-ID')}</span>
              </div>
              <div className="mk-stat">
                <span className="l">Kunjungan hari ini</span>
                <span className="v">{dashboard.totals.todayVisits.toLocaleString('id-ID')}</span>
              </div>
              <div className="mk-stat">
                <span className="l">Omzet bulan ini</span>
                <span className="v">Rp {formatCurrency(dashboard.totals.monthlyRevenue)}</span>
              </div>
              {quota && !clinicId && (
                <div className="mk-stat">
                  <span className="l">Akun terpakai (bersama)</span>
                  <span className="v">
                    {quota.accountsUsed}/{quota.accountsLimit}
                  </span>
                  <div
                    className={`mk-meter ${quotaRatio >= 1 ? 'bad' : quotaRatio >= 0.85 ? 'warn' : ''}`}
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={quota.accountsLimit}
                    aria-valuenow={quota.accountsUsed}
                    aria-label="Akun terpakai"
                  >
                    <span style={{ width: `${Math.min(100, Math.round(quotaRatio * 100))}%` }} />
                  </div>
                  <span className="s">25 akun × {quota.activeBranches} cabang aktif</span>
                </div>
              )}
            </div>

            <div className="mk-table-wrap">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th>Cabang</th>
                    <th>Langganan</th>
                    <th className="r">Pasien</th>
                    <th className="r">Kunjungan hari ini</th>
                    <th className="r">Omzet bulan ini</th>
                    <th className="r">Pengguna</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clinics.map((row) => (
                    <tr key={row.clinic.id}>
                      <td className="name">
                        {row.clinic.name}
                        {row.billingMode && <small>{BILLING_LABEL[row.billingMode]}</small>}
                      </td>
                      <td>
                        <SubscriptionPill sub={row.subscription ?? null} />
                      </td>
                      <td className="r num">{row.summary.totalPatients.toLocaleString('id-ID')}</td>
                      <td className="r num">{row.summary.todayVisits.toLocaleString('id-ID')}</td>
                      <td className="r num">Rp {formatCurrency(row.summary.monthlyRevenue)}</td>
                      <td className="r num">{row.summary.registeredUsers ?? '—'}</td>
                      <td className="r">
                        <button
                          type="button"
                          className="mk-btn sm"
                          onClick={() => enterBranch({ id: row.clinic.id, name: row.clinic.name })}
                        >
                          Atur cabang
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mk-muted">
              Laporan kunjungan dan keuangan per cabang ada di <Link href="/multi-klinik/laporan">Laporan</Link>.
              Cara bayar tiap cabang diatur di <Link href="/multi-klinik/langganan">Langganan</Link>.
            </p>
          </>
        ) : null}
      </div>
    </MultiClinicLayout>
  );
}
