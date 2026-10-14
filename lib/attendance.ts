import { apiClient, toQueryString } from './api-client';

export type DayMode = 'work' | 'off' | 'flexible';
export type LocationStatus = 'inside' | 'outside' | 'inaccurate' | 'unknown' | 'clinic_unset';
export type DeviceStatus = 'registered' | 'new' | 'clinic';
export type DayStatus =
  | 'present'
  | 'late'
  | 'early_leave'
  | 'working'
  | 'forgot_clock_out'
  | 'not_in_yet'
  | 'absent'
  | 'off';

export interface DaySchedule {
  mode: DayMode;
  start: string | null;
  end: string | null;
}

export interface ClockSide {
  at: string;
  location: LocationStatus | null;
  distanceM: number | null;
  accuracyM: number | null;
  deviceStatus: DeviceStatus | null;
  deviceId: number | null;
  deviceName: string | null;
}

export interface AttendanceDay {
  date: string;
  status: DayStatus;
  lateMinutes: number;
  earlyMinutes: number;
  workedMinutes: number;
  schedule: DaySchedule;
  recordId: number | null;
  clockIn: ClockSide | null;
  clockOut: ClockSide | null;
  correction: {
    at: string | null;
    byName: string | null;
    reason: string | null;
    originalClockIn: string | null;
    originalClockOut: string | null;
  } | null;
}

export interface MyToday {
  day: AttendanceDay;
  serverTime: string;
  radiusM: number;
  clinicLocationSet: boolean;
  deviceStatus: DeviceStatus | 'unknown';
}

export interface ClockResult {
  day: AttendanceDay;
  location: { status: LocationStatus; distanceM: number | null; accuracyM: number | null; radiusM: number };
  deviceStatus: DeviceStatus;
}

export interface RecapRow {
  userId: number;
  name: string;
  role: string;
  workDays: number;
  presentDays: number;
  lateCount: number;
  lateMinutes: number;
  earlyCount: number;
  earlyMinutes: number;
  absentDays: number;
  forgotClockOut: number;
  outsideCount: number;
  newDeviceCount: number;
  workedMinutes: number;
}

export interface TodayBoard {
  date: string;
  serverTime: string;
  counts: { total: number; in: number; late: number; notYet: number; absent: number; flagged: number };
  rows: { userId: number; name: string; role: string; day: AttendanceDay }[];
}

export interface UserMonth {
  month: string;
  user: { id: number; name: string; role: string };
  summary: RecapRow;
  days: AttendanceDay[];
}

export interface AttendanceSettings {
  toleranceMinutes: number;
  radiusM: number;
  latitude: number | null;
  longitude: number | null;
  locationSource: 'attendance' | 'satusehat' | null;
}

export interface Schedules {
  clinic: DaySchedule[];
  clinicSource: 'custom' | 'operational_hours';
  staff: { userId: number; name: string; role: string; week: DaySchedule[] | null }[];
}

export interface AttendanceDevice {
  id: number;
  name: string;
  userId: number | null;
  userName: string | null;
  isRegistered: boolean;
  isClinicDevice: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

/** Dikirim setelah absen supaya tombol absen di header ikut diperbarui */
export const ATTENDANCE_CHANGED = 'apex:attendance-changed';

// ── Penanda perangkat ──────────────────────────────────────────────────

const DEVICE_KEY = 'apex.attendance.device';

/**
 * Penanda acak perangkat ini, disimpan di browser. Server hanya menyimpan
 * hash-nya. Bila penyimpanan browser diblokir, dibuat penanda sementara —
 * absennya tetap tercatat, dengan tanda perangkat baru.
 */
export function deviceToken(): string {
  const fresh = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `${crypto.randomUUID()}-${crypto.randomUUID()}`
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved && saved.length >= 16) return saved;
    const token = fresh();
    localStorage.setItem(DEVICE_KEY, token);
    return token;
  } catch {
    return fresh();
  }
}

/** Nama perangkat yang mudah dikenali owner, mis. "Android · Chrome" */
export function deviceName(): string {
  if (typeof navigator === 'undefined') return 'Perangkat';
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPad/i.test(ua)
      ? 'iPad'
      : /iPhone/i.test(ua)
        ? 'iPhone'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/i.test(ua)
            ? 'Mac'
            : /Linux/i.test(ua)
              ? 'Linux'
              : 'Perangkat';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /SamsungBrowser/i.test(ua)
      ? 'Samsung Internet'
      : /OPR\//i.test(ua)
        ? 'Opera'
        : /Firefox|FxiOS/i.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/i.test(ua)
            ? 'Chrome'
            : /Safari/i.test(ua)
              ? 'Safari'
              : 'Browser';
  return `${os} · ${browser}`;
}

// ── API ────────────────────────────────────────────────────────────────

export interface ClockPayload {
  photo: Blob;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

function clockForm(payload: ClockPayload): FormData {
  const form = new FormData();
  form.append('photo', payload.photo, 'selfie.jpg');
  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    form.append('latitude', String(payload.latitude));
    form.append('longitude', String(payload.longitude));
  }
  if (payload.accuracy !== undefined) form.append('accuracy', String(Math.round(payload.accuracy)));
  form.append('deviceToken', deviceToken());
  form.append('deviceName', deviceName());
  return form;
}

