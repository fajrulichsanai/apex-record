'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useEscapeKey } from '@/lib/a11y';
import { attendanceApi, formatDateLong, toHHmm, type AttendanceDay } from '@/lib/attendance';

/** Owner/admin mengoreksi jam absen. Alasan wajib; jam asli tetap tersimpan. */
export default function CorrectionDialog({
  userId,
  userName,
  day,
  onClose,
  onSaved,
}: {
  userId: number;
  userName: string;
  day: AttendanceDay;
  onClose: () => void;
  onSaved: (day: AttendanceDay) => void;
}) {
  const [clockIn, setClockIn] = useState(toHHmm(day.clockIn?.at) || day.schedule.start || '');
  const [clockOut, setClockOut] = useState(toHHmm(day.clockOut?.at) || (day.clockIn ? day.schedule.end ?? '' : ''));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose, !saving);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clockIn) return setError('Jam masuk wajib diisi');
    if (clockOut && clockOut <= clockIn) return setError('Jam pulang harus setelah jam masuk');
    if (!reason.trim()) return setError('Alasan koreksi wajib diisi');
    setSaving(true);
    setError(null);
    try {
      const saved = await attendanceApi.correct({
        userId,
        workDate: day.date,
        clockIn,
        clockOut: clockOut || null,
        reason: reason.trim(),
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan koreksi');
      setSaving(false);
    }
  }

  return (
    <div className="ab-overlay" role="dialog" aria-modal="true" aria-labelledby="ab-corr-title">
      <form className="ab-dialog" onSubmit={save}>
        <div className="ab-dialog-head">
          <h2 id="ab-corr-title">Koreksi absen</h2>
          <button type="button" className="ab-close" onClick={onClose} aria-label="Tutup" disabled={saving}>
            ×
          </button>
        </div>
        <div className="ab-dialog-body">
          <p className="ab-hint">
            {userName} · {formatDateLong(day.date)}. Jam asli tetap tersimpan dan koreksi tercatat di log aktivitas.
          </p>
          <div className="ab-form">
            <label className="ab-field" htmlFor="ab-corr-in">
              Jam masuk
              <input id="ab-corr-in" type="time" className="ab-input" value={clockIn} onChange={(e) => setClockIn(e.target.value)} required />
            </label>
            <label className="ab-field" htmlFor="ab-corr-out">
              Jam pulang <small>kosongkan bila belum pulang</small>
              <input id="ab-corr-out" type="time" className="ab-input" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
            </label>
            <label className="ab-field span-2" htmlFor="ab-corr-reason">
              Alasan koreksi
              <input
                id="ab-corr-reason"
                className="ab-input"
                value={reason}
                maxLength={255}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. Lupa absen pulang, sudah dikonfirmasi"
                required
              />
            </label>
          </div>
          {error && (
            <div className="ab-alert bad" role="alert">
              {error}
            </div>
          )}
          <div className="ab-dialog-actions">
            <button type="button" className="ab-btn ghost" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="ab-btn primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan koreksi'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
