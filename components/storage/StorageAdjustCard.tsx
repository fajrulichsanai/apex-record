'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { formatBytes, formatDateId, storageApi, type StorageAddonRow } from '@/lib/storage';
import './storage-usage.css';

interface Summary {
  usedBytes: number;
  limitBytes: number;
  extraGb: number;
  scope: 'clinic' | 'multiklinik';
}

type Mode = 'billed' | 'free';

const FREE_PERIODS: { value: string; label: string }[] = [
  { value: '1', label: '1 bulan' },
  { value: '2', label: '2 bulan' },
  { value: '3', label: '3 bulan' },
  { value: '6', label: '6 bulan' },
  { value: '12', label: '12 bulan' },
  { value: 'forever', label: 'Selamanya' },
];

/**
 * Super Admin: lihat dan ubah storage tambahan satu klinik, atau jatah
 * bersama satu owner multiklinik (PRD Super Admin BL-05).
 * - Ditagih: positif menambah, negatif mengurangi; ikut tagihan berikutnya.
 * - Gratis (bonus): menambah jatah tanpa tagihan selama masa gratis; setelah
 *   itu GB-nya tetap ada dan ikut ditagih. Bonus bisa dicabut.
 */
export default function StorageAdjustCard({
  clinicId,
  ownerId,
  compact = false,
}: {
  clinicId?: number;
  ownerId?: number;
  compact?: boolean;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [addons, setAddons] = useState<StorageAddonRow[]>([]);
  const [mode, setMode] = useState<Mode>('billed');
  const [period, setPeriod] = useState('3');
  const [gb, setGb] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const name = `adj-${clinicId ?? 'o'}-${ownerId ?? 'c'}`;

  const load = useCallback(async () => {
    try {
      if (ownerId) {
        const q = await storageApi.owner(ownerId);
        setSummary({ usedBytes: q.usedBytes, limitBytes: q.limitBytes, extraGb: q.extraGb, scope: 'multiklinik' });
      } else if (clinicId) {
        const row = (await storageApi.clinics()).find((r) => r.clinicId === clinicId);
        if (row) setSummary({ usedBytes: row.poolUsedBytes, limitBytes: row.limitBytes, extraGb: row.extraGb, scope: row.scope });
      }
      setAddons(await storageApi.addons({ clinicId, ownerId }));
    } catch {
      setSummary(null);
    }
  }, [clinicId, ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const delta = Number(gb);
  const valid = gb !== '' && Number.isInteger(delta) && delta !== 0 && (mode === 'billed' || delta > 0);
  const today = new Date().toISOString().slice(0, 10);
  const activeBonuses = addons.filter((a) => a.isFree && (a.freeUntil === null || a.freeUntil >= today));
  const endedBonuses = addons.filter((a) => a.isFree && a.freeUntil !== null && a.freeUntil < today);

  async function save() {
    if (!valid) return;
    setBusy(true);
    setMessage(null);
    try {
      const free = mode === 'free';
      await storageApi.adjust({
        clinicId,
        ownerId,
        gb: delta,
        note: note.trim() || undefined,
        ...(free ? { free: true, freeMonths: period === 'forever' ? null : Number(period) } : {}),
      });
      await load();
      setMessage({
        ok: true,
        text: free
          ? `Bonus ${delta} GB ditambahkan, gratis ${period === 'forever' ? 'selamanya' : `${period} bulan`}.`
          : `Storage tambahan ${delta > 0 ? 'ditambah' : 'dikurangi'} ${Math.abs(delta)} GB (ditagih).`,
      });
      setGb('');
      setNote('');
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal mengubah storage' });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: number, size: number) {
    if (!window.confirm(`Cabut bonus ${size} GB? Jatah storage berkurang dan bonus ini tidak ditagih lagi.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await storageApi.revokeBonus(id);
      await load();
      setMessage({ ok: true, text: `Bonus ${size} GB dicabut.` });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Gagal mencabut bonus' });
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
          <div className="storage-mode" role="radiogroup" aria-label="Jenis penambahan">
            <label>
              <input type="radio" name={name} checked={mode === 'billed'} onChange={() => setMode('billed')} />
              Ditagih
            </label>
            <label>
              <input type="radio" name={name} checked={mode === 'free'} onChange={() => setMode('free')} />
              Gratis (bonus)
            </label>
          </div>
          <div className="storage-adjust-row">
            <label className="storage-field">
              <span>{mode === 'free' ? 'Bonus (GB)' : 'Ubah (GB)'}</span>
              <input
                type="number"
                step={1}
                min={mode === 'free' ? 1 : undefined}
                value={gb}
                onChange={(e) => setGb(e.target.value)}
                placeholder={mode === 'free' ? 'mis. 3' : 'mis. 5 atau -2'}
              />
            </label>
            {mode === 'free' && (
              <label className="storage-field">
                <span>Gratis selama</span>
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {FREE_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="storage-field" style={{ flex: 1 }}>
              <span>Catatan</span>
              <input type="text" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} placeholder="Alasan (opsional)" />
            </label>
            <button type="button" className="btn-primary btn-sm" disabled={!valid || busy} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
          <p className="storage-note">
            {mode === 'free'
              ? period === 'forever'
                ? 'Bonus menambah jatah dan tidak pernah ditagih.'
                : `Bonus menambah jatah tanpa biaya selama ${period} bulan. Setelah itu storage-nya tetap ada dan ikut ditagih Rp10.000/GB/bulan. Owner diberi tahu lewat email 7 hari sebelumnya.`
              : 'Positif menambah, negatif mengurangi. Ikut ditagih di perpanjangan berikutnya (Rp10.000/GB/bulan).'}
          </p>

          {activeBonuses.length > 0 && (
            <ul className="storage-bonus-list">
              {activeBonuses.map((b) => (
                <li key={b.id}>
                  <span>
                    🎁 {b.gb} GB gratis {b.freeUntil ? `s.d. ${formatDateId(b.freeUntil)}` : 'selamanya'}
                    {b.note && <small> · {b.note}</small>}
                  </span>
                  <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => revoke(b.id, b.gb)}>
                    Cabut
                  </button>
                </li>
              ))}
            </ul>
          )}
          {endedBonuses.length > 0 && (
            <p className="storage-note">
              {endedBonuses.map((b) => `${b.gb} GB bonus (gratis s.d. ${formatDateId(b.freeUntil!)})`).join(', ')} kini ikut ditagih.
            </p>
          )}
        </>
      )}
      {message && <p className={`storage-note ${message.ok ? 'storage-ok' : 'storage-error'}`}>{message.text}</p>}
    </section>
  );
}
