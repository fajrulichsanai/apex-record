'use client';

import { useEffect, useState } from 'react';
import { formatBytes, storageApi, storageLevel, type StorageQuota } from '@/lib/storage';
import './storage-usage.css';

/**
 * Pemakaian storage file layanan (foto pemeriksaan, foto konten) terhadap
 * jatah paket. Untuk cabang multiklinik, jatahnya dipakai bersama.
 */
export default function StorageUsageCard() {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    storageApi
      .usage()
      .then((q) => {
        if (active) setQuota(q);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed || !quota) return null;
  const { ratio, tone } = storageLevel(quota.usedBytes, quota.limitBytes);
  const pct = Math.min(100, Math.round(ratio * 100));

  return (
    <section className="card storage-card" aria-labelledby="storage-card-title">
      <div className="storage-card-head">
        <h3 id="storage-card-title">Penyimpanan</h3>
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
          ? `Dipakai bersama ${quota.activeBranches ?? 0} cabang multiklinik. Klinik ini memakai ${formatBytes(quota.clinicUsedBytes)}.`
          : 'Dihitung dari foto pemeriksaan penunjang dan foto konten.'}
        {tone === 'bad'
          ? ' Penyimpanan penuh: unggahan baru ditolak sampai jatah ditambah.'
          : tone === 'warn'
            ? ' Hampir penuh.'
            : ''}
      </p>
    </section>
  );
}
