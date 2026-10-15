'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { formatBytes, storageApi } from '@/lib/storage';
import './storage-usage.css';

interface Summary {
  usedBytes: number;
  limitBytes: number;
  extraGb: number;
  scope: 'clinic' | 'multiklinik';
}

/**
 * Super Admin: lihat dan ubah storage tambahan satu klinik, atau jatah
 * bersama satu owner multiklinik (PRD Super Admin BL-05). Positive adds,
 * negative removes; never below zero (checked on the server too).
 */
export default function StorageAdjustCard({ clinicId, ownerId, compact = false }: { clinicId?: number; ownerId?: number; compact?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gb, setGb] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      if (ownerId) {
        const q = await storageApi.owner(ownerId);
        setSummary({ usedBytes: q.usedBytes, limitBytes: q.limitBytes, extraGb: q.extraGb, scope: 'multiklinik' });
      } else if (clinicId) {
        const row = (await storageApi.clinics()).find((r) => r.clinicId === clinicId);
        if (row) setSummary({ usedBytes: row.poolUsedBytes, limitBytes: row.limitBytes, extraGb: row.extraGb, scope: row.scope });
      }
    } catch {
      setSummary(null);
    }
  }, [clinicId, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const delta = Number(gb);
  const valid = gb !== '' && Number.isInteger(delta) && delta !== 0;

  async function save() {
    if (!valid) return;
    setBusy(true);
    setMessage(null);
    try {
      const q = await storageApi.adjust({ clinicId, ownerId, gb: delta, note: note.trim() || undefined });
      setSummary({ usedBytes: q.usedBytes, limitBytes: q.limitBytes, extraGb: q.extraGb, scope: q.scope });
      setMessage({ ok: true, text: `Storage tambahan ${delta > 0 ? 'ditambah' : 'dikurangi'} ${Math.abs(delta)} GB.` });
      setGb('');
      setNote('');
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal mengubah storage' });
    } finally {
      setBusy(false);
    }
  }

  if (!summary) return null;
  const sharedNote = clinicId && summary.scope === 'multiklinik';

  return (
    <section className={compact ? 'storage-adjust compact' : 'card storage-card storage-adjust'}>
      {!compact && <h3>Storage</h3>}
      <p className="storage-figure">
        <strong>{formatBytes(summary.usedBytes)}</strong> dari {formatBytes(summary.limitBytes)}
        {summary.extraGb > 0 && <span className="storage-note"> · tambahan {summary.extraGb} GB</span>}
      </p>
      {sharedNote ? (
        <p className="storage-note">
          Klinik ini cabang multiklinik: jatahnya dipakai bersama. Ubah storage tambahan dari halaman Multi-Klinik Owner.
        </p>
      ) : (
        <>
          <div className="storage-adjust-row">
            <label className="storage-field">
              <span>Ubah (GB)</span>
              <input
                type="number"
                step={1}
                value={gb}
                onChange={(e) => setGb(e.target.value)}
                placeholder="mis. 5 atau -2"
                aria-describedby={`adj-hint-${clinicId ?? ownerId}`}
              />
            </label>
            <label className="storage-field" style={{ flex: 1 }}>
              <span>Catatan</span>
              <input type="text" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="Alasan (opsional)" />
            </label>
            <button type="button" className="btn-primary btn-sm" disabled={!valid || busy} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
          <p id={`adj-hint-${clinicId ?? ownerId}`} className="storage-note">
            Positif menambah, negatif mengurangi storage tambahan. Storage tambahan ikut ditagih di perpanjangan berikutnya (Rp10.000/GB/bulan).
          </p>
        </>
      )}
      {message && <p className={`storage-note ${message.ok ? 'storage-ok' : 'storage-error'}`}>{message.text}</p>}
    </section>
  );
}
