'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import CorrectionDialog from '@/components/attendance/CorrectionDialog';
import { DayFlags, StatusPill } from '@/components/attendance/DayBits';
import {
  attendanceApi,
  formatDateLong,
  formatTime,
  ROLE_LABEL,
  scheduleLabel,
  type AttendanceDay,
  type TodayBoard,
} from '@/lib/attendance';

const REFRESH_MS = 60_000;

export default function TodayTab({ isOwner, currentUserId }: { isOwner: boolean; currentUserId: number | undefined }) {
  const { showToast } = useToast();
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<{ userId: number; name: string; day: AttendanceDay } | null>(null);
  const [busyDevice, setBusyDevice] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await attendanceApi.today();
      setBoard(Array.isArray(res?.rows) ? res : null);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat kehadiran hari ini');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  async function registerDevice(deviceId: number) {
    setBusyDevice(deviceId);
    try {
      await attendanceApi.registerDevice(deviceId);
      showToast('Perangkat didaftarkan', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal mendaftarkan perangkat', 'error');
    } finally {
      setBusyDevice(null);
    }
  }

  if (error && !board) return <div className="ab-alert bad">{error}</div>;
  if (!board) return <div className="ab-card ab-empty">Memuat kehadiran hari ini…</div>;

  const { counts } = board;

  return (
    <>
      <p className="ab-muted">{formatDateLong(board.date)} · diperbarui otomatis setiap menit</p>
      <div className="ab-stats">
        <div className="ab-stat">
          <span className="v">
            {counts.in}/{counts.total}
          </span>
          <span className="l">Sudah masuk</span>
        </div>
        <div className={`ab-stat ${counts.late ? 'warn' : ''}`}>
          <span className="v">{counts.late}</span>
          <span className="l">Terlambat</span>
        </div>
        <div className="ab-stat">
          <span className="v">{counts.notYet}</span>
          <span className="l">Belum masuk</span>
        </div>
        <div className={`ab-stat ${counts.absent ? 'bad' : ''}`}>
          <span className="v">{counts.absent}</span>
          <span className="l">Tidak hadir</span>
        </div>
        <div className={`ab-stat ${counts.flagged ? 'warn' : ''}`}>
          <span className="v">{counts.flagged}</span>
          <span className="l">Di luar lokasi / perangkat baru</span>
        </div>
      </div>

      <div className="ab-table-wrap">
        <table className="ab-table">
          <thead>
            <tr>
              <th>Pegawai</th>
              <th>Jadwal</th>
              <th>Status</th>
              <th>Masuk</th>
              <th>Pulang</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {board.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="ab-empty">
                  Belum ada pegawai (admin, dokter, perawat) di klinik ini.
                </td>
              </tr>
            ) : (
              board.rows.map((row) => {
                const newDevices = [row.day.clockIn, row.day.clockOut]
                  .filter((s) => s?.deviceStatus === 'new' && s.deviceId)
                  .map((s) => s!.deviceId as number);
                const deviceToRegister = newDevices[0];
                return (
                  <tr key={row.userId}>
                    <td className="who">
                      {row.name}
                      <small>{ROLE_LABEL[row.role] ?? row.role}</small>
                    </td>
                    <td className="t">{scheduleLabel(row.day.schedule)}</td>
                    <td>
                      <StatusPill status={row.day.status} />
                      <DayFlags day={row.day} />
                    </td>
                    <td className="t">{formatTime(row.day.clockIn?.at)}</td>
                    <td className="t">{formatTime(row.day.clockOut?.at)}</td>
                    <td className="r">
                      <div className="ab-flags end">
                        {isOwner && deviceToRegister && (
                          <button
                            type="button"
                            className="ab-btn ghost sm"
                            disabled={busyDevice !== null}
                            onClick={() => registerDevice(deviceToRegister)}
                          >
                            Daftarkan perangkat
                          </button>
                        )}
                        {row.userId !== currentUserId && (
                          <button
                            type="button"
                            className="ab-btn ghost sm"
                            onClick={() => setCorrecting({ userId: row.userId, name: row.name, day: row.day })}
                          >
                            Koreksi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {correcting && (
        <CorrectionDialog
          userId={correcting.userId}
          userName={correcting.name}
          day={correcting.day}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            setCorrecting(null);
            showToast('Absen dikoreksi', 'success');
            void load();
          }}
        />
      )}
    </>
  );
}