export const attendanceApi = {
  myToday: () =>
    apiClient.get<MyToday>('/attendance/me/today', { headers: { 'x-device-token': deviceToken() } }),
  myMonth: (month?: string) => apiClient.get<UserMonth>(`/attendance/me?${toQueryString({ month })}`),
  clockIn: (payload: ClockPayload) => apiClient.postForm<ClockResult>('/attendance/clock-in', clockForm(payload)),
  clockOut: (payload: ClockPayload) => apiClient.postForm<ClockResult>('/attendance/clock-out', clockForm(payload)),

  today: () => apiClient.get<TodayBoard>('/attendance/today'),
  recap: (month?: string) =>
    apiClient.get<{ month: string; from: string; to: string; rows: RecapRow[] }>(
      `/attendance/recap?${toQueryString({ month })}`,
    ),
  userMonth: (userId: number, month?: string) =>
    apiClient.get<UserMonth>(`/attendance/recap/${userId}?${toQueryString({ month })}`),
  correct: (payload: { userId: number; workDate: string; clockIn: string; clockOut: string | null; reason: string }) =>
    apiClient.put<AttendanceDay>('/attendance/correction', payload),

  settings: () => apiClient.get<AttendanceSettings>('/attendance/settings'),
  saveSettings: (payload: {
    toleranceMinutes: number;
    radiusM: number;
    latitude?: number | null;
    longitude?: number | null;
  }) => apiClient.put<AttendanceSettings>('/attendance/settings', payload),
  schedules: () => apiClient.get<Schedules>('/attendance/schedules'),
  saveClinicSchedule: (days: DaySchedule[]) => apiClient.put<Schedules>('/attendance/schedules/clinic', { days }),
  saveUserSchedule: (userId: number, days: DaySchedule[] | null) =>
    apiClient.put<Schedules>(`/attendance/schedules/users/${userId}`, { days }),
  devices: () => apiClient.get<AttendanceDevice[]>('/attendance/devices'),
  registerDevice: (id: number) => apiClient.post<AttendanceDevice[]>(`/attendance/devices/${id}/register`),
  removeDevice: (id: number) => apiClient.delete<AttendanceDevice[]>(`/attendance/devices/${id}`),
  markClinicDevice: (name: string) =>
    apiClient.post<AttendanceDevice[]>('/attendance/devices/clinic', { deviceToken: deviceToken(), deviceName: name }),
};

// ── Tampilan ───────────────────────────────────────────────────────────

const WIB = 'Asia/Jakarta';

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB });
}

/** "08.00 – 16.00", "08.00 –" (belum pulang), atau "–" (belum masuk) */
export function timeRange(day: { clockIn: ClockSide | null; clockOut: ClockSide | null }): string {
  if (!day.clockIn) return '–';
  return day.clockOut ? `${formatTime(day.clockIn.at)} – ${formatTime(day.clockOut.at)}` : `${formatTime(day.clockIn.at)} –`;
}

export function formatDateLong(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: WIB,
  });
}

export function formatDateShort(date: string): string {
  return new Date(`${date}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: WIB,
  });
}

export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00+07:00`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: WIB,
  });
}

/** Bulan WIB saat ini, 'YYYY-MM' */
export function currentMonth(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** 125 → "2 j 5 m" */
export function formatDuration(minutes: number): string {
  if (!minutes) return '0 m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} m`;
  return m ? `${h} j ${m} m` : `${h} j`;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return '–';
  return meters >= 1000 ? `${(meters / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${meters} m`;
}

export const STATUS_META: Record<DayStatus, { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info' }> = {
  present: { label: 'Hadir', tone: 'ok' },
  late: { label: 'Terlambat', tone: 'warn' },
  early_leave: { label: 'Pulang cepat', tone: 'warn' },
  working: { label: 'Sedang bekerja', tone: 'info' },
  forgot_clock_out: { label: 'Lupa absen pulang', tone: 'warn' },
  not_in_yet: { label: 'Belum masuk', tone: 'muted' },
  absent: { label: 'Tidak hadir', tone: 'bad' },
  off: { label: 'Libur', tone: 'muted' },
};

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  dokter: 'Dokter',
  perawat: 'Perawat',
};

export const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Tanda lokasi untuk satu sisi absen; null bila normal */
export function locationFlag(side: ClockSide | null): { label: string; tone: 'warn' | 'muted' } | null {
  if (!side?.location) return null;
  switch (side.location) {
    case 'outside':
      return { label: `Di luar lokasi · ${formatDistance(side.distanceM)}`, tone: 'warn' };
    case 'inaccurate':
      return { label: `Lokasi kurang akurat · ±${formatDistance(side.accuracyM)}`, tone: 'muted' };
    case 'unknown':
      return { label: 'Lokasi tidak diketahui', tone: 'warn' };
    case 'clinic_unset':
      return { label: 'Titik klinik belum diatur', tone: 'muted' };
    default:
      return null;
  }
}

export function deviceFlag(side: ClockSide | null): { label: string; tone: 'warn' | 'muted' } | null {
  if (side?.deviceStatus === 'new') return { label: `Perangkat baru · ${side.deviceName ?? ''}`.trim(), tone: 'warn' };
  return null;
}

/** Jam 'HH:mm' WIB dari waktu ISO, untuk mengisi input jam */
export function toHHmm(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB });
}

export function scheduleLabel(s: DaySchedule): string {
  if (s.mode === 'work' && s.start && s.end) return `${s.start}–${s.end}`;
  if (s.mode === 'flexible') return 'Jadwal fleksibel';
  return 'Libur';
}
