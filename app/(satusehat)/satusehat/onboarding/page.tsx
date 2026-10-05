'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { AddressFields, cleanAddress, missingAddress } from '@/components/satusehat/AddressFields';
import {
  CONTACT_PURPOSE_LABELS,
  DAY_LABELS,
  FACILITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  PHYSICAL_TYPE_LABELS,
  onboardingApi,
  type FacilityProfile,
  type FacilityType,
  type LocationPayload,
  type OnboardingBatchResult,
  type OnboardingItem,
  type OnboardingLocation,
  type OnboardingStatus,
  type OrganizationPayload,
  type SatusehatAddress,
  type SatusehatOrganization,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

const DOC = 'https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue';
const errText = (err: unknown) => (err instanceof Error ? err.message : 'Gagal');
const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
const toNumber = (v: string) => (v.trim() === '' ? null : Number(v));

function Step({
  no,
  title,
  done,
  doc,
  children,
}: {
  no: number;
  title: string;
  done: boolean;
  doc?: string;
  children: ReactNode;
}) {
  return (
    <section className="ss-card ss-step">
      <div className="ss-step-head">
        <span className={`ss-step-no ${done ? 'done' : ''}`}>{done ? '✓' : no}</span>
        <h3>{title}</h3>
        {doc && (
          <a className="ss-step-doc" href={doc} target="_blank" rel="noopener noreferrer">
            Dokumentasi
          </a>
        )}
      </div>
      <div className="ss-step-body">{children}</div>
    </section>
  );
}

function SyncState({ id, error }: { id: string | null; error?: string | null }) {
  if (id) return <span className="ss-badge synced">Terdaftar</span>;
  if (error)
    return (
      <span className="ss-badge failed" title={error}>
        Gagal
      </span>
    );
  return <span className="ss-badge pending">Draf</span>;
}

function ItemTable({ items, empty }: { items: OnboardingItem[]; empty: string }) {
  if (!items.length) return <p className="ss-muted">{empty}</p>;
  return (
    <div className="ss-table-wrap">
      <table className="ss-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>ID SATUSEHAT</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td className="ss-mono">{i.satusehatId ?? '—'}</td>
              <td>
                <span className={`ss-badge ${i.satusehatId ? 'synced' : 'pending'}`}>
                  {i.satusehatId ? 'Terdaftar' : (i.note ?? 'Belum')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchResult({ result }: { result: OnboardingBatchResult | undefined }) {
  if (!result) return null;
  const failed = result.results.filter((r) => r.error);
  return (
    <div className={`ss-notice ${failed.length ? 'warn' : ''}`}>
      {result.succeeded} dari {result.processed} berhasil
      {result.skippedWithoutNik ? `, ${result.skippedWithoutNik} pasien tanpa NIK dilewati` : ''}.
      {failed.length > 0 && (
        <ul className="ss-step-errors">
          {failed.slice(0, 10).map((f) => (
            <li key={f.id}>
              <strong>{f.name}</strong>: {f.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Profil fasyankes ─────────────────────────────────────────────────────

function ProfileForm({
  initial,
  onSaved,
}: {
  initial: FacilityProfile;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<FacilityProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FacilityProfile>(k: K, v: FacilityProfile[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onboardingApi.saveProfile({
        ...(cleanAddress(form) ?? {}),
        facilityType: form.facilityType,
        phone: blank(form.phone),
        email: blank(form.email),
        website: blank(form.website),
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
      });
      showToast('Profil fasyankes disimpan', 'success');
      await onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setSaving(false);
    }
  }

  const missing = missingAddress(form);

  return (
    <form className="ss-form ss-form-wide" onSubmit={submit}>
      <label className="ss-span-2">
        Jenis fasyankes
        <select
          className="ss-input"
          aria-label="Jenis fasyankes"
          required
          value={form.facilityType ?? ''}
          onChange={(e) => set('facilityType', (e.target.value || null) as FacilityType | null)}
        >
          <option value="">Pilih jenis fasyankes</option>
          {Object.entries(FACILITY_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <small>Klinik didaftarkan lewat DFO, TPMD/TPMDG lewat REGFASYANKES — lalu ambil Kode Akses API di SATUSEHAT Platform.</small>
      </label>
      <AddressFields value={form} onChange={(a) => setForm((f) => ({ ...f, ...a }))} />
      <label>
        Telepon
        <input className="ss-input" value={form.phone ?? ''} maxLength={30} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label>
        Email
        <input
          className="ss-input"
          type="email"
          value={form.email ?? ''}
          onChange={(e) => set('email', e.target.value)}
        />
      </label>
      <label>
        Website
        <input
          className="ss-input"
          value={form.website ?? ''}
          maxLength={150}
          onChange={(e) => set('website', e.target.value)}
          placeholder="opsional"
        />
      </label>
      <span />
      <label>
        Latitude
        <input
          className="ss-input"
          type="number"
          step="any"
          min={-90}
          max={90}
          value={form.latitude ?? ''}
          onChange={(e) => set('latitude', toNumber(e.target.value))}
          placeholder="mis. -6.2088"
        />
      </label>
      <label>
        Longitude
        <input
          className="ss-input"
          type="number"
          step="any"
          min={-180}
          max={180}
          value={form.longitude ?? ''}
          onChange={(e) => set('longitude', toNumber(e.target.value))}
          placeholder="mis. 106.8456"
        />
      </label>
      {missing.length > 0 && (
        <div className="ss-muted ss-span-2">Wajib untuk Organization & Location: {missing.join(', ')}.</div>
      )}
      {error && <div className="ss-notice warn ss-span-2">{error}</div>}
      <div className="ss-actions ss-span-2">
        <button type="submit" className="ss-btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan profil'}
        </button>
      </div>
    </form>
  );
}

// ── Organization ─────────────────────────────────────────────────────────

const emptyOrg = (profile: FacilityProfile): OrganizationPayload => ({
  parentId: null,
  code: '',
  name: '',
  type: 'dept',
  active: true,
  phone: profile.phone ?? null,
  email: profile.email ?? null,
  website: profile.website ?? null,
  address: cleanAddress(profile),
  contactName: null,
  contactPhone: null,
  contactPurpose: null,
});

function OrganizationForm({
  editing,
  organizations,
  profile,
  onCancel,
  onSaved,
}: {
  editing: SatusehatOrganization | null;
  organizations: SatusehatOrganization[];
  profile: FacilityProfile;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<OrganizationPayload>(() => (editing ? { ...editing } : emptyOrg(profile)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof OrganizationPayload>(k: K, v: OrganizationPayload[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onboardingApi.saveOrganization(editing?.id ?? null, {
        parentId: form.parentId,
        type: form.type,
        active: form.active,
        code: form.code.trim(),
        name: form.name.trim(),
        phone: blank(form.phone),
        email: blank(form.email),
        website: blank(form.website),
        address: cleanAddress(form.address),
        contactName: blank(form.contactName),
        contactPhone: blank(form.contactPhone),
        contactPurpose: form.contactPurpose || null,
      });
      showToast('Organisasi disimpan', 'success');
      await onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setSaving(false);
    }
  }

  const parents = organizations.filter((o) => o.id !== editing?.id);

  return (
    <form className="ss-card ss-subform ss-form ss-form-wide" onSubmit={submit}>
      <h4 className="ss-span-2">{editing ? `Ubah ${editing.name}` : 'Tambah organisasi'}</h4>
      <label>
        Kode / nomor internal
        <input
          className="ss-input"
          required
          maxLength={50}
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          placeholder="mis. POLI-GIGI"
        />
        <small>Dikirim sebagai identifier Organization.</small>
      </label>
      <label>
        Nama organisasi
        <input
          className="ss-input"
          required
          maxLength={255}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="mis. Poli Gigi"
        />
      </label>
      <label>
        Tipe
        <select className="ss-input" aria-label="Tipe" value={form.type} onChange={(e) => set('type', e.target.value)}>
          {Object.entries(ORGANIZATION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bagian dari (partOf)
        <select
          className="ss-input"
          aria-label="Bagian dari (partOf)"
          value={form.parentId ?? ''}
          onChange={(e) => set('parentId', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Organisasi induk fasyankes</option>
          {parents.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.code})
            </option>
          ))}
        </select>
      </label>
      <label>
        Telepon
        <input className="ss-input" maxLength={30} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label>
        Email
        <input className="ss-input" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
      </label>
      <label>
        Website
        <input
          className="ss-input"
          maxLength={150}
          value={form.website ?? ''}
          onChange={(e) => set('website', e.target.value)}
        />
      </label>
      <label className="ss-check">
        <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
        Aktif
      </label>

      <div className="ss-span-2 ss-subhead">
        Alamat
        <button type="button" className="ss-btn sm" onClick={() => set('address', cleanAddress(profile))}>
          Salin dari profil fasyankes
        </button>
      </div>
      <AddressFields value={form.address ?? {}} onChange={(a: SatusehatAddress) => set('address', a)} />

      <div className="ss-span-2 ss-subhead">Narahubung (contact)</div>
      <label>
        Nama
        <input
          className="ss-input"
          maxLength={150}
          value={form.contactName ?? ''}
          onChange={(e) => set('contactName', e.target.value)}
        />
      </label>
      <label>
        Telepon
        <input
          className="ss-input"
          maxLength={30}
          value={form.contactPhone ?? ''}
          onChange={(e) => set('contactPhone', e.target.value)}
        />
      </label>
      <label>
        Tujuan kontak
        <select
          className="ss-input"
          aria-label="Tujuan kontak"
          value={form.contactPurpose ?? ''}
          onChange={(e) => set('contactPurpose', e.target.value || null)}
        >
          <option value="">—</option>
          {Object.entries(CONTACT_PURPOSE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v} ({k})
            </option>
          ))}
        </select>
      </label>

      {error && <div className="ss-notice warn ss-span-2">{error}</div>}
      <div className="ss-actions ss-span-2">
        <button type="submit" className="ss-btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button type="button" className="ss-btn" onClick={onCancel} disabled={saving}>
          Batal
        </button>
      </div>
    </form>
  );
}

// ── Location ─────────────────────────────────────────────────────────────

const emptyLocation = (): LocationPayload => ({
  name: '',
  active: true,
  code: null,
  description: null,
  physicalType: 'ro',
  parentLocationId: null,
  organizationId: null,
  phone: null,
  address: null,
  latitude: null,
  longitude: null,
  hours: null,
});

function LocationForm({
  editing,
  locations,
  organizations,
  profile,
  onCancel,
  onSaved,
}: {
  editing: OnboardingLocation | null;
  locations: OnboardingLocation[];
  organizations: SatusehatOrganization[];
  profile: FacilityProfile;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<LocationPayload>(() => (editing ? { ...editing } : emptyLocation()));
  const [ownAddress, setOwnAddress] = useState(!!editing?.address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof LocationPayload>(k: K, v: LocationPayload[K]) => setForm((f) => ({ ...f, [k]: v }));
  const hours = form.hours ?? { days: [], allDay: false, opening: null, closing: null };
  const setHours = (patch: Partial<typeof hours>) => set('hours', { ...hours, ...patch });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onboardingApi.saveLocation(editing?.id ?? null, {
        active: form.active,
        physicalType: form.physicalType,
        parentLocationId: form.parentLocationId,
        organizationId: form.organizationId,
        latitude: form.latitude,
        longitude: form.longitude,
        name: form.name.trim(),
        code: blank(form.code),
        description: blank(form.description),
        phone: blank(form.phone),
        address: ownAddress ? cleanAddress(form.address) : null,
        hours: hours.days.length
          ? {
              days: hours.days,
              allDay: !!hours.allDay,
              opening: hours.allDay ? null : hours.opening?.slice(0, 5) || null,
              closing: hours.allDay ? null : hours.closing?.slice(0, 5) || null,
            }
          : null,
      });
      showToast('Lokasi disimpan', 'success');
      await onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ss-card ss-subform ss-form ss-form-wide" onSubmit={submit}>
      <h4 className="ss-span-2">{editing ? `Ubah ${editing.name}` : 'Tambah lokasi'}</h4>
      <label>
        Nama lokasi
        <input
          className="ss-input"
          required
          maxLength={100}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="mis. Ruang Poli Gigi 1"
        />
      </label>
      <label>
        Kode / nomor internal
        <input
          className="ss-input"
          maxLength={50}
          value={form.code ?? ''}
          onChange={(e) => set('code', e.target.value)}
          placeholder="mis. R-GIGI-1"
        />
      </label>
      <label className="ss-span-2">
        Deskripsi
        <input
          className="ss-input"
          maxLength={255}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="mis. Ruang Poli Gigi lantai 1, Gedung Utama"
        />
      </label>
      <label>
        Tipe fisik
        <select className="ss-input" aria-label="Tipe fisik" value={form.physicalType} onChange={(e) => set('physicalType', e.target.value)}>
          {Object.entries(PHYSICAL_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bagian dari lokasi (partOf)
        <select
          className="ss-input"
          aria-label="Bagian dari lokasi (partOf)"
          value={form.parentLocationId ?? ''}
          onChange={(e) => set('parentLocationId', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">—</option>
          {locations
            .filter((l) => l.id !== editing?.id)
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Organisasi pengelola
        <select
          className="ss-input"
          aria-label="Organisasi pengelola"
          value={form.organizationId ?? ''}
          onChange={(e) => set('organizationId', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Organisasi induk fasyankes</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.satusehatId ? '' : ' (belum terkirim)'}
            </option>
          ))}
        </select>
        <small>Kirim organisasinya terlebih dahulu.</small>
      </label>
      <label>
        Telepon
        <input className="ss-input" maxLength={30} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label>
        Latitude
        <input
          className="ss-input"
          type="number"
          step="any"
          min={-90}
          max={90}
          value={form.latitude ?? ''}
          onChange={(e) => set('latitude', toNumber(e.target.value))}
          placeholder={profile.latitude != null ? `profil: ${profile.latitude}` : ''}
        />
      </label>
      <label>
        Longitude
        <input
          className="ss-input"
          type="number"
          step="any"
          min={-180}
          max={180}
          value={form.longitude ?? ''}
          onChange={(e) => set('longitude', toNumber(e.target.value))}
          placeholder={profile.longitude != null ? `profil: ${profile.longitude}` : ''}
        />
      </label>
      <label className="ss-check">
        <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
        Aktif
      </label>

      <div className="ss-span-2 ss-subhead">Alamat</div>
      <label className="ss-check ss-span-2">
        <input type="checkbox" checked={!ownAddress} onChange={(e) => setOwnAddress(!e.target.checked)} />
        Sama dengan alamat profil fasyankes
      </label>
      {ownAddress && <AddressFields value={form.address ?? {}} onChange={(a) => set('address', a)} />}

      <div className="ss-span-2 ss-subhead">Jam operasional</div>
      <div className="ss-days ss-span-2">
        {Object.entries(DAY_LABELS).map(([k, v]) => (
          <label key={k} className="ss-check">
            <input
              type="checkbox"
              checked={hours.days.includes(k)}
              onChange={(e) =>
                setHours({
                  days: e.target.checked
                    ? Object.keys(DAY_LABELS).filter((d) => d === k || hours.days.includes(d))
                    : hours.days.filter((d) => d !== k),
                })
              }
            />
            {v}
          </label>
        ))}
        <label className="ss-check">
          <input type="checkbox" checked={!!hours.allDay} onChange={(e) => setHours({ allDay: e.target.checked })} />
          24 jam
        </label>
      </div>
      {!hours.allDay && hours.days.length > 0 && (
        <>
          <label>
            Buka
            <input
              className="ss-input"
              type="time"
              value={hours.opening?.slice(0, 5) ?? ''}
              onChange={(e) => setHours({ opening: e.target.value })}
            />
          </label>
          <label>
            Tutup
            <input
              className="ss-input"
              type="time"
              value={hours.closing?.slice(0, 5) ?? ''}
              onChange={(e) => setHours({ closing: e.target.value })}
            />
          </label>
        </>
      )}

      {error && <div className="ss-notice warn ss-span-2">{error}</div>}
      <div className="ss-actions ss-span-2">
        <button type="submit" className="ss-btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button type="button" className="ss-btn" onClick={onCancel} disabled={saving}>
          Batal
        </button>
      </div>
    </form>
  );
}

// ── Halaman ──────────────────────────────────────────────────────────────

type BatchKey = 'practitioners' | 'patients';

/**
 * Onboarding SATUSEHAT untuk klinik pratama/utama, TPMD, dan TPMDG, sesuai
 * urutan katalog API: Autentikasi → Prerequisites (Organization, Location,
 * Practitioner, Patient). Organization & Location mengikuti Template
 * Registrasi Organization & Location.
 */
export default function SatusehatOnboardingPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [batch, setBatch] = useState<Partial<Record<BatchKey, OnboardingBatchResult>>>({});
  const [orgForm, setOrgForm] = useState<SatusehatOrganization | 'new' | null>(null);
  const [locForm, setLocForm] = useState<OnboardingLocation | 'new' | null>(null);

  const reload = useCallback(async () => {
    try {
      setStatus(await onboardingApi.status());
    } catch (err) {
      showToast(errText(err), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    onboardingApi
      .status()
      .then(setStatus)
      .catch((err) => showToast(errText(err), 'error'));
  }, [showToast]);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setErrors((e) => ({ ...e, [key]: undefined }));
    try {
      const res = await fn();
      if (key === 'practitioners' || key === 'patients') {
        setBatch((b) => ({ ...b, [key]: res as OnboardingBatchResult }));
      }
      showToast(ok, 'success');
      await reload();
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: errText(err) }));
    } finally {
      setBusy(null);
    }
  }

  async function removeOrganization(org: SatusehatOrganization) {
    if (!window.confirm(`Hapus draf ${org.name}?`)) return;
    await run(`org-del-${org.id}`, () => onboardingApi.deleteOrganization(org.id), 'Organisasi dihapus');
  }

  const s = status;
  if (!s) {
    return (
      <SatusehatShell title="Onboarding SATUSEHAT" requireWrite>
        <div className="ss-card ss-empty">Memuat...</div>
      </SatusehatShell>
    );
  }

  const configured = !!s.auth.source;
  const profile = s.profile;
  const profileDone = !!profile.facilityType && missingAddress(profile).length === 0;
  const orgDone = s.organizations.length > 0 && s.organizations.every((o) => o.satusehatId || !o.active);
  const locDone = s.locations.length > 0 && s.locations.every((l) => l.satusehatId || !l.active);
  const pracDone = s.practitioners.length > 0 && s.practitioners.every((p) => p.satusehatId);
  const patientDone = s.patients.total > 0 && s.patients.linked === s.patients.total;
  const orgName = (id: number | null) => (id ? (s.organizations.find((o) => o.id === id)?.name ?? '—') : 'Induk');
  const errorOf = (k: string) => errors[k] && <div className="ss-notice warn">{errors[k]}</div>;
  const afterSave = (close: () => void) => async () => {
    close();
    await reload();
  };

  return (
    <SatusehatShell
      title="Onboarding SATUSEHAT"
      subtitle="Pendaftaran fasyankes (klinik pratama/utama, TPMD, TPMDG) ke SATUSEHAT: autentikasi, profil, Organization, Location, Practitioner, Patient"
      requireWrite
    >
      <div className="ss-steps">
        <Step no={1} title="Autentikasi" done={configured && !!s.auth.tokenValidUntil} doc={`${DOC}/authentication/apis/token/`}>
          {configured ? (
            <dl className="ss-dl">
              <dt>Sumber kredensial</dt>
              <dd>{s.auth.source === 'env' ? 'Env server (Kode Akses API)' : 'Konfigurasi klinik'}</dd>
              <dt>Environment</dt>
              <dd>{s.auth.environment === 'production' ? 'Production' : 'Sandbox'}</dd>
              <dt>Organization ID</dt>
              <dd className="ss-mono">{s.auth.organizationId}</dd>
              <dt>Token</dt>
              <dd>{s.auth.tokenValidUntil ? `aktif s/d ${formatDateTime(s.auth.tokenValidUntil)}` : 'belum diminta'}</dd>
            </dl>
          ) : (
            <div className="ss-notice warn">
              Kode Akses API belum diatur. Isi <span className="ss-mono">SATUSEHAT_ORGANIZATION_ID</span>,{' '}
              <span className="ss-mono">SATUSEHAT_CLIENT_ID</span>, <span className="ss-mono">SATUSEHAT_CLIENT_SECRET</span>{' '}
              (dan <span className="ss-mono">SATUSEHAT_ENVIRONMENT</span>) di env server, atau{' '}
              <Link href="/satusehat/konfigurasi">isi Konfigurasi klinik</Link>.
            </div>
          )}
          {errorOf('auth')}
          <button
            type="button"
            className="ss-btn primary"
            disabled={!configured || busy !== null}
            onClick={() => run('auth', onboardingApi.auth, 'Autentikasi berhasil')}
          >
            {busy === 'auth' ? 'Menguji...' : 'Uji autentikasi'}
          </button>
        </Step>

        <Step no={2} title="Profil fasyankes & organisasi induk" done={profileDone && !!profile.verifiedName} doc={`${DOC}/onboardings/apis/organization/`}>
          <dl className="ss-dl">
            <dt>Nama di aplikasi</dt>
            <dd>{profile.clinicName}</dd>
            <dt>Nama di SATUSEHAT</dt>
            <dd>{profile.verifiedName ?? '(belum diverifikasi)'}</dd>
          </dl>
          {errorOf('verify')}
          <button
            type="button"
            className="ss-btn"
            disabled={!configured || busy !== null}
            onClick={() => run('verify', onboardingApi.verifyOrganization, 'Organisasi induk terverifikasi')}
          >
            {busy === 'verify' ? 'Memeriksa...' : 'Verifikasi Organization ID induk'}
          </button>
          <ProfileForm key={JSON.stringify(profile)} initial={profile} onSaved={reload} />
        </Step>

        <Step no={3} title="Organization (sub-organisasi)" done={orgDone} doc={`${DOC}/onboardings/apis/organization/`}>
          <p className="ss-muted">
            Daftarkan unit di bawah organisasi induk (mis. Pelayanan Kesehatan → Poli Umum, Poli Gigi, Farmasi). Kirim
            induknya dulu, baru unit di bawahnya.
          </p>
          {s.organizations.length > 0 ? (
            <div className="ss-table-wrap">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama</th>
                    <th>Bagian dari</th>
                    <th>ID SATUSEHAT</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {s.organizations.map((o) => (
                    <tr key={o.id}>
                      <td className="ss-mono">{o.code}</td>
                      <td>
                        {o.name}
                        {!o.active && <span className="ss-muted"> (nonaktif)</span>}
                      </td>
                      <td>{orgName(o.parentId)}</td>
                      <td className="ss-mono">{o.satusehatId ?? '—'}</td>
                      <td>
                        <SyncState id={o.satusehatId} error={o.syncError} />
                      </td>
                      <td className="ss-row-actions">
                        <button type="button" className="ss-btn sm" onClick={() => setOrgForm(o)} disabled={busy !== null}>
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="ss-btn sm primary"
                          disabled={!configured || busy !== null}
                          onClick={() =>
                            run(`org-${o.id}`, () => onboardingApi.sendOrganization(o.id), `${o.name} terkirim`)
                          }
                        >
                          {busy === `org-${o.id}` ? 'Mengirim...' : o.satusehatId ? 'Kirim ulang' : 'Kirim'}
                        </button>
                        {!o.satusehatId && (
                          <button
                            type="button"
                            className="ss-btn sm"
                            disabled={busy !== null}
                            onClick={() => removeOrganization(o)}
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ss-muted">Belum ada sub-organisasi.</p>
          )}
          {s.organizations
            .filter((o) => errors[`org-${o.id}`])
            .map((o) => (
              <div key={o.id} className="ss-notice warn">
                {errors[`org-${o.id}`]}
              </div>
            ))}
          {errorOf('template')}
          {Object.keys(errors)
            .filter((k) => k.startsWith('org-del-') && errors[k])
            .map((k) => (
              <div key={k} className="ss-notice warn">
                {errors[k]}
              </div>
            ))}
          {orgForm ? (
            <OrganizationForm
              key={orgForm === 'new' ? 'new' : orgForm.id}
              editing={orgForm === 'new' ? null : orgForm}
              organizations={s.organizations}
              profile={profile}
              onCancel={() => setOrgForm(null)}
              onSaved={afterSave(() => setOrgForm(null))}
            />
          ) : (
            <div className="ss-actions">
              <button type="button" className="ss-btn primary" onClick={() => setOrgForm('new')} disabled={busy !== null}>
                Tambah organisasi
              </button>
              <button
                type="button"
                className="ss-btn"
                disabled={!profile.facilityType || busy !== null}
                title={profile.facilityType ? '' : 'Simpan jenis fasyankes di profil dulu'}
                onClick={() => run('template', onboardingApi.applyTemplate, 'Draf struktur organisasi dibuat')}
              >
                Gunakan struktur contoh ({profile.facilityType ? FACILITY_TYPE_LABELS[profile.facilityType] : 'pilih jenis fasyankes'})
              </button>
            </div>
          )}
        </Step>

        <Step no={4} title="Location (lokasi/ruangan)" done={locDone} doc={`${DOC}/onboardings/apis/location/`}>
          <p className="ss-muted">
            Ruangan pelayanan (mis. ruang poli) yang dipakai di kunjungan. Lokasi tanpa alamat sendiri memakai alamat profil
            fasyankes.
          </p>
          {s.locations.length > 0 ? (
            <div className="ss-table-wrap">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Tipe</th>
                    <th>Organisasi</th>
                    <th>ID SATUSEHAT</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {s.locations.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.name}
                        {l.code && <span className="ss-muted ss-mono"> {l.code}</span>}
                        {!l.active && <span className="ss-muted"> (nonaktif)</span>}
                      </td>
                      <td>{PHYSICAL_TYPE_LABELS[l.physicalType] ?? l.physicalType}</td>
                      <td>{orgName(l.organizationId)}</td>
                      <td className="ss-mono">{l.satusehatId ?? '—'}</td>
                      <td>
                        <SyncState id={l.satusehatId} error={l.syncError} />
                      </td>
                      <td className="ss-row-actions">
                        <button type="button" className="ss-btn sm" onClick={() => setLocForm(l)} disabled={busy !== null}>
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="ss-btn sm primary"
                          disabled={!configured || busy !== null}
                          onClick={() => run(`loc-${l.id}`, () => onboardingApi.sendLocation(l.id), `${l.name} terkirim`)}
                        >
                          {busy === `loc-${l.id}` ? 'Mengirim...' : l.satusehatId ? 'Kirim ulang' : 'Kirim'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ss-muted">Belum ada lokasi.</p>
          )}
          {s.locations
            .filter((l) => errors[`loc-${l.id}`])
            .map((l) => (
              <div key={l.id} className="ss-notice warn">
                {errors[`loc-${l.id}`]}
              </div>
            ))}
          {locForm ? (
            <LocationForm
              key={locForm === 'new' ? 'new' : locForm.id}
              editing={locForm === 'new' ? null : locForm}
              locations={s.locations}
              organizations={s.organizations}
              profile={profile}
              onCancel={() => setLocForm(null)}
              onSaved={afterSave(() => setLocForm(null))}
            />
          ) : (
            <button type="button" className="ss-btn primary" onClick={() => setLocForm('new')} disabled={busy !== null}>
              Tambah lokasi
            </button>
          )}
        </Step>

        <Step no={5} title="Practitioner (tenaga kesehatan)" done={pracDone} doc={`${DOC}/onboardings/apis/practitioner/`}>
          <ItemTable items={s.practitioners} empty="Belum ada data dokter/tenaga kesehatan." />
          <BatchResult result={batch.practitioners} />
          {errorOf('practitioners')}
          <button
            type="button"
            className="ss-btn primary"
            disabled={!configured || busy !== null}
            onClick={() => run('practitioners', onboardingApi.practitioners, 'Pencocokan tenaga kesehatan selesai')}
          >
            {busy === 'practitioners' ? 'Mencocokkan...' : 'Cocokkan NIK tenaga kesehatan'}
          </button>
        </Step>

        <Step no={6} title="Patient (pasien)" done={patientDone} doc={`${DOC}/onboardings/apis/patient/`}>
          <p>
            {s.patients.linked} dari {s.patients.total} pasien sudah memiliki ID SATUSEHAT. Pasien baru juga dicocokkan
            otomatis saat kunjungannya dikirim.
          </p>
          <BatchResult result={batch.patients} />
          {errorOf('patients')}
          <button
            type="button"
            className="ss-btn primary"
            disabled={!configured || busy !== null || patientDone}
            onClick={() => run('patients', onboardingApi.patients, 'Pencocokan pasien selesai')}
          >
            {busy === 'patients' ? 'Mencocokkan...' : 'Cocokkan 50 pasien berikutnya'}
          </button>
        </Step>

        <div className="ss-notice">
          Setelah onboarding selesai, data layanan dikirim otomatis saat status kunjungan berubah, atau manual dari{' '}
          <Link href="/satusehat/data">Data &amp; Status Sync</Link>.
        </div>
      </div>
    </SatusehatShell>
  );
}
