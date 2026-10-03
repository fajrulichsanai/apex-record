'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiRefreshCw } from 'react-icons/fi';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { satusehatApi, type SatusehatSummary } from '@/lib/satusehat';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

export default function SatusehatSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<SatusehatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await satusehatApi.getSummary());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat ringkasan SATUSEHAT', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleProcessQueue() {
    setProcessing(true);
    try {
      const res = await satusehatApi.processQueue();
      showToast(`Antrean diproses: ${res.succeeded} berhasil, ${res.failed} gagal`, 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses antrean', 'error');
    } finally {
      setProcessing(false);
    }
  }

  const config = summary?.config;

  return (
    <SatusehatShell
      title="SATUSEHAT"
      subtitle="Status integrasi dan sinkronisasi data klinik ke SATUSEHAT (Kemenkes)"
      actions={
        <>
          <button type="button" className="ss-btn" onClick={load} disabled={loading}>
            <FiRefreshCw /> Muat ulang
          </button>
          {isOwner && (
            <button type="button" className="ss-btn primary" onClick={handleProcessQueue} disabled={processing}>
              {processing ? 'Memproses...' : 'Proses antrean sync'}
            </button>
          )}
        </>
      }
    >
      {loading && !summary ? (
        <div className="ss-card ss-empty">Memuat...</div>
      ) : summary ? (
        <>
          {!config?.configured && (
            <div className="ss-notice warn">
              Integrasi SATUSEHAT belum dikonfigurasi. Data belum bisa dikirim.{' '}
              {isOwner && <Link href="/satusehat/konfigurasi">Atur konfigurasi →</Link>}
            </div>
          )}

          <div className="ss-grid">
            <div className="ss-card">
              <h2>Koneksi</h2>
              <dl className="ss-kv">
                <dt>Status</dt>
                <dd>
                  <span className={`ss-badge ${config?.configured ? 'synced' : 'failed'}`}>
                    {config?.configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
                  </span>
                </dd>
                <dt>Environment</dt>
                <dd>
                  <span className={`ss-badge ${config?.environment === 'production' ? 'synced' : 'neutral'}`}>
                    {config?.environment === 'production' ? 'Production' : 'Sandbox'}
                  </span>
                </dd>
                <dt>Organization ID</dt>
                <dd className="ss-mono">{config?.organizationId || '-'}</dd>
                <dt>Token aktif s/d</dt>
                <dd>{formatDateTime(config?.tokenValidUntil)}</dd>
              </dl>
            </div>
            <div className="ss-card">
              <h2>Riwayat Pengiriman</h2>
              <dl className="ss-kv">
                <dt>Berhasil</dt>
                <dd>{summary.syncLogs.success}</dd>
                <dt>Gagal</dt>
                <dd>{summary.syncLogs.failed}</dd>
                <dt>Antre</dt>
                <dd>{summary.syncLogs.pending}</dd>
                <dt>Terakhir</dt>
                <dd>{formatDateTime(summary.syncLogs.lastSyncAt)}</dd>
              </dl>
              <div style={{ marginTop: 12 }}>
                <Link href="/satusehat/log" className="ss-btn sm">
                  Lihat log
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: '4px 0 12px' }}>Bank Data per Resource</h2>
            <div className="ss-grid">
              {summary.resources.map((r) => {
                const pct = (n: number) => (r.total ? `${(n / r.total) * 100}%` : '0%');
                return (
                  <button
                    key={r.resourceType}
                    type="button"
                    className="ss-card ss-res"
                    onClick={() => router.push(`/satusehat/data?type=${r.resourceType}`)}
                  >
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
                      <span>✔ {r.synced} terverifikasi</span>
                      <span>⏳ {r.pending} belum</span>
                      <span>✖ {r.failed} gagal</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </SatusehatShell>
  );
}
