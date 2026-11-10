'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ClockDialog from '@/components/attendance/ClockDialog';
import { DayFlags, StatusPill } from '@/components/attendance/DayBits';
import { useAuth } from '@/lib/auth-context';
import { useFeatures } from '@/lib/features-context';
import { ApiError } from '@/lib/api-client';
import {
  ATTENDANCE_CHANGED,
  attendanceApi,
  currentMonth,
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatMonth,
  formatTime,
  scheduleLabel,
  shiftMonth,
  timeRange,
  type MyToday,
  type UserMonth,
} from '@/lib/attendance';
import '../../styles/absensi.css';

const STAFF = ['admin', 'dokter', 'perawat'];

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function AbsensiPage() {
  const { user } = useAuth();
  const { can } = useFeatures();
  const allowed = can('absensi') && STAFF.includes(user?.role ?? '');

  return (
    <DashboardLayout>
      <FeatureGuard feature="absensi">
        <main className="content ab-scope">
          {allowed ? (
            <AbsensiContent />
          ) : (
            <div className="ab-page narrow">
              <div className="ab-card">
                <h2>Absensi untuk pegawai</h2>
                <p className="ab-hint">
                  Halaman ini dipakai admin, dokter, dan perawat untuk absen. Owner melihat kehadiran pegawai di menu
                  Kehadiran Pegawai.
                </p>
              </div>
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}

function AbsensiContent() {
  const now = useNow();
  const [today, setToday] = useState<MyToday | null>(null);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'in' | 'out' | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [history, setHistory] = useState<UserMonth | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadToday = useCallback(async () => {
    try {
      setToday(await attendanceApi.myToday());
      setTodayError(null);
    } catch (err) {
      setTodayError(err instanceof ApiError ? err.message : 'Gagal memuat absen hari ini');
    }
  }, []);

  const loadHistory = useCallback(async (m: string) => {
    try {
      setHistory(await attendanceApi.myMonth(m));
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err instanceof ApiError ? err.message : 'Gagal memuat riwayat');
    }
  }, []);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  useEffect(() => {
    void loadHistory(month);
  }, [loadHistory, month]);

  const day = today?.day;
  const clockedIn = !!day?.clockIn;
  const clockedOut = !!day?.clockOut;

  function handleDone() {
    void loadToday();
    void loadHistory(month);
    window.dispatchEvent(new Event(ATTENDANCE_CHANGED));
  }

  return (
    <div className="ab-page narrow">
      <div className="ab-head">
        <div>
          <h1>Absensi</h1>
          <p>Absen masuk dan pulang dengan selfie dan lokasi. Foto tidak disimpan.</p>
        </div>
      </div>

      <section className="ab-card" aria-label="Absen hari ini">
        {todayError && <div className="ab-alert bad">{todayError}</div>}
        <div className="ab-today">
          <div className="ab-today-main">
            <div className="ab-today-date">{day ? formatDateLong(day.date) : 'Hari ini'}</div>
            <div className="ab-clock-now" aria-live="off">
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })}
            </div>
            {day && (
              <div className="ab-today-sched">
                <span>Jadwal: {scheduleLabel(day.schedule)}</span>
                <StatusPill status={day.status} />
              </div>
            )}
          </div>
          <div>
            {!clockedIn && (
              <button type="button" className="ab-big-btn" onClick={() => setDialog('in')} disabled={!today}>
                Absen Masuk
                <small>Selfie + lokasi</small>
              </button>
            )}
            {clockedIn && !clockedOut && (
              <button type="button" className="ab-big-btn out" onClick={() => setDialog('out')}>
                Absen Pulang
                <small>Masuk {formatTime(day?.clockIn?.at)}</small>
              </button>
            )}
            {clockedOut && <div className="ab-done">Absen hari ini selesai</div>}
          </div>
        </div>

        {day && (clockedIn || clockedOut) && (
          <>
            <div className="ab-times">
              <div className="ab-time-box">
                <span className="lbl">Masuk</span>
                <span className="val">{formatTime(day.clockIn?.at)}</span>
              </div>
              <div className="ab-time-box">
                <span className="lbl">Pulang</span>
                <span className="val">{formatTime(day.clockOut?.at)}</span>
              </div>
            </div>
            <DayFlags day={day} />
          </>
        )}

        {today && !today.clinicLocationSet && (
          <p className="ab-hint">Titik lokasi klinik belum diatur owner, jadi jarak Anda ke klinik belum bisa dihitung.</p>
        )}
        {today?.deviceStatus === 'new' && !clockedOut && (
          <div className="ab-alert warn">
            Perangkat ini belum terdaftar. Anda tetap bisa absen, dan owner akan melihat tanda perangkat baru.
          </div>
        )}
      </section>

      <section className="ab-card" aria-labelledby="ab-history-title">
        <div className="ab-card-head">
          <h2 id="ab-history-title">Riwayat saya</h2>
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
        </div>

        {historyError && <div className="ab-alert bad">{historyError}</div>}
        {history && (
          <div className="ab-stats">
            <div className="ab-stat">
              <span className="v">{history.summary.presentDays}</span>
              <span className="l">Hari hadir</span>
            </div>
            <div className={`ab-stat ${history.summary.lateCount ? 'warn' : ''}`}>
              <span className="v">{history.summary.lateCount}</span>
              <span className="l">Terlambat · {formatDuration(history.summary.lateMinutes)}</span>
            </div>
            <div className={`ab-stat ${history.summary.absentDays ? 'bad' : ''}`}>
              <span className="v">{history.summary.absentDays}</span>
              <span className="l">Tidak hadir</span>
            </div>
            <div className="ab-stat">
              <span className="v">{formatDuration(history.summary.workedMinutes)}</span>
              <span className="l">Total jam kerja</span>
            </div>
          </div>
        )}

        <div className="ab-table-wrap">
          <table className="ab-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Masuk – pulang</th>
                <th className="r">Durasi</th>
              </tr>
            </thead>
            <tbody>
              {!history ? (
                <tr>
                  <td colSpan={4} className="ab-empty">
                    Memuat…
                  </td>
                </tr>
              ) : history.days.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ab-empty">
                    Belum ada data di bulan ini.
                  </td>
                </tr>
              ) : (
                history.days.map((d) => (
                  <tr key={d.date}>
                    <td className="t">
                      {formatDateShort(d.date)}
                      <small>{scheduleLabel(d.schedule)}</small>
                    </td>
                    <td>
                      <StatusPill status={d.status} />
                      <DayFlags day={d} />
                    </td>
                    <td className="t">
                      {timeRange(d)}
                    </td>
                    <td className="t r">{d.workedMinutes ? formatDuration(d.workedMinutes) : '–'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dialog && <ClockDialog kind={dialog} onClose={() => setDialog(null)} onDone={handleDone} />}
    </div>
  );
}
