'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';
import WeekEditor, { emptyWeek, weekError } from '@/components/attendance/WeekEditor';
import {
  attendanceApi,
  deviceName,
  formatDistance,
  ROLE_LABEL,
  scheduleLabel,
  type AttendanceDevice,
  type AttendanceSettings,
  type DaySchedule,
  type Schedules,
} from '@/lib/attendance';

function weekSummary(week: DaySchedule[]): string {
  const work = week.filter((d) => d.mode === 'work');
  const flexible = week.filter((d) => d.mode === 'flexible').length;
  if (flexible === 7) return 'Fleksibel setiap hari';
  if (work.length === 0) return flexible ? `Fleksibel ${flexible} hari` : 'Libur setiap hari';
  const labels = [...new Set(work.map(scheduleLabel))];
  return `${work.length} hari kerja · ${labels.join(', ')}${flexible ? ` · ${flexible} hari fleksibel` : ''}`;
}

export default function SettingsTab({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="ab-stack">
      <div className="ab-grid-2">
        <RulesCard isOwner={isOwner} />
        <DevicesCard isOwner={isOwner} />
      </div>
      <SchedulesCard isOwner={isOwner} />
    </div>
  );
}

// ── Lokasi & aturan ─────────────────────────────────────────────────────

function RulesCard({ isOwner }: { isOwner: boolean }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [form, setForm] = useState({ tolerance: '10', radius: '100', lat: '', lng: '' });
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((s: AttendanceSettings) => {
    setSettings(s);
    setForm({
      tolerance: String(s.toleranceMinutes),
      radius: String(s.radiusM),
      lat: s.latitude === null ? '' : String(s.latitude),
      lng: s.longitude === null ? '' : String(s.longitude),
    });
  }, []);

  useEffect(() => {
    attendanceApi
      .settings()
      .then((s) => s && typeof s.radiusM === 'number' && apply(s))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat pengaturan'));
  }, [apply]);

  function takeMyLocation() {
    if (!navigator.geolocation) {
      showToast('Perangkat ini tidak mendukung lokasi', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) }));
        setLocating(false);
        showToast(`Lokasi diambil (akurasi ±${Math.round(pos.coords.accuracy)} m). Jangan lupa simpan.`, 'success');
      },
      () => {
        setLocating(false);
        showToast('Lokasi tidak bisa diambil. Pastikan izin lokasi diberikan.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const tolerance = Number(form.tolerance);
    const radius = Number(form.radius);
    const hasPoint = form.lat.trim() !== '' || form.lng.trim() !== '';
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 240) return setError('Toleransi harus 0–240 menit');
    if (!Number.isInteger(radius) || radius < 20 || radius > 5000) return setError('Radius harus 20–5.000 meter');
    if (hasPoint && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      return setError('Titik lokasi tidak valid. Isi lintang dan bujur, atau pakai lokasi Anda sekarang.');
    }
    setSaving(true);
    setError(null);
    try {
      apply(
        await attendanceApi.saveSettings({
          toleranceMinutes: tolerance,
          radiusM: radius,
          ...(hasPoint ? { latitude: lat, longitude: lng } : {}),
        }),
      );
      showToast('Pengaturan absensi disimpan', 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ab-card" onSubmit={save}>
      <h2>Lokasi &amp; aturan</h2>
      {!settings && !error && <p className="ab-muted">Memuat…</p>}
      {settings && (
        <>
          <div className="ab-form">
            <label className="ab-field" htmlFor="ab-tolerance">
              Toleransi terlambat <small>menit setelah jam masuk</small>
              <input
                id="ab-tolerance"
                type="number"
                min={0}
                max={240}
                className="ab-input"
                value={form.tolerance}
                disabled={!isOwner}
                onChange={(e) => setForm((f) => ({ ...f, tolerance: e.target.value }))}
              />
            </label>
            <label className="ab-field" htmlFor="ab-radius">
              Radius lokasi <small>meter dari titik klinik</small>
              <input
                id="ab-radius"
                type="number"
                min={20}
                max={5000}
                className="ab-input"
                value={form.radius}
                disabled={!isOwner}
                onChange={(e) => setForm((f) => ({ ...f, radius: e.target.value }))}
              />
            </label>
            <label className="ab-field" htmlFor="ab-lat">
              Lintang
              <input
                id="ab-lat"
                inputMode="decimal"
                className="ab-input"
                value={form.lat}
                placeholder="-6.2000000"
                disabled={!isOwner}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              />
            </label>
            <label className="ab-field" htmlFor="ab-lng">
              Bujur
              <input
                id="ab-lng"
                inputMode="decimal"
                className="ab-input"
                value={form.lng}
                placeholder="106.8166667"
                disabled={!isOwner}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              />
            </label>
          </div>
          <p className="ab-hint">
            {settings.locationSource === 'satusehat' &&
              'Titik klinik saat ini diambil dari profil SATUSEHAT. Simpan di sini untuk memakai titik khusus absensi.'}
            {settings.locationSource === null &&
              'Titik klinik belum diatur. Absen tetap tercatat, tapi jarak ke klinik belum bisa dihitung.'}
            {settings.locationSource === 'attendance' &&
              `Absen lebih dari ${formatDistance(settings.radiusM)} dari titik ini diberi tanda di luar lokasi.`}
          </p>
          {error && <div className="ab-alert bad">{error}</div>}
          {isOwner && (
            <div className="ab-dialog-actions">
              <button type="button" className="ab-btn ghost" onClick={takeMyLocation} disabled={locating}>
                {locating ? 'Mengambil lokasi…' : 'Pakai lokasi saya sekarang'}
              </button>
              <button type="submit" className="ab-btn primary" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          )}
        </>
      )}
      {error && !settings && <div className="ab-alert bad">{error}</div>}
    </form>
  );
}

// ── Jadwal kerja ────────────────────────────────────────────────────────

function SchedulesCard({ isOwner }: { isOwner: boolean }) {
  const { showToast } = useToast();
  const [data, setData] = useState<Schedules | null>(null);
  const [week, setWeek] = useState<DaySchedule[]>(emptyWeek());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Schedules['staff'][number] | null>(null);

  const apply = useCallback((s: Schedules) => {
    setData(s);
    setWeek(s.clinic);
  }, []);

  useEffect(() => {
    attendanceApi
      .schedules()
      .then((s) => s && Array.isArray(s.clinic) && apply(s))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal memuat jadwal'));
  }, [apply]);

  async function saveClinic() {
    const problem = weekError(week);
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      apply(await attendanceApi.saveClinicSchedule(week));
      showToast('Jadwal klinik disimpan', 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan jadwal');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ab-card" aria-label="Jadwal kerja">
      <h2>Jadwal kerja bawaan klinik</h2>
      {data?.clinicSource === 'operational_hours' && (
        <p className="ab-hint">
          Saat ini diambil dari jam operasional klinik. Simpan di sini bila jam kerja pegawai berbeda dari jam buka
          klinik.
        </p>
      )}
      {!data && !error && <p className="ab-muted">Memuat…</p>}
      {data && <WeekEditor idPrefix="ab-clinic" week={week} onChange={setWeek} disabled={!isOwner} />}
      {error && <div className="ab-alert bad">{error}</div>}
      {isOwner && data && (
        <div className="ab-dialog-actions">
          <button type="button" className="ab-btn primary" onClick={saveClinic} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan jadwal klinik'}
          </button>
        </div>
      )}

      <h2>Jadwal khusus pegawai</h2>
      <p className="ab-hint">Untuk pegawai dengan jam berbeda, mis. dokter yang praktik sore atau per sesi.</p>
      <div className="ab-device-list">
        {data?.staff.length === 0 && <p className="ab-muted">Belum ada pegawai.</p>}
        {data?.staff.map((s) => (
          <div key={s.userId} className="ab-device">
            <div className="info">
              <strong>{s.name}</strong>
              <span className="ab-muted">
                {ROLE_LABEL[s.role] ?? s.role} · {s.week ? weekSummary(s.week) : 'Ikut jadwal klinik'}
              </span>
            </div>
            {isOwner && (
              <div className="actions">
                <button type="button" className="ab-btn ghost sm" onClick={() => setEditing(s)}>
                  Atur
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && data && (
        <UserScheduleDialog
          staff={editing}
          fallback={data.clinic}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            apply(s);
            setEditing(null);
            showToast('Jadwal pegawai disimpan', 'success');
          }}
        />
      )}
    </section>
  );
}

function UserScheduleDialog({
  staff,
  fallback,
  onClose,
  onSaved,
}: {
  staff: Schedules['staff'][number];
  fallback: DaySchedule[];
  onClose: () => void;
  onSaved: (s: Schedules) => void;
}) {
  const [week, setWeek] = useState<DaySchedule[]>(staff.week ?? fallback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose, !saving);

  async function save(days: DaySchedule[] | null) {
    if (days) {
      const problem = weekError(days);
      if (problem) return setError(problem);
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await attendanceApi.saveUserSchedule(staff.userId, days));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal menyimpan jadwal');
      setSaving(false);
    }
  }

  return (
    <div className="ab-overlay" role="dialog" aria-modal="true" aria-labelledby="ab-user-sched-title">
      <div className="ab-dialog wide">
        <div className="ab-dialog-head">
          <h2 id="ab-user-sched-title">Jadwal {staff.name}</h2>
          <button type="button" className="ab-close" onClick={onClose} aria-label="Tutup" disabled={saving}>
            ×
          </button>
        </div>
        <div className="ab-dialog-body">
          <WeekEditor idPrefix={`ab-user-${staff.userId}`} week={week} onChange={setWeek} disabled={saving} />
          <button
            type="button"
            className="ab-link"
            onClick={() => setWeek(Array.from({ length: 7 }, (): DaySchedule => ({ mode: 'flexible', start: null, end: null })))}
          >
            Jadikan fleksibel setiap hari
          </button>
          {error && <div className="ab-alert bad">{error}</div>}
          <div className="ab-dialog-actions">
            {staff.week && (
              <button type="button" className="ab-btn ghost" onClick={() => save(null)} disabled={saving}>
                Kembali ke jadwal klinik
              </button>
            )}
            <button type="button" className="ab-btn primary" onClick={() => save(week)} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Perangkat ───────────────────────────────────────────────────────────

function DevicesCard({ isOwner }: { isOwner: boolean }) {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<AttendanceDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [clinicName, setClinicName] = useState('Tablet meja depan');
  const [confirmRemove, setConfirmRemove] = useState<AttendanceDevice | null>(null);

  useEffect(() => {
    attendanceApi
      .devices()
      .then((d) => setDevices(Array.isArray(d) ? d : []))
      .catch(() => setDevices([]));
  }, []);

  async function run(action: () => Promise<AttendanceDevice[]>, message: string) {
    setBusy(true);
    try {
      setDevices(await action());
      showToast(message, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusy(false);
      setConfirmRemove(null);
    }
  }

  const staffDevices = devices?.filter((d) => !d.isClinicDevice) ?? [];
  const clinicDevices = devices?.filter((d) => d.isClinicDevice) ?? [];

  return (
    <section className="ab-card" aria-label="Perangkat absen">
      <h2>Perangkat absen</h2>
      <p className="ab-hint">
        Tiap pegawai boleh punya 2 perangkat terdaftar. Absen dari perangkat lain tetap tercatat dengan tanda perangkat
        baru.
      </p>
      {!devices && <p className="ab-muted">Memuat…</p>}
      {devices && staffDevices.length === 0 && <p className="ab-muted">Belum ada perangkat. Perangkat tercatat saat pegawai pertama kali absen.</p>}
      <div className="ab-device-list">
        {staffDevices.map((d) => (
          <div key={d.id} className="ab-device">
            <div className="info">
              <strong>{d.name}</strong>
              <span className="ab-muted">
                {d.userName ?? 'Pegawai'} ·{' '}
                {d.lastUsedAt ? `terakhir dipakai ${new Date(d.lastUsedAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}` : 'belum dipakai'}
              </span>
            </div>
            <div className="actions">
              <span className={`ab-pill ${d.isRegistered ? 'ok' : 'warn'}`}>{d.isRegistered ? 'Terdaftar' : 'Baru'}</span>
              {isOwner && !d.isRegistered && (
                <button
                  type="button"
                  className="ab-btn ghost sm"
                  disabled={busy}
                  onClick={() => run(() => attendanceApi.registerDevice(d.id), 'Perangkat didaftarkan')}
                >
                  Daftarkan
                </button>
              )}
              {isOwner && (
                <button type="button" className="ab-btn danger sm" disabled={busy} onClick={() => setConfirmRemove(d)}>
                  Hapus
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <h2>Perangkat klinik</h2>
      <p className="ab-hint">Tablet bersama di meja depan. Semua pegawai boleh absen dari perangkat klinik tanpa tanda.</p>
      <div className="ab-device-list">
        {clinicDevices.map((d) => (
          <div key={d.id} className="ab-device">
            <div className="info">
              <strong>{d.name}</strong>
              <span className="ab-muted">Perangkat klinik</span>
            </div>
            {isOwner && (
              <div className="actions">
                <button type="button" className="ab-btn danger sm" disabled={busy} onClick={() => setConfirmRemove(d)}>
                  Hapus
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {isOwner && (
        <div className="ab-inline-form">
          <label className="ab-field" htmlFor="ab-clinic-device">
            Nama perangkat ini
            <input
              id="ab-clinic-device"
              className="ab-input"
              value={clinicName}
              maxLength={100}
              onChange={(e) => setClinicName(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="ab-btn ghost"
            disabled={busy}
            onClick={() =>
              run(
                () => attendanceApi.markClinicDevice(clinicName.trim() || deviceName()),
                'Perangkat ini dijadikan perangkat klinik',
              )
            }
          >
            Jadikan perangkat klinik
          </button>
        </div>
      )}

      {confirmRemove && (
        <div className="ab-overlay" role="dialog" aria-modal="true" aria-labelledby="ab-remove-title">
          <div className="ab-dialog">
            <div className="ab-dialog-head">
              <h2 id="ab-remove-title">Hapus perangkat?</h2>
            </div>
            <div className="ab-dialog-body">
              <p className="ab-hint">
                {confirmRemove.name}
                {confirmRemove.userName ? ` milik ${confirmRemove.userName}` : ''} akan dihapus. Absen berikutnya dari
                perangkat ini akan diberi tanda perangkat baru. Riwayat absen tidak berubah.
              </p>
              <div className="ab-dialog-actions">
                <button type="button" className="ab-btn ghost" onClick={() => setConfirmRemove(null)} disabled={busy}>
                  Batal
                </button>
                <button
                  type="button"
                  className="ab-btn danger"
                  disabled={busy}
                  onClick={() => run(() => attendanceApi.removeDevice(confirmRemove.id), 'Perangkat dihapus')}
                >
                  Hapus perangkat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
