'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { AdminSatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { FACILITY_TYPE_LABELS, satusehatAdminApi, type AdminClinicDetail } from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

/** Super admin: detail kondisi SATUSEHAT satu klinik. */
export default function SuperAdminSatusehatClinicPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { showToast } = useToast();
  const [data, setData] = useState<AdminClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await satusehatAdminApi.clinic(id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat detail klinik', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.summary;
  const profile = data?.profile;
  const address = profile
    ? [profile.line, profile.villageName, profile.districtName, profile.cityName, profile.provinceName]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <AdminSatusehatShell
      title={data ? `SATUSEHAT · ${data.clinic.name}` : 'SATUSEHAT Klinik'}
      subtitle="Detail integrasi SATUSEHAT klinik ini"
      actions={
        <>
          <Link href="/super-admin/satusehat" className="ss-btn">
            <FiArrowLeft /> Semua klinik
          </Link>
          <button type="button" className="ss-btn" onClick={load} disabled={loading}>
            <FiRefreshCw /> Muat ulang
          </button>
        </>
      }
    >
      {loading && !data ? (
        <div className="ss-card ss-empty">Memuat...</div>
      ) : data && s ? (
        <>
          <div className="ss-grid">
            <div className="ss-card">
              <h2>Koneksi</h2>
              <dl className="ss-kv">
                <dt>Kredensial</dt>
                <dd>
                  {data.credentialSource === 'env'
                    ? 'Env server'
                    : data.credentialSource === 'clinic'
                      ? 'Milik klinik'
                      : 'Belum diatur'}
                </dd>
                <dt>Environment</dt>
                <dd>{s.config.environment === 'production' ? 'Production' : 'Sandbox'}</dd>
                <dt>Organization ID</dt>
                <dd className="ss-mono">{s.config.organizationId || '-'}</dd>
                <dt>Nama di SATUSEHAT</dt>
                <dd>{data.verifiedName ?? 'Belum diverifikasi'}</dd>
                <dt>Token aktif s/d</dt>
                <dd>{formatDateTime(s.config.tokenValidUntil)}</dd>
              </dl>
            </div>
            <div className="ss-card">
              <h2>Profil Fasyankes</h2>
              <dl className="ss-kv">
                <dt>Jenis</dt>
                <dd>{profile?.facilityType ? FACILITY_TYPE_LABELS[profile.facilityType] : '-'}</dd>
                <dt>Alamat</dt>
                <dd>{address || '-'}</dd>
                <dt>Kontak</dt>
                <dd>{[profile?.phone, profile?.email].filter(Boolean).join(' · ') || '-'}</dd>
              </dl>
            </div>
            <div className="ss-card">
              <h2>Pengiriman</h2>
              <dl className="ss-kv">
                <dt>Berhasil</dt>
                <dd>{s.syncLogs.success}</dd>
                <dt>Gagal</dt>
                <dd>{s.syncLogs.failed}</dd>
                <dt>Antre</dt>
                <dd>{s.syncLogs.pending}</dd>
                <dt>Terakhir</dt>
                <dd>{formatDateTime(s.syncLogs.lastSyncAt)}</dd>
              </dl>
            </div>
          </div>

          <div>
            <h2 className="ss-section-title">Data per resource</h2>
            <div className="ss-grid">
              {s.resources.map((r) => {
                const pct = (n: number) => (r.total ? `${(n / r.total) * 100}%` : '0%');
                return (
                  <div key={r.resourceType} className="ss-card ss-res">
                    <div className="ss-res-head">
                      <strong>{r.label}</strong>
                      <span className="ss-res-total">{r.total}</span>
                    </div>
                    <div className="ss-bar" aria-hidden>
                      <span className="synced" style={{ width: pct(r.synced) }} />
                      <span className="pending" style={{ width: pct(r.pending) }} />
                      <span className="failed" style={{ width: pct(r.failed) }} />
                    </div>
                    <div className="ss-res-legend">
                      <span>✔ {r.synced}</span>
                      <span>⏳ {r.pending}</span>
                      <span>✖ {r.failed}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="ss-grid ss-grid-2">
            <div className="ss-card">
              <h2>Organization</h2>
              {data.organizations.length === 0 ? (
                <p className="ss-muted">Belum ada sub-organisasi.</p>
              ) : (
                <ul className="ss-list">
                  {data.organizations.map((o) => (
                    <li key={o.id}>
                      <span>
                        {o.name} <span className="ss-muted ss-mono">{o.code}</span>
                        {o.syncError && <span className="err">{o.syncError}</span>}
                      </span>
                      <span className={`ss-badge ${o.satusehatId ? 'synced' : o.syncError ? 'failed' : 'pending'}`}>
                        {o.satusehatId ? 'Terdaftar' : o.syncError ? 'Gagal' : 'Draf'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="ss-card">
              <h2>Location</h2>
              {data.locations.length === 0 ? (
                <p className="ss-muted">Belum ada lokasi.</p>
              ) : (
                <ul className="ss-list">
                  {data.locations.map((l) => (
                    <li key={l.id}>
                      <span>
                        {l.name}
                        {!l.active && <span className="ss-muted"> (nonaktif)</span>}
                        {l.syncError && <span className="err">{l.syncError}</span>}
                      </span>
                      <span className={`ss-badge ${l.satusehatId ? 'synced' : l.syncError ? 'failed' : 'pending'}`}>
                        {l.satusehatId ? 'Terdaftar' : l.syncError ? 'Gagal' : 'Belum'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="ss-card">
            <h2>Kegagalan terbaru (30 hari)</h2>
            {data.recentFailures.length === 0 ? (
              <p className="ss-muted">Tidak ada pengiriman yang gagal.</p>
            ) : (
              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Resource</th>
                      <th>Pesan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentFailures.map((f) => (
                      <tr key={f.id}>
                        <td>{formatDateTime(f.createdAt)}</td>
                        <td>
                          {f.resourceType}
                          <span className="sub">
                            #{f.localId}
                            {f.httpStatus ? ` · HTTP ${f.httpStatus}` : ''}
                          </span>
                        </td>
                        <td className="err-cell">{f.errorMessage ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </AdminSatusehatShell>
  );
}
