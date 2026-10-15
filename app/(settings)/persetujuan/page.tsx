'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';
import { ApiError } from '@/lib/api-client';
import { clinicLinksApi, CLINIC_LINKS_CHANGED, type ClinicLinkRequest, type LinkStatus } from '@/lib/clinic-links';
import '../../styles/multi-klinik.css';

const STATUS: Record<LinkStatus, { label: string; tone: string }> = {
  pending: { label: 'Menunggu jawaban Anda', tone: 'warn' },
  approved: { label: 'Disetujui', tone: 'ok' },
  rejected: { label: 'Ditolak', tone: 'bad' },
  expired: { label: 'Kedaluwarsa', tone: '' },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Persetujuan hubungan multiklinik (PRD PS-01). Super Admin mengajukan,
 * owner klinik ini yang memutuskan. Owner multiklinik yang sedang di mode
 * Cabang aktif tidak bisa menjawab permintaannya sendiri (dicek juga di server).
 */
export default function PersetujuanPage() {
  const { user, branch } = useAuth();
  const { success, error: showError } = useToast();
  const [requests, setRequests] = useState<ClinicLinkRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ request: ClinicLinkRequest; approve: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEscapeKey(() => !busy && setConfirming(null), !!confirming);

  const canAnswer = user?.role === 'owner' && !branch;

  const load = useCallback(async () => {
    try {
      const rows = await clinicLinksApi.list();
      setRequests(Array.isArray(rows) ? rows : []);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat permintaan');
    }
  }, []);

  useEffect(() => {
    if (canAnswer) void load();
  }, [canAnswer, load]);

  async function answer() {
    if (!confirming) return;
    setBusy(true);
    try {
      await clinicLinksApi.respond(confirming.request.id, confirming.approve);
      success(confirming.approve ? 'Hubungan multiklinik disetujui' : 'Permintaan ditolak');
      setConfirming(null);
      window.dispatchEvent(new Event(CLINIC_LINKS_CHANGED));
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan jawaban');
      await load();
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout>
      <main className="content mk-scope">
        <div className="mk-page" style={{ maxWidth: 820 }}>
          <div className="mk-head">
            <div>
              <h1>Persetujuan Multi-Klinik</h1>
              <p>Permintaan untuk menghubungkan klinik ini ke akun Multi-Klinik Owner. Hanya Anda, owner klinik ini, yang bisa memutuskan.</p>
            </div>
          </div>

          {!canAnswer ? (
            <div className="mk-alert">Halaman ini hanya untuk owner klinik.</div>
          ) : loadError ? (
            <div className="mk-alert bad">{loadError}</div>
          ) : requests === null ? (
            <div className="mk-card mk-muted">Memuat permintaan…</div>
          ) : requests.length === 0 ? (
            <div className="mk-card mk-empty">
              <h2>Tidak ada permintaan</h2>
              <p className="mk-hint">Klinik ini belum pernah diminta untuk dihubungkan ke akun Multi-Klinik.</p>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="mk-card">
                <div className="mk-request">
                  <div>
                    <span className={`mk-pill ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
                    <dl>
                      <dt>Owner multiklinik</dt>
                      <dd>
                        {r.ownerName ?? '—'}
                        {r.ownerEmail && <span className="mk-muted"> · {r.ownerEmail}</span>}
                      </dd>
                      <dt>Diajukan</dt>
                      <dd>{formatDate(r.requestedAt)}</dd>
                      {r.status === 'pending' && (
                        <>
                          <dt>Kedaluwarsa</dt>
                          <dd>{formatDate(r.expiresAt)}</dd>
                        </>
                      )}
                      {r.respondedAt && r.status !== 'pending' && (
                        <>
                          <dt>Dijawab</dt>
                          <dd>{formatDate(r.respondedAt)}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                  {r.status === 'pending' && (
                    <div className="mk-actions">
                      <button type="button" className="mk-btn danger" onClick={() => setConfirming({ request: r, approve: false })}>
                        Tolak
                      </button>
                      <button type="button" className="mk-btn primary" onClick={() => setConfirming({ request: r, approve: true })}>
                        Setujui
                      </button>
                    </div>
                  )}
                </div>
                {r.status === 'pending' && (
                  <>
                    <p className="mk-hint">Bila disetujui, owner multiklinik ini dapat:</p>
                    <ul className="mk-rights">
                      <li>melihat dashboard dan laporan kunjungan &amp; keuangan klinik ini;</li>
                      <li>masuk ke klinik ini untuk mengatur pengguna, tarif, Info Klinik, dan SATUSEHAT, dengan hak yang sama seperti Anda;</li>
                      <li>membayar langganan klinik ini bersama cabang lainnya.</li>
                    </ul>
                    <p className="mk-hint">Data dan akun klinik tetap milik klinik ini. Setiap aksi owner multiklinik di klinik ini tercatat di Audit Log.</p>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {confirming && (
          <div className="mk-overlay" role="presentation" onClick={() => !busy && setConfirming(null)}>
            <div
              className="mk-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mk-confirm-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="mk-confirm-title">
                {confirming.approve ? 'Setujui hubungan multiklinik?' : 'Tolak permintaan ini?'}
              </h2>
              <p className="mk-hint">
                {confirming.approve
                  ? `${confirming.request.ownerName ?? 'Owner multiklinik'} akan bisa melihat laporan dan mengatur klinik ini. Hubungan hanya bisa diputus oleh tim ApexRecord.`
                  : 'Klinik ini tidak akan terhubung. Tim ApexRecord bisa mengajukan lagi bila diperlukan.'}
              </p>
              <div className="mk-actions">
                <button type="button" className="mk-btn" disabled={busy} onClick={() => setConfirming(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className={`mk-btn ${confirming.approve ? 'primary' : 'danger'}`}
                  disabled={busy}
                  onClick={answer}
                >
                  {busy ? 'Menyimpan…' : confirming.approve ? 'Ya, setujui' : 'Ya, tolak'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
