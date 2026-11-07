'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useFeatures } from '@/lib/features-context';
import { isDemoMode } from '@/lib/demo/demo-mode';
import { ATTENDANCE_CHANGED, attendanceApi, formatTime, type MyToday } from '@/lib/attendance';

const STAFF = ['admin', 'dokter', 'perawat'];
const REFRESH_MS = 5 * 60_000;

/** Status absen pegawai di header, mengarah ke halaman Absensi */
export default function AttendanceChip() {
  const { user } = useAuth();
  const { can } = useFeatures();
  const pathname = usePathname();
  const [today, setToday] = useState<MyToday | null>(null);
  const enabled = STAFF.includes(user?.role ?? '') && can('absensi') && !isDemoMode();

  const load = useCallback(async () => {
    try {
      const res = await attendanceApi.myToday();
      setToday(res?.day ? res : null);
    } catch {
      setToday(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    const onChange = () => void load();
    window.addEventListener(ATTENDANCE_CHANGED, onChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(ATTENDANCE_CHANGED, onChange);
    };
  }, [enabled, load]);

  if (!enabled || !today || pathname === '/absensi') return null;

  const { day } = today;
  let label = 'Absen';
  let tone = 'neutral';
  if (day.clockIn && day.clockOut) {
    label = `Selesai ${formatTime(day.clockIn.at)}–${formatTime(day.clockOut.at)}`;
    tone = 'done';
  } else if (day.clockIn) {
    label = `Masuk ${formatTime(day.clockIn.at)} · Absen pulang`;
    tone = 'in';
  } else if (day.schedule.mode === 'work') {
    label = 'Belum absen masuk';
    tone = 'todo';
  }

  return (
    <Link href="/absensi" className={`att-chip ${tone}`} title="Buka halaman Absensi">
      <span className="att-dot" aria-hidden="true" />
      <span className="att-label">{label}</span>
    </Link>
  );
}
