'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiRefreshCw } from 'react-icons/fi';
import { AdminSatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import {
  FACILITY_TYPE_LABELS,
  satusehatAdminApi,
  type AdminClinicRow,
  type AdminCount,
  type AdminOverview,
  type ClinicHealth,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

const HEALTH: Record<ClinicHealth, { label: string; badge: string }> = {
  ok: { label: 'Lancar', badge: 'synced' },
  warning: { label: 'Perlu perhatian', badge: 'pending' },
  setup: { label: 'Belum siap', badge: 'failed' },
};

const FILTERS: { value: ClinicHealth | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'setup', label: 'Belum siap' },
  { value: 'warning', label: 'Perlu perhatian' },
  { value: 'ok', label: 'Lancar' },
];

function Ratio({ count, failed }: { count: AdminCount; failed?: boolean }) {
  if (!count.total) return <span className="ss-muted">—</span>;
  const full = count.linked >= count.total;
  return (
    <span>
      <strong className={full ? '' : 'ss-warn-text'}>{count.linked}</strong>
      <span className="ss-muted">/{count.total}</span>
      {failed && count.failed > 0 && <span className="ss-badge failed ss-badge-xs">{count.failed} gagal</span>}
    </span>
  );
}

/** Apa yang kurang dari klinik ini — dibaca super admin sekilas */
function problems(r: AdminClinicRow): string[] {
  const out: string[] = [];
  if (!r.credential.source) out.push('Kredensial belum diatur');
  else if (!r.credential.verifiedName) out.push('Organization ID belum diverifikasi');
  if (!r.profile.complete) out.push('Profil fasyankes belum lengkap');
  if (r.locations.linked === 0) out.push('Belum ada Location terdaftar');
  if (r.practitioners.linked < r.practitioners.total)
    out.push(`${r.practitioners.total - r.practitioners.linked} nakes belum terhubung`);
  if (r.encounters.failed > 0) out.push(`${r.encounters.failed} kunjungan gagal dikirim`);
  if (r.sync.failed > 0) out.push(`${r.sync.failed} pengiriman gagal (${r.sync.days} hari)`);
  return out;
}

/** Super admin: kondisi SATUSEHAT setiap klinik. */
export default function SuperAdminSatusehatPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClinicHealth | 'all'>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await satusehatAdminApi.overview());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data SATUSEHAT', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.clinics ?? []).filter(
      (r) =>
        (filter === 'all' || r.health === filter) &&
        (!q || r.name.toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q)),
    );
  }, [data, filter, search]);

  return (
    <AdminSatusehatShell
      title="SATUSEHAT Klinik"
      subtitle="Kondisi integrasi SATUSEHAT setiap klinik: kesiapan onboarding, data terhubung, dan pengiriman 30 hari terakhir"
      actions={
        <button type="button" className="ss-btn" onClick={load} disabled={loading}>
          <FiRefreshCw /> Muat ulang
        </button>
      }
    >
      {data && (
        <div className="ss-grid ss-stat-grid">
          <div className="ss-card ss-stat">
            <span>Total klinik</span>
            <strong>{data.totals.clinics}</strong>
          </div>
          <div className="ss-card ss-stat ok">
            <span>Lancar</span>
            <strong>{data.totals.ready}</strong>
          </div>
          <div className="ss-card ss-stat warn">
            <span>Perlu perhatian</span>
            <strong>{data.totals.attention}</strong>
          </div>
          <div className="ss-card ss-stat bad">
            <span>Belum siap</span>
            <strong>{data.totals.notSetUp}</strong>
          </div>
        </div>
      )}

      <div className="ss-card">
        <div className="ss-toolbar">
          <input
            className="ss-input grow"
            placeholder="Cari nama klinik / kota"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari klinik"
          />
          <div className="ss-tabs" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                className={`ss-tab ${filter === f.value ? 'active' : ''}`}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="ss-empty">Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="ss-empty">Tidak ada klinik</div>
        ) : (
          <div className="ss-table-wrap">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>Klinik</th>
                  <th>Status</th>
                  <th>Kredensial</th>
                  <th title="Organisasi terkirim / total">Org</th>
                  <th title="Lokasi terdaftar / aktif">Lokasi</th>
                  <th title="Nakes terhubung / total">Nakes</th>
                  <th title="Pasien terhubung / total">Pasien</th>
                  <th title="Kunjungan selesai terkirim / total">Kunjungan</th>
                  <th>Sync terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const issues = problems(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/super-admin/satusehat/clinics/${r.id}`} className="ss-link">
                          {r.name}
                        </Link>
                        <span className="sub">
                          {[r.city, r.profile.facilityType ? FACILITY_TYPE_LABELS[r.profile.facilityType] : null]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                        {issues.length > 0 && <span className="err">{issues.slice(0, 2).join(' · ')}</span>}
                      </td>
                      <td>
                        <span className={`ss-badge ${HEALTH[r.health].badge}`}>{HEALTH[r.health].label}</span>
                      </td>
                      <td>
                        {r.credential.source ? (
                          <>
                            {r.credential.source === 'env' ? 'Env server' : 'Klinik'}
                            <span className="sub">
                              {r.credential.environment === 'production' ? 'Production' : 'Sandbox'}
                              {r.credential.verifiedName ? ' · terverifikasi' : ''}
                            </span>
                          </>
                        ) : (
                          <span className="ss-muted">Belum</span>
                        )}
                      </td>
                      <td>
                        <Ratio count={r.organizations} />
                      </td>
                      <td>
                        <Ratio count={r.locations} />
                      </td>
                      <td>
                        <Ratio count={r.practitioners} />
                      </td>
                      <td>
                        <Ratio count={r.patients} />
                      </td>
                      <td>
                        <Ratio count={r.encounters} failed />
                      </td>
                      <td>
                        {formatDateTime(r.sync.lastSyncAt)}
                        {r.sync.success + r.sync.failed > 0 && (
                          <span className="sub">
                            {r.sync.success} ok · {r.sync.failed} gagal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminSatusehatShell>
  );
}
