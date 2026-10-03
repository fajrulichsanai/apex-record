'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SettingsTabs from '@/components/settings/SettingsTabs';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import CustomSelect from '@/components/form/CustomSelect';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useChartTheme } from '@/lib/chart-theme';
import { resolveFileUrl } from '@/lib/api-client';
import { clinicApi, type ClinicResponse } from '@/lib/clinic';
import {
  apiKeysApi,
  PUBLIC_API_BASE,
  type ApiKeyRow,
  type ApiKeyType,
  type ApiKeyWithSecret,
  type ApiPractitioner,
  type ApiUsage,
} from '@/lib/api-keys';
import ApiDocs from './ApiDocs';
import '../../styles/api-klinik.css';

const DAYS: { key: string; label: string }[] = [
  { key: 'senin', label: 'Senin' },
  { key: 'selasa', label: 'Selasa' },
  { key: 'rabu', label: 'Rabu' },
  { key: 'kamis', label: 'Kamis' },
  { key: 'jumat', label: 'Jumat' },
  { key: 'sabtu', label: 'Sabtu' },
  { key: 'minggu', label: 'Minggu' },
];

const fmt = (n: number) => n.toLocaleString('id-ID');

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Terjadi kesalahan';
}

/** One domain per line or comma-separated → trimmed list. */
function parseOrigins(text: string) {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------- usage

function UsagePanel({ usage }: { usage: ApiUsage | null }) {
  const chart = useChartTheme();
  if (!usage) return <div className="panel api-usage-panel api-skeleton" />;
  const pct = Math.min(100, Math.round((usage.usedToday / usage.limitPerDay) * 100));
  const total30 = usage.daily.reduce((s, d) => s + d.count, 0);
  const data = usage.daily.map((d) => ({
    ...d,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="panel api-usage-panel">
      <div className="panel-header">
        <h2>Pemakaian</h2>
        <span className={`api-badge ${usage.subscriptionActive ? 'ok' : 'danger'}`}>
          {usage.subscriptionActive ? `Paket ${usage.plan}` : 'Langganan tidak aktif — API nonaktif'}
        </span>
      </div>
      <div className="api-stat-grid">
        <div className="api-stat">
          <span className="api-stat-label">Hari ini</span>
          <span className="api-stat-value">{fmt(usage.usedToday)}</span>
          <span className="api-stat-sub">dari {fmt(usage.limitPerDay)} request/hari</span>
          <div className="api-meter" aria-label={`Terpakai ${pct}%`}>
            <div className={`api-meter-fill${pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="api-stat">
          <span className="api-stat-label">Sisa kuota hari ini</span>
          <span className="api-stat-value">{fmt(usage.remainingToday)}</span>
          <span className="api-stat-sub">direset pukul 00:00 WIB</span>
        </div>
        <div className="api-stat">
          <span className="api-stat-label">Batas per menit</span>
          <span className="api-stat-value">{fmt(usage.limitPerMinute)}</span>
          <span className="api-stat-sub">request per key</span>
        </div>
        <div className="api-stat">
          <span className="api-stat-label">30 hari terakhir</span>
          <span className="api-stat-value">{fmt(total30)}</span>
          <span className="api-stat-sub">total request</span>
        </div>
      </div>
      <div className="api-chart">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis dataKey="label" tick={chart.axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={chart.axisTick} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip {...chart.tooltip} formatter={(v) => [fmt(Number(v)), 'Request']} />
            <Bar dataKey="count" fill={chart.series.pendapatan} radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- keys

function KeyRevealModal({ apiKey, onClose }: { apiKey: ApiKeyWithSecret; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="api-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="api-reveal-title">
      <div className="api-modal">
        <h2 id="api-reveal-title">Simpan API key ini sekarang</h2>
        <p className="api-modal-text">
          Key <strong>{apiKey.name}</strong> hanya ditampilkan <strong>sekali</strong>. Setelah jendela ini ditutup, key tidak bisa dilihat
          lagi — hanya bisa dirotasi (dibuat ulang).
        </p>
        <div className="api-secret-box">
          <code>{apiKey.key}</code>
          <button type="button" className="btn-primary" onClick={copy}>
            {copied ? 'Tersalin ✓' : 'Salin'}
          </button>
        </div>
        {apiKey.type === 'secret' ? (
          <p className="api-note warn">
            Secret key hanya untuk server (backend tim IT Anda). Jangan taruh di kode website, aplikasi mobile, atau repository publik.
          </p>
        ) : (
          <p className="api-note">
            Publishable key aman ditaruh di kode website, karena hanya berlaku dari domain: {apiKey.allowedOrigins.join(', ')}.
          </p>
        )}
        <div className="api-modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Sudah saya simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyFormModal({
  editing,
  onClose,
  onSubmit,
}: {
  editing: ApiKeyRow | null;
  onClose: () => void;
  onSubmit: (values: { name: string; type: ApiKeyType; allowedOrigins: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<ApiKeyType>(editing?.type ?? 'publishable');
  const [origins, setOrigins] = useState((editing?.allowedOrigins ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowedOrigins = type === 'publishable' ? parseOrigins(origins) : [];
    if (!name.trim()) return setError('Nama key wajib diisi.');
    if (type === 'publishable' && allowedOrigins.length === 0) {
      return setError('Publishable key wajib punya minimal satu domain website.');
    }
    const bad = allowedOrigins.find((o) => !/^https?:\/\/[a-z0-9.-]+(:\d{1,5})?\/?$/i.test(o));
    if (bad) return setError(`"${bad}" bukan domain yang valid. Contoh: https://klinik-saya.web.app (tanpa path).`);
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), type, allowedOrigins });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="api-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="api-form-title">
      <form className="api-modal" onSubmit={submit}>
        <h2 id="api-form-title">{editing ? 'Ubah API key' : 'Buat API key'}</h2>
        <label className="api-field">
          <span>Nama</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Website klinik" maxLength={100} autoFocus />
        </label>
        {!editing && (
          <fieldset className="api-type-picker">
            <legend>Jenis key</legend>
            <label className={`api-type-option${type === 'publishable' ? ' selected' : ''}`}>
              <input type="radio" name="type" checked={type === 'publishable'} onChange={() => setType('publishable')} />
              <strong>Publishable</strong>
              <span>Untuk website (dipanggil dari browser). Terkunci ke domain yang Anda daftarkan.</span>
            </label>
            <label className={`api-type-option${type === 'secret' ? ' selected' : ''}`}>
              <input type="radio" name="type" checked={type === 'secret'} onChange={() => setType('secret')} />
              <strong>Secret</strong>
              <span>Untuk server/backend tim IT. Ditolak bila dipakai dari browser.</span>
            </label>
          </fieldset>
        )}
        {type === 'publishable' && (
          <label className="api-field">
            <span>Domain yang diizinkan</span>
            <textarea
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
              rows={3}
              placeholder={'https://klinik-saya.web.app\nhttps://www.klinik-saya.com'}
            />
            <small>Satu domain per baris, lengkap dengan https://, tanpa path. Maksimal 10.</small>
          </label>
        )}
        {error && <p className="api-form-error">{error}</p>}
        <div className="api-modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Menyimpan…' : editing ? 'Simpan' : 'Buat key'}
          </button>
        </div>
      </form>
    </div>
  );
}

function KeysPanel({
  keys,
  usage,
  onCreate,
  onEdit,
  onRotate,
  onRevoke,
}: {
  keys: ApiKeyRow[] | null;
  usage: ApiUsage | null;
  onCreate: () => void;
  onEdit: (k: ApiKeyRow) => void;
  onRotate: (k: ApiKeyRow) => void;
  onRevoke: (k: ApiKeyRow) => void;
}) {
  const [showRevoked, setShowRevoked] = useState(false);
  const counts = useMemo(() => new Map((usage?.byKey ?? []).map((b) => [b.apiKeyId, b.count])), [usage]);
  const visible = (keys ?? []).filter((k) => showRevoked || !k.revokedAt);
  const revokedCount = (keys ?? []).filter((k) => k.revokedAt).length;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>API Key</h2>
          <p className="panel-sub">Maksimal 10 key aktif. Key lengkap hanya tampil sekali saat dibuat atau dirotasi.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onCreate}>
          + Buat key
        </button>
      </div>
      {keys === null ? (
        <div className="api-skeleton api-skeleton-table" />
      ) : visible.length === 0 ? (
        <div className="api-empty">
          <p>Belum ada API key.</p>
          <p className="panel-sub">Buat publishable key untuk website klinik, atau secret key untuk sistem tim IT Anda.</p>
        </div>
      ) : (
        <div className="api-table-wrap">
          <table className="api-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Key</th>
                <th>Domain</th>
                <th>30 hari</th>
                <th>Terakhir dipakai</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {visible.map((k) => (
                <tr key={k.id} className={k.revokedAt ? 'revoked' : ''}>
                  <td>
                    <div className="api-key-name">{k.name}</div>
                    <span className={`api-badge ${k.revokedAt ? 'muted' : k.type === 'secret' ? 'warn' : 'info'}`}>
                      {k.revokedAt ? 'Dicabut' : k.type === 'secret' ? 'Secret' : 'Publishable'}
                    </span>
                  </td>
                  <td>
                    <code className="api-prefix">{k.keyPrefix}…</code>
                  </td>
                  <td className="api-origins">
                    {k.type === 'secret' ? <span className="muted">Server saja</span> : k.allowedOrigins.map((o) => <div key={o}>{o}</div>)}
                  </td>
                  <td>{fmt(counts.get(k.id) ?? 0)}</td>
                  <td className="muted">{formatDateTime(k.lastUsedAt)}</td>
                  <td>
                    {!k.revokedAt && (
                      <div className="api-row-actions">
                        <button type="button" className="btn-ghost" onClick={() => onEdit(k)}>
                          Ubah
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => onRotate(k)}>
                          Rotasi
                        </button>
                        <button type="button" className="btn-ghost danger" onClick={() => onRevoke(k)}>
                          Cabut
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {revokedCount > 0 && (
        <button type="button" className="api-link" onClick={() => setShowRevoked((v) => !v)}>
          {showRevoked ? 'Sembunyikan key yang dicabut' : `Tampilkan ${revokedCount} key yang dicabut`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- doctors

type DayState = { open: boolean; from: string; to: string };

function toDayState(schedule: Record<string, string> | null): Record<string, DayState> {
  return Object.fromEntries(
    DAYS.map(({ key }) => {
      const v = schedule?.[key];
      const m = v?.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
      return [key, m ? { open: true, from: m[1], to: m[2] } : { open: !v, from: '08:00', to: '16:00' }];
    }),
  );
}

function ScheduleModal({
  doctor,
  onClose,
  onSave,
}: {
  doctor: ApiPractitioner;
  onClose: () => void;
  onSave: (schedule: Record<string, string> | null) => Promise<void>;
}) {
  const [followClinic, setFollowClinic] = useState(doctor.jadwalPraktik === null);
  const [days, setDays] = useState(() => toDayState(doctor.jadwalPraktik));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key: string, patch: Partial<DayState>) => setDays((d) => ({ ...d, [key]: { ...d[key], ...patch } }));

  const save = async () => {
    let schedule: Record<string, string> | null = null;
    if (!followClinic) {
      schedule = {};
      for (const { key, label } of DAYS) {
        const d = days[key];
        if (d.open && d.from >= d.to) return setError(`Jam selesai hari ${label} harus setelah jam mulai.`);
        schedule[key] = d.open ? `${d.from}-${d.to}` : 'Tutup';
      }
    }
    setSaving(true);
    setError('');
    try {
      await onSave(schedule);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="api-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="api-schedule-title">
      <div className="api-modal">
        <h2 id="api-schedule-title">Jadwal praktik — {doctor.name}</h2>
        <label className="api-toggle">
          <input type="checkbox" checked={followClinic} onChange={(e) => setFollowClinic(e.target.checked)} />
          <span>Ikuti jam operasional klinik</span>
        </label>
        {!followClinic && (
          <div className="api-schedule-grid">
            {DAYS.map(({ key, label }) => (
              <div key={key} className={`api-schedule-row${days[key].open ? '' : ' closed'}`}>
                <label className="api-toggle">
                  <input type="checkbox" checked={days[key].open} onChange={(e) => update(key, { open: e.target.checked })} />
                  <span>{label}</span>
                </label>
                {days[key].open ? (
                  <div className="api-time-range">
                    <input
                      type="time"
                      value={days[key].from}
                      onChange={(e) => update(key, { from: e.target.value })}
                      aria-label={`${label} mulai`}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={days[key].to}
                      onChange={(e) => update(key, { to: e.target.value })}
                      aria-label={`${label} selesai`}
                    />
                  </div>
                ) : (
                  <span className="muted">Tidak praktik</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="api-note">Slot reservasi lewat API mengikuti jadwal ini.</p>
        {error && <p className="api-form-error">{error}</p>}
        <div className="api-modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan jadwal'}
          </button>
        </div>
      </div>
    </div>
  );
}

function scheduleSummary(schedule: Record<string, string> | null) {
  if (!schedule) return 'Mengikuti jam klinik';
  const open = DAYS.filter(({ key }) => schedule[key] && !/^tutup$/i.test(schedule[key]));
  if (open.length === 0) return 'Tidak ada hari praktik';
  return open.map(({ key, label }) => `${label.slice(0, 3)} ${schedule[key]}`).join(' · ');
}

function DoctorsPanel({
  doctors,
  onEditSchedule,
  onUploadPhoto,
}: {
  doctors: ApiPractitioner[] | null;
  onEditSchedule: (d: ApiPractitioner) => void;
  onUploadPhoto: (d: ApiPractitioner, file: File) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ApiPractitioner | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const pick = (d: ApiPractitioner) => {
    setTarget(d);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !target) return;
    setUploadingId(target.id);
    try {
      await onUploadPhoto(target, file);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Data Publik Dokter</h2>
          <p className="panel-sub">
            Foto dan jadwal praktik yang dikirim lewat endpoint <code>/v1/practitioners</code>. Nama &amp; spesialisasi diambil dari data
            dokter.
          </p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
      {doctors === null ? (
        <div className="api-skeleton api-skeleton-table" />
      ) : doctors.length === 0 ? (
        <div className="api-empty">
          <p>Belum ada dokter di klinik ini.</p>
        </div>
      ) : (
        <div className="api-doctor-list">
          {doctors.map((d) => {
            const photo = resolveFileUrl(d.photoUrl);
            return (
              <div key={d.id} className={`api-doctor${d.isActive ? '' : ' inactive'}`}>
                <div className="api-doctor-photo">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={`Foto ${d.name}`} />
                  ) : (
                    <span>
                      {d.name
                        .replace(/^(drg?\.?\s*)/i, '')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="api-doctor-info">
                  <div className="api-doctor-name">
                    {d.name}
                    {!d.isActive && <span className="api-badge muted">Nonaktif — tidak tampil di API</span>}
                  </div>
                  <div className="api-doctor-spec">{d.specialization || 'Spesialisasi belum diisi'}</div>
                  <div className="api-doctor-schedule">{scheduleSummary(d.jadwalPraktik)}</div>
                </div>
                <div className="api-row-actions">
                  <button type="button" className="btn-ghost" onClick={() => pick(d)} disabled={uploadingId === d.id}>
                    {uploadingId === d.id ? 'Mengunggah…' : photo ? 'Ganti foto' : 'Unggah foto'}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => onEditSchedule(d)}>
                    Atur jadwal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page

function ApiKlinikInner() {
  const { user } = useAuth();
  const toast = useToast();
  const isSuperAdmin = user?.role === 'super_admin';
  const [clinics, setClinics] = useState<ClinicResponse[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<number | undefined>(undefined);
  const clinicId = isSuperAdmin ? selectedClinic : undefined;
  const ready = !isSuperAdmin || !!selectedClinic;

  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [doctors, setDoctors] = useState<ApiPractitioner[] | null>(null);

  const [formFor, setFormFor] = useState<ApiKeyRow | 'new' | null>(null);
  const [revealed, setRevealed] = useState<ApiKeyWithSecret | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'revoke' | 'rotate'; key: ApiKeyRow } | null>(null);
  const [scheduleFor, setScheduleFor] = useState<ApiPractitioner | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    clinicApi
      .listAll()
      .then(setClinics)
      .catch(() => {});
  }, [isSuperAdmin]);

  const load = useCallback(() => {
    if (!ready) return;
    apiKeysApi
      .list(clinicId)
      .then(setKeys)
      .catch((err) => toast.error(errorMessage(err)));
    apiKeysApi
      .usage(clinicId)
      .then(setUsage)
      .catch(() => {});
    apiKeysApi
      .practitioners(clinicId)
      .then(setDoctors)
      .catch(() => {});
  }, [ready, clinicId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const submitKey = async (values: { name: string; type: ApiKeyType; allowedOrigins: string[] }) => {
    if (formFor && formFor !== 'new') {
      await apiKeysApi.update(
        formFor.id,
        { name: values.name, ...(formFor.type === 'publishable' ? { allowedOrigins: values.allowedOrigins } : {}) },
        clinicId,
      );
      toast.success('API key diperbarui');
    } else {
      const created = await apiKeysApi.create(
        { name: values.name, type: values.type, ...(values.type === 'publishable' ? { allowedOrigins: values.allowedOrigins } : {}) },
        clinicId,
      );
      setRevealed(created);
    }
    setFormFor(null);
    load();
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, key } = confirm;
    setConfirm(null);
    try {
      if (kind === 'revoke') {
        await apiKeysApi.revoke(key.id, clinicId);
        toast.success(`Key "${key.name}" dicabut`);
      } else {
        setRevealed(await apiKeysApi.rotate(key.id, clinicId));
      }
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const saveSchedule = async (schedule: Record<string, string> | null) => {
    if (!scheduleFor) return;
    await apiKeysApi.setSchedule(scheduleFor.id, schedule, clinicId);
    toast.success('Jadwal praktik disimpan');
    setScheduleFor(null);
    load();
  };

  const uploadPhoto = async (doctor: ApiPractitioner, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5 MB');
      return;
    }
    try {
      await apiKeysApi.uploadPhoto(doctor.id, file, clinicId);
      toast.success(`Foto ${doctor.name} diperbarui`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <main className="content api-klinik-page">
        <SettingsTabs />
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>API</h1>
            </div>
            <p className="page-subtitle">
              Hubungkan website klinik atau sistem tim IT Anda ke data jadwal, dokter, layanan, dan reservasi.
            </p>
          </div>
          {isSuperAdmin && (
            <div className="api-clinic-picker">
              <CustomSelect
                value={selectedClinic ? String(selectedClinic) : ''}
                onChange={(v) => {
                  setKeys(null);
                  setUsage(null);
                  setDoctors(null);
                  setSelectedClinic(v ? Number(v) : undefined);
                }}
                options={clinics.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="Pilih klinik…"
              />
            </div>
          )}
        </div>

        {!ready ? (
          <div className="panel api-empty">
            <p>Pilih klinik untuk mengelola API-nya.</p>
          </div>
        ) : (
          <>
            <UsagePanel usage={usage} />
            <KeysPanel
              keys={keys}
              usage={usage}
              onCreate={() => setFormFor('new')}
              onEdit={(k) => setFormFor(k)}
              onRotate={(k) => setConfirm({ kind: 'rotate', key: k })}
              onRevoke={(k) => setConfirm({ kind: 'revoke', key: k })}
            />
            <DoctorsPanel doctors={doctors} onEditSchedule={setScheduleFor} onUploadPhoto={uploadPhoto} />
            <ApiDocs baseUrl={PUBLIC_API_BASE} limitPerDay={usage?.limitPerDay} limitPerMinute={usage?.limitPerMinute} plan={usage?.plan} />
          </>
        )}

        {formFor && <KeyFormModal editing={formFor === 'new' ? null : formFor} onClose={() => setFormFor(null)} onSubmit={submitKey} />}
        {revealed && <KeyRevealModal apiKey={revealed} onClose={() => setRevealed(null)} />}
        {scheduleFor && <ScheduleModal doctor={scheduleFor} onClose={() => setScheduleFor(null)} onSave={saveSchedule} />}
      </main>
      {/* Outside the page scope so the page's button styles don't leak into it. */}
      <ConfirmationModal
        isOpen={!!confirm}
        title={confirm?.kind === 'revoke' ? 'Cabut API key?' : 'Rotasi API key?'}
        message={
          confirm?.kind === 'revoke'
            ? `Key "${confirm?.key.name}" langsung berhenti bekerja. Website atau sistem yang memakainya akan gagal memanggil API.`
            : `Key baru akan dibuat dan key lama "${confirm?.key.name}" langsung dicabut. Ganti key di website/sistem Anda segera setelah ini.`
        }
        confirmLabel={confirm?.kind === 'revoke' ? 'Ya, Cabut' : 'Ya, Rotasi'}
        isDangerous
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

export default function ApiKlinikPage() {
  return (
    <DashboardLayout>
      <FeatureGuard feature="api">
        <ApiKlinikInner />
      </FeatureGuard>
    </DashboardLayout>
  );
}
