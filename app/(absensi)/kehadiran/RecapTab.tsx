'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { exportToExcel } from '@/lib/export-excel';
import CorrectionDialog from '@/components/attendance/CorrectionDialog';
import { DayFlags, StatusPill } from '@/components/attendance/DayBits';
import {
  attendanceApi,
  currentMonth,
  formatDateShort,
  formatDuration,
  formatMonth,
  formatTime,
  locationFlag,
  deviceFlag,
  ROLE_LABEL,
  scheduleLabel,
  shiftMonth,
  timeRange,
  STATUS_META,
  type AttendanceDay,
  type RecapRow,
  type UserMonth,
} from '@/lib/attendance';

export default function RecapTab({ currentUserId }: { currentUserId: number | undefined }) {
  const { showToast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<RecapRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserMonth | null>(null);
  const [correcting, setCorrecting] = useState<AttendanceDay | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadRecap = useCallback(async (m: string) => {
    setRows(null);
    try {
      const res = await attendanceApi.recap(m);
      setRows(Array.isArray(res?.rows) ? res.rows : []);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat rekap');
      setRows([]);
    }
  }, []);

  const loadDetail = useCallback(async (userId: number, m: string) => {
    setDetail(null);
    try {
      setDetail(await attendanceApi.userMonth(userId, m));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal memuat rincian', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void loadRecap(month);
  }, [loadRecap, month]);

  useEffect(() => {
    if (selected !== null) void loadDetail(selected, month);
  }, [loadDetail, selected, month]);

  async function exportExcel() {
    if (!rows?.length) return;
    setExporting(true);
    try {
      const details = await Promise.all(rows.map((r) => attendanceApi.userMonth(r.userId, month)));
      const recapSheet = rows.map((r) => ({
        Nama: r.name,
        Peran: ROLE_LABEL[r.role] ?? r.role,
        'Hari kerja': r.workDays,
        'Hari hadir': r.presentDays,
        'Terlambat (kali)': r.lateCount,
        'Terlambat (menit)': r.lateMinutes,
        'Pulang cepat (kali)': r.earlyCount,
        'Pulang cepat (menit)': r.earlyMinutes,
        'Tidak hadir': r.absentDays,
        'Lupa absen pulang': r.forgotClockOut,
        'Di luar lokasi': r.outsideCount,
        'Perangkat baru': r.newDeviceCount,
        'Total jam kerja': Math.round((r.workedMinutes / 60) * 10) / 10,
      }));
      const daySheet = details.flatMap((d) =>
        [...d.days].reverse().map((day) => ({
          Nama: d.user.name,
          Tanggal: day.date,
          Jadwal: scheduleLabel(day.schedule),
          Status: STATUS_META[day.status].label,
          Masuk: formatTime(day.clockIn?.at),
          Pulang: formatTime(day.clockOut?.at),
          'Terlambat (menit)': day.lateMinutes,
          'Pulang cepat (menit)': day.earlyMinutes,
          'Durasi (menit)': day.workedMinutes,
          'Lokasi masuk': locationFlag(day.clockIn)?.label ?? (day.clockIn ? 'Di lokasi klinik' : ''),
          'Lokasi pulang': locationFlag(day.clockOut)?.label ?? (day.clockOut ? 'Di lokasi klinik' : ''),
          Perangkat: [deviceFlag(day.clockIn)?.label, deviceFlag(day.clockOut)?.label].filter(Boolean).join('; '),
          Koreksi: day.correction ? `${day.correction.byName ?? ''}: ${day.correction.reason ?? ''}` : '',
        })),
      );
      await exportToExcel(
        [
          { name: 'Rekap', rows: recapSheet },
          { name: 'Rincian harian', rows: daySheet },
        ],
        `rekap-kehadiran-${month}`,
      );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal mengekspor rekap', 'error');
    } finally {
      setExporting(false);
    }
  }

  const selectedRow = rows?.find((r) => r.userId === selected) ?? null;

  return (
    <>
      <div className="ab-card-head">
        <div className="ab-month">
          <button type="button" className="ab-btn ghost sm" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Bulan sebelumnya">
            ‹
          </button>
          <strong>{formatMonth(month)}</strong>
          <button
            type="button"
            className="ab-btn ghost sm"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonth()}
            aria-label="Bulan berikutnya"
          >
            ›
          </button>
        </div>
        <button type="button" className="ab-btn ghost" onClick={exportExcel} disabled={!rows?.length || exporting}>
          {exporting ? 'Menyiapkan…' : 'Ekspor Excel'}
        </button>
      </div>

      {error && <div className="ab-alert bad">{error}</div>}

      <div className="ab-table-wrap">
        <table className="ab-table compact">
          <thead>
            <tr>
              <th>Pegawai</th>
              <th className="r">Hadir</th>
              <th className="r">Terlambat</th>
              <th className="r">Pulang cepat</th>
              <th className="r">Tidak hadir</th>
              <th className="r">Lupa pulang</th>
              <th className="r">Luar lokasi</th>
              <th className="r">Perangkat baru</th>
              <th className="r">Total jam</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={9} className="ab-empty">
                  Memuat…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="ab-empty">
                  Belum ada pegawai untuk direkap.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.userId}>
                  <td className="who">
                    <button type="button" className="ab-link" onClick={() => setSelected(r.userId === selected ? null : r.userId)}>
                      {r.name}
                    </button>
                    <small>{ROLE_LABEL[r.role] ?? r.role}</small>
                  </td>
                  <td className="t r">
                    {r.presentDays}
                    <small>dari {r.workDays} hari kerja</small>
                  </td>
                  <td className="t r">
                    {r.lateCount}
                    {r.lateMinutes > 0 && <small>{formatDuration(r.lateMinutes)}</small>}
                  </td>
                  <td className="t r">
                    {r.earlyCount}
                    {r.earlyMinutes > 0 && <small>{formatDuration(r.earlyMinutes)}</small>}
                  </td>
                  <td className="t r">{r.absentDays}</td>
                  <td className="t r">{r.forgotClockOut}</td>
                  <td className="t r">{r.outsideCount}</td>
                  <td className="t r">{r.newDeviceCount}</td>
                  <td className="t r">{formatDuration(r.workedMinutes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected !== null && (
        <section className="ab-card" aria-label="Rincian harian">
          <div className="ab-card-head">
            <h2>
              Rincian {selectedRow?.name ?? detail?.user.name ?? ''} · {formatMonth(month)}
            </h2>
            <button type="button" className="ab-btn ghost sm" onClick={() => setSelected(null)}>
              Tutup rincian
            </button>
          </div>
          <div className="ab-table-wrap">
            <table className="ab-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Masuk – pulang</th>
                  <th className="r">Durasi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!detail ? (
                  <tr>
                    <td colSpan={5} className="ab-empty">
                      Memuat…
                    </td>
                  </tr>
                ) : detail.days.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ab-empty">
                      Belum ada data di bulan ini.
                    </td>
                  </tr>
                ) : (
                  detail.days.map((d) => (
                    <tr key={d.date}>
                      <td className="t">
                        {formatDateShort(d.date)}
                        <small>{scheduleLabel(d.schedule)}</small>
                      </td>
                      <td>
                        <StatusPill status={d.status} />
                        <DayFlags day={d} />
                        {d.correction?.reason && <small className="ab-muted">Alasan koreksi: {d.correction.reason}</small>}
                      </td>
                      <td className="t">
                        {timeRange(d)}
                      </td>
                      <td className="t r">{d.workedMinutes ? formatDuration(d.workedMinutes) : '–'}</td>
                      <td className="r">
                        {selected !== currentUserId && (
                          <button type="button" className="ab-btn ghost sm" onClick={() => setCorrecting(d)}>
                            Koreksi
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {correcting && selected !== null && (
        <CorrectionDialog
          userId={selected}
          userName={selectedRow?.name ?? detail?.user.name ?? ''}
          day={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            setCorrecting(null);
            showToast('Absen dikoreksi', 'success');
            void loadDetail(selected, month);
            void loadRecap(month);
          }}
        />
      )}
    </>
  );
}
