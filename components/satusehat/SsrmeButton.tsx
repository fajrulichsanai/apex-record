'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { ssrmeApi, type SsrmeConsentLink, type SsrmeRecordLink } from '@/lib/satusehat';

/** Dokter (dan owner yang praktik) boleh membuka; admin hanya memproses consent. */
const CAN_OPEN = ['owner', 'multi_clinic_owner', 'dokter'];
const CAN_CONSENT = [...CAN_OPEN, 'admin'];

function formatExpiry(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Tombol "RME Nasional" — SATUSEHAT Rekam Medis Elektronik (Juknis SSRME).
 * Alur: buka → bila pasien belum memberi persetujuan, buat link consent
 * (pasien menyetujui lewat SATUSEHAT Mobile, atau jalur darurat) → buka lagi.
 * Link SSRME bersifat rahasia: tidak disimpan dan kedaluwarsa sendiri.
 */
export default function SsrmeButton({ encounterId }: { encounterId: number }) {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [consent, setConsent] = useState<SsrmeConsentLink | null>(null);
  const [record, setRecord] = useState<SsrmeRecordLink | null>(null);

  if (!CAN_CONSENT.includes(role)) return null;
  const canOpen = CAN_OPEN.includes(role);

  async function openRecord() {
    setBusy(true);
    setError(null);
    setRecord(null);
    try {
      setRecord(await ssrmeApi.open(encounterId));
      setNeedsConsent(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNeedsConsent(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Gagal membuka RME Nasional');
      }
    } finally {
      setBusy(false);
    }
  }

  async function createConsent() {
    setBusy(true);
    setError(null);
    try {
      setConsent(await ssrmeApi.consent(encounterId, emergency));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat link persetujuan');
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && canOpen && !record && !needsConsent) void openRecord();
    if (next && !canOpen) setNeedsConsent(true);
  }

  return (
    <div className="ssrme">
      <button type="button" className="btn-outline ssrme-toggle" onClick={toggle} aria-expanded={open}>
        <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: '16px' }}>
          travel_explore
        </span>
        RME Nasional
      </button>

      {open && (
        <div className="ssrme-panel" role="dialog" aria-label="SATUSEHAT Rekam Medis Elektronik">
          <div className="ssrme-title">SATUSEHAT Rekam Medis (SSRME)</div>
          <p className="ssrme-muted">
            Riwayat alergi, diagnosis, resep, tindakan, lab &amp; radiologi pasien dari seluruh fasyankes yang
            terhubung SATUSEHAT. Akses tercatat di audit trail.
          </p>

          {busy && <p className="ssrme-muted">Memproses…</p>}
          {error && <p className="ssrme-error">{error}</p>}

          {record && (
            <div className="ssrme-ok">
              <a className="btn-primary" href={record.shlinkUrl} target="_blank" rel="noopener noreferrer">
                Buka RME Nasional
              </a>
              {formatExpiry(record.expiredAt) && (
                <span className="ssrme-muted">Berlaku s/d {formatExpiry(record.expiredAt)}</span>
              )}
              {record.partial && <span className="ssrme-error">Sebagian data belum berhasil dihimpun.</span>}
            </div>
          )}

          {needsConsent && !record && (
            <div className="ssrme-consent">
              <p>
                Pasien belum memberi persetujuan. Buat link persetujuan, lalu minta pasien menyetujui lewat
                aplikasi SATUSEHAT Mobile.
              </p>
              <label className="ssrme-check">
                <input type="checkbox" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
                Kondisi gawat darurat (bypass persetujuan — isi alasan &amp; data pengantar/wali di form SSRME)
              </label>
              <button type="button" className="btn-outline" onClick={createConsent} disabled={busy}>
                Buat link persetujuan
              </button>
              {consent && (
                <div className="ssrme-ok">
                  <a href={consent.verificationUrl} target="_blank" rel="noopener noreferrer">
                    Buka form persetujuan
                  </a>
                  {formatExpiry(consent.expiredAt) && (
                    <span className="ssrme-muted">Berlaku s/d {formatExpiry(consent.expiredAt)}</span>
                  )}
                  {canOpen && (
                    <button type="button" className="btn-primary" onClick={openRecord} disabled={busy}>
                      Pasien sudah setuju — buka RME Nasional
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
