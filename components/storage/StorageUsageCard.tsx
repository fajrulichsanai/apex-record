'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useEscapeKey } from '@/lib/a11y';
import { formatCurrency } from '@/lib/format';
import { GB, formatBytes, formatDateId, formatGb, storageApi, storageLevel, type StorageQuota } from '@/lib/storage';
import './storage-usage.css';

interface StorageUsageCardProps {
  /** Which quota to show: this clinic's, or (Multi-Klinik Owner) the shared pool. */
  source?: 'clinic' | 'pool';
  /** Show the "Tambah storage" button (only for whoever pays for the storage). */
  canPurchase?: boolean;
  /** Told after every load/purchase, so the page can update its bill. */
  onChange?: (quota: StorageQuota) => void;
}

const MAX_GB = 100;

/**
 * Pemakaian storage file layanan terhadap jatah (paket + storage tambahan),
 * dengan pembelian storage tambahan (PRD Super Admin BL-05): langsung
 * aktif, ditagih di perpanjangan berikutnya.
 */
export default function StorageUsageCard({ source = 'clinic', canPurchase = false, onChange }: StorageUsageCardProps) {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [failed, setFailed] = useState(false);
  const [buying, setBuying] = useState(false);
  const [gb, setGb] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEscapeKey(() => !busy && setBuying(false), buying);

  useEffect(() => {
    let active = true;
    (source === 'pool' ? storageApi.pool() : storageApi.usage())
      .then((q) => {
        if (!active) return;
        setQuota(q);
        onChange?.(q);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // onChange is a notification hook; re-fetching when its identity changes is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (failed || !quota) return null;
  const { ratio, tone } = storageLevel(quota.usedBytes, quota.limitBytes);
  const pct = Math.min(100, Math.round(ratio * 100));
  const monthly = gb * quota.pricePerGb;

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const next = await storageApi.purchase(gb);
      setQuota(next);
      onChange?.(next);
      setNotice(`Storage tambahan ${gb} GB aktif. Biayanya masuk ke tagihan perpanjangan berikutnya.`);
      setBuying(false);
      setGb(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menambah storage');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card storage-card" aria-labelledby="storage-card-title">
      <div className="storage-card-head">
        <h3 id="storage-card-title">{source === 'pool' ? 'Penyimpanan bersama' : 'Penyimpanan'}</h3>
        <span className={`storage-pill ${tone}`}>{pct}% terpakai</span>
      </div>
      <p className="storage-figure">
        <strong>{formatBytes(quota.usedBytes)}</strong> dari {formatBytes(quota.limitBytes)}
      </p>
      <div
        className={`storage-meter ${tone}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Penyimpanan terpakai"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="storage-note">
        {quota.scope === 'multiklinik'
          ? `${formatGb(quota.includedGb)} dari ${quota.activeBranches ?? 0} cabang aktif`
          : `${formatGb(quota.includedGb)} dari paket`}
        {quota.extraGb > 0 &&
          ` + ${quota.extraGb} GB tambahan` +
            (quota.billableExtraGb > 0
              ? ` (ditagih ${quota.billableExtraGb} GB · Rp ${formatCurrency(quota.billableExtraGb * quota.pricePerGb)}/bulan)`
              : ' (gratis)')}
        .{' '}
        {quota.scope === 'multiklinik' && source === 'clinic'
          ? `Dipakai bersama semua cabang; klinik ini memakai ${formatBytes(quota.clinicUsedBytes)}.`
          : 'Dihitung dari foto pemeriksaan penunjang dan foto konten.'}
        {tone === 'bad'
          ? ' Penyimpanan penuh: unggahan file baru ditolak, pencatatan data tetap berjalan.'
          : tone === 'warn'
            ? ' Hampir penuh.'
            : ''}
      </p>
      {(quota.bonuses ?? []).map((b) => (
        <p key={b.id} className="storage-note storage-bonus">
          🎁 Bonus {b.gb} GB gratis{' '}
          {b.freeUntil
            ? `s.d. ${formatDateId(b.freeUntil)}, setelah itu ikut tagihan Rp ${formatCurrency(b.gb * quota.pricePerGb)}/bulan.`
            : 'tanpa batas waktu.'}
        </p>
      ))}
      {notice && <p className="storage-note storage-ok">{notice}</p>}
      {canPurchase ? (
        <div>
          <button
            type="button"
            className={tone ? 'btn-primary storage-buy' : 'btn-outline storage-buy'}
            onClick={() => {
              setError(null);
              setBuying(true);
            }}
          >
            Tambah storage
          </button>
        </div>
      ) : (
        quota.scope === 'multiklinik' &&
        source === 'clinic' &&
        tone && <p className="storage-note">Storage tambahan untuk jatah bersama dibeli oleh owner multiklinik.</p>
      )}

      {buying && (
        <div className="storage-overlay" role="presentation" onClick={() => !busy && setBuying(false)}>
          <div
            className="storage-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storage-buy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="storage-buy-title">Tambah storage</h3>
            <p className="storage-note">
              Rp {formatCurrency(quota.pricePerGb)} per GB per bulan. Langsung aktif; biayanya masuk ke tagihan perpanjangan
              berikutnya{source === 'pool' ? ' owner multiklinik' : ''}, dibayar sekaligus dengan paket.
            </p>
            <label className="storage-field">
              <span>Jumlah (GB)</span>
              <div className="storage-stepper">
                <button type="button" onClick={() => setGb((v) => Math.max(1, v - 1))} disabled={busy || gb <= 1} aria-label="Kurangi">
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={MAX_GB}
                  value={gb}
                  onChange={(e) => setGb(Math.min(MAX_GB, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                />
                <button type="button" onClick={() => setGb((v) => Math.min(MAX_GB, v + 1))} disabled={busy || gb >= MAX_GB} aria-label="Tambah">
                  +
                </button>
              </div>
            </label>
            <div className="storage-summary">
              <span>Jatah baru</span>
              <strong>{formatBytes(quota.limitBytes + gb * GB)}</strong>
              <span>Tambahan biaya</span>
              <strong>Rp {formatCurrency(monthly)} / bulan</strong>
            </div>
            {error && (
              <p className="storage-note storage-error" role="alert">
                {error}
              </p>
            )}
            <div className="storage-actions">
              <button type="button" className="btn-outline" disabled={busy} onClick={() => setBuying(false)}>
                Batal
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={buy}>
                {busy ? 'Memproses…' : `Tambah ${gb} GB`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
