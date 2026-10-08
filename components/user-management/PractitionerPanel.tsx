'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiLink,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import {
  PROFESSIONS,
  practitionersApi,
  professionLabel,
  type Practitioner,
  type PractitionerInput,
  type PractitionerRevision,
  type SatusehatMatch,
  type SatusehatPractitioner,
} from '@/lib/practitioners';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';
import './PractitionerPanel.css';

const errText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Gagal');
const digits = (v: string, max = 16) => v.replace(/\D/g, '').slice(0, max);
const GENDER_LABEL: Record<string, string> = { male: 'Laki-laki', female: 'Perempuan' };
const EXPIRY_WARN_DAYS = 60;

type Filter = 'semua' | 'terhubung' | 'belum' | 'perhatian' | 'nonaktif';
type SearchMode = 'nik' | 'nama' | 'id';

type FormState = Required<Omit<PractitionerInput, 'isActive' | 'satusehatPractitionerId' | 'gender'>> & {
  gender: '' | 'male' | 'female';
  isActive: boolean;
  satusehatPractitionerId: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  nik: '',
  gender: '',
  profession: '',
  birthPlace: '',
  birthDate: '',
  address: '',
  phone: '',
  email: '',
  sipNumber: '',
  sipExpiredAt: '',
  strNumber: '',
  strExpiredAt: '',
  specialization: '',
  satusehatPractitionerId: '',
  isActive: true,
  reason: '',
};

function toForm(p: Practitioner): FormState {
  return {
    ...EMPTY_FORM,
    name: p.name ?? '',
    gender: p.gender ?? '',
    profession: p.profession ?? '',
    birthPlace: p.birthPlace ?? '',
    birthDate: p.birthDate ?? '',
    address: p.address ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    sipNumber: p.sipNumber ?? '',
    sipExpiredAt: p.sipExpiredAt ?? '',
    strNumber: p.strNumber ?? '',
    strExpiredAt: p.strExpiredAt ?? '',
    specialization: p.specialization ?? '',
    satusehatPractitionerId: p.satusehatPractitionerId ?? '',
    isActive: p.isActive !== false,
  };
}

/** Sisa hari sampai tanggal; null bila kosong. */
function daysLeft(date?: string | null) {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`).getTime();
  return Math.floor((end - Date.now()) / 86_400_000);
}

function expiryNote(label: string, date?: string | null) {
  const d = daysLeft(date);
  if (d === null || d > EXPIRY_WARN_DAYS) return null;
  return d < 0 ? `${label} kedaluwarsa` : `${label} habis ${d} hari lagi`;
}

/** Peringatan kelengkapan data per nakes. */
function issuesOf(p: Practitioner) {
  const out: string[] = [];
  if (!p.hasNik) out.push('NIK belum diisi');
  else if (!p.satusehatPractitionerId) out.push('Belum terhubung SATUSEHAT');
  if (!p.profession) out.push('Profesi belum diisi');
  if (!p.sipNumber && /dokter|bidan|perawat|apoteker/.test(p.profession ?? 'dokter')) out.push('No. SIP kosong');
  const sip = expiryNote('SIP', p.sipExpiredAt);
  const str = expiryNote('STR', p.strExpiredAt);
  if (sip) out.push(sip);
  if (str) out.push(str);
  return out;
}

const initials = (name: string) =>
  name
    .replace(/^(drg?|dr)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** Profesi perawat/bidan → peran akun perawat; lainnya dokter. */
const roleForProfession = (p?: string | null): 'dokter' | 'perawat' =>
  p === 'perawat' || p === 'perawat_gigi' || p === 'bidan' ? 'perawat' : 'dokter';

const PASSWORD_OK = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Password acak 10 karakter (huruf + angka, tanpa karakter mirip). */
function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digitsSet = '23456789';
  const all = letters + digitsSet;
  const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  const chars = [letters[rnd(letters.length)], digitsSet[rnd(digitsSet.length)]];
  while (chars.length < 10) chars.push(all[rnd(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const EMPTY_ACCOUNT = { enabled: true, email: '', password: '', role: '' as '' | 'dokter' | 'perawat', isActive: true };

const formatDateTime = (v: string) =>
  new Date(v).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PractitionerPanel() {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<Practitioner[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('semua');

  // Pencarian SATUSEHAT
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>('nik');
  const [sq, setSq] = useState({ nik: '', ihsId: '', name: '', gender: '', birthDate: '' });
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SatusehatPractitioner[] | null>(null);

  // Form tambah / revisi
  const [editing, setEditing] = useState<Practitioner | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [revisions, setRevisions] = useState<PractitionerRevision[] | null>(null);
  const [match, setMatch] = useState<SatusehatMatch | null>(null);
  const [matching, setMatching] = useState(false);
  const [acct, setAcct] = useState(EMPTY_ACCOUNT);
  const [acctSaving, setAcctSaving] = useState(false);

  useEscapeKey(() => setFormOpen(false), formOpen);

  const load = useCallback(async () => {
    try {
      setList(await practitionersApi.list());
    } catch (err) {
      showError(errText(err));
      setList([]);
    }
  }, [showError]);

  useEffect(() => {
    practitionersApi
      .list()
      .then(setList)
      .catch((err) => {
        showError(errText(err));
        setList([]);
      });
  }, [showError]);

  const stats = useMemo(() => {
    const all = list ?? [];
    return {
      total: all.length,
      linked: all.filter((p) => p.satusehatPractitionerId).length,
      attention: all.filter((p) => p.isActive !== false && issuesOf(p).length > 0).length,
    };
  }, [list]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list ?? []).filter((p) => {
      const active = p.isActive !== false;
      if (filter === 'terhubung' && !p.satusehatPractitionerId) return false;
      if (filter === 'belum' && (p.satusehatPractitionerId || !active)) return false;
      if (filter === 'perhatian' && (!active || issuesOf(p).length === 0)) return false;
      if (filter === 'nonaktif' && active) return false;
      if (!q) return true;
      return [p.name, p.specialization, p.sipNumber, p.strNumber, p.satusehatPractitionerId, p.nikMasked, p.phone, p.email, professionLabel(p.profession)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list, query, filter]);

  function openCreate(prefill?: Partial<FormState>) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setAcct(EMPTY_ACCOUNT);
    setRevisions(null);
    setMatch(null);
    setFormOpen(true);
  }

  async function openEdit(p: Practitioner) {
    setEditing(p);
    setForm(toForm(p));
    setAcct({
      enabled: !p.account,
      email: p.account?.email ?? p.email ?? '',
      password: '',
      role: '',
      isActive: p.account?.isActive ?? true,
    });
    setMatch(null);
    setRevisions(null);
    setFormOpen(true);
    try {
      setRevisions(await practitionersApi.revisions(p.id));
    } catch {
      setRevisions([]);
    }
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return showError('Nama wajib diisi');
    if (!editing && form.nik.length !== 16) return showError('NIK wajib 16 digit');
    if (form.nik && form.nik.length !== 16) return showError('NIK harus 16 digit');
    if (!form.gender) return showError('Jenis kelamin wajib dipilih');
    const wantAccount = !editing && acct.enabled;
    const accountEmail = (acct.email || form.email).trim();
    if (wantAccount && !EMAIL_OK.test(accountEmail)) return showError('Isi email login yang valid');
    if (wantAccount && !PASSWORD_OK.test(acct.password)) return showError('Password minimal 8 karakter, berisi huruf dan angka');
    setSaving(true);
    try {
      const { nik, reason, gender, satusehatPractitionerId, ...rest } = form;
      const body: PractitionerInput = { ...rest, gender: gender || undefined };
      if (nik) body.nik = nik;
      if (!editing) {
        if (satusehatPractitionerId) body.satusehatPractitionerId = satusehatPractitionerId;
        delete body.isActive;
        // Field kosong tidak perlu dikirim saat tambah
        for (const k of Object.keys(body) as (keyof PractitionerInput)[]) if (body[k] === '') delete body[k];
        const created = await practitionersApi.create(body);
        if (wantAccount) {
          try {
            await practitionersApi.createAccount(created.id, {
              email: accountEmail,
              password: acct.password,
              role: acct.role || roleForProfession(form.profession),
            });
            success(`Nakes & akun login dibuat — login: ${accountEmail}`);
          } catch (err) {
            // Data nakes sudah tersimpan; buka mode revisi agar akun bisa dibuat ulang
            showError(`Data nakes tersimpan, tetapi akun gagal dibuat: ${errText(err)}`);
            await load();
            await openEdit({ ...created, account: null });
            return;
          }
        } else {
          success('Tenaga kesehatan ditambahkan');
        }
      } else {
        if (reason.trim()) body.reason = reason.trim();
        await practitionersApi.update(editing.id, body);
        success('Data tenaga kesehatan diperbarui');
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      showError(errText(err));
    } finally {
      setSaving(false);
    }
  }

  async function createAccountNow() {
    if (!editing) return;
    const email = acct.email.trim();
    if (!EMAIL_OK.test(email)) return showError('Isi email login yang valid');
    if (!PASSWORD_OK.test(acct.password)) return showError('Password minimal 8 karakter, berisi huruf dan angka');
    setAcctSaving(true);
    try {
      const p = await practitionersApi.createAccount(editing.id, {
        email,
        password: acct.password,
        role: acct.role || roleForProfession(form.profession || editing.profession),
      });
      setEditing(p);
      setAcct((a) => ({ ...a, enabled: false, password: '' }));
      success(`Akun login dibuat — login: ${email}`);
      setRevisions(await practitionersApi.revisions(editing.id).catch(() => revisions));
      void load();
    } catch (err) {
      showError(errText(err));
    } finally {
      setAcctSaving(false);
    }
  }

  async function saveAccount() {
    if (!editing?.account) return;
    const body: { email?: string; password?: string; isActive?: boolean } = {};
    const email = acct.email.trim();
    if (email && email !== editing.account.email) {
      if (!EMAIL_OK.test(email)) return showError('Format email tidak valid');
      body.email = email;
    }
    if (acct.password) {
      if (!PASSWORD_OK.test(acct.password)) return showError('Password minimal 8 karakter, berisi huruf dan angka');
      body.password = acct.password;
    }
    if (acct.isActive !== editing.account.isActive) body.isActive = acct.isActive;
    if (!Object.keys(body).length) return showError('Tidak ada perubahan akun');
    setAcctSaving(true);
    try {
      const p = await practitionersApi.updateAccount(editing.id, body);
      setEditing(p);
      setAcct((a) => ({ ...a, password: '' }));
      success(body.password ? 'Password direset — sesi lama dikeluarkan' : 'Akun diperbarui');
      setRevisions(await practitionersApi.revisions(editing.id).catch(() => revisions));
      void load();
    } catch (err) {
      showError(errText(err));
    } finally {
      setAcctSaving(false);
    }
  }

  async function runMatch() {
    if (!editing) return;
    setMatching(true);
    try {
      const r = await practitionersApi.matchSatusehat(editing.id);
      setMatch(r);
      if (r.found && r.practitioner) {
        setEditing(r.practitioner);
        set('satusehatPractitionerId', r.practitioner.satusehatPractitionerId ?? '');
        setRevisions(await practitionersApi.revisions(editing.id).catch(() => revisions));
        void load();
      }
    } catch (err) {
      showError(errText(err));
    } finally {
      setMatching(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`Hapus ${editing.name}? Lebih aman menonaktifkan bila nakes sudah punya riwayat kunjungan.`)) return;
    setSaving(true);
    try {
      await practitionersApi.remove(editing.id);
      success('Tenaga kesehatan dihapus');
      setFormOpen(false);
      await load();
    } catch (err) {
      showError(`${errText(err)} — coba nonaktifkan saja`);
    } finally {
      setSaving(false);
    }
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    setSearching(true);
    setResults(null);
    try {
      const q =
        mode === 'nik'
          ? { nik: sq.nik }
          : mode === 'id'
            ? { ihsId: sq.ihsId.trim() }
            : { name: sq.name.trim(), gender: sq.gender, birthDate: sq.birthDate };
      const r = await practitionersApi.searchSatusehat(q);
      setResults(r.results ?? []);
    } catch (err) {
      showError(errText(err));
    } finally {
      setSearching(false);
    }
  }

  function addFromSatusehat(r: SatusehatPractitioner) {
    openCreate({
      name: r.name ?? '',
      gender: r.gender === 'male' || r.gender === 'female' ? r.gender : '',
      birthDate: r.birthDate ?? '',
      nik: mode === 'nik' ? sq.nik : '',
      satusehatPractitionerId: r.id,
    });
  }

  const canSearch =
    mode === 'nik'
      ? sq.nik.length === 16
      : mode === 'id'
        ? sq.ihsId.trim().length >= 3
        : sq.name.trim().length >= 2 && !!sq.gender && !!sq.birthDate;

  return (
    <div className="nakes">
      <div className="stat-row">
        <div className="stat-pill">
          <span className="stat-dot dot-blue" /> Total <strong>{stats.total}</strong>
        </div>
        <div className="stat-pill">
          <span className="stat-dot dot-green" /> Terhubung SATUSEHAT <strong>{stats.linked}</strong>
        </div>
        <div className="stat-pill">
          <span className="stat-dot nakes-dot-warn" /> Perlu dilengkapi <strong>{stats.attention}</strong>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">
            <FiSearch />
          </span>
          <input
            type="text"
            placeholder="Cari nama, profesi, SIP, STR, ID SATUSEHAT, 4 digit akhir NIK..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari tenaga kesehatan"
          />
        </div>
        <button type="button" className="btn-outline" onClick={() => setSearchOpen((v) => !v)}>
          <FiSearch /> Cari di SATUSEHAT
        </button>
        <button type="button" className="btn-primary" onClick={() => openCreate()}>
          <FiPlus /> Tambah Nakes
        </button>
      </div>

      <div className="filter-btns nakes-filters">
        {(
          [
            ['semua', 'Semua'],
            ['perhatian', 'Perlu dilengkapi'],
            ['belum', 'Belum terhubung'],
            ['terhubung', 'Terhubung'],
            ['nonaktif', 'Nonaktif'],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button key={k} type="button" className={`filter-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {searchOpen && (
        <div className="satusehat-panel nakes-search">
          <div className="nakes-search-head">
            <div>
              <div className="satusehat-title">Cari tenaga kesehatan di SATUSEHAT</div>
              <div className="satusehat-subtitle">Data resmi SISDMK — pilih salah satu cara pencarian</div>
            </div>
            <button type="button" className="modal-close" onClick={() => setSearchOpen(false)} aria-label="Tutup pencarian">
              <FiX />
            </button>
          </div>
          <form className="nakes-search-form" onSubmit={search}>
            <div className="search-methods">
              {(
                [
                  ['nik', 'NIK', '16 digit KTP'],
                  ['nama', 'Nama', 'Nama + JK + tgl lahir'],
                  ['id', 'ID SATUSEHAT', 'ID Practitioner (IHS)'],
                ] as [SearchMode, string, string][]
              ).map(([k, label, sub]) => (
                <button
                  key={k}
                  type="button"
                  className={`method-btn ${mode === k ? 'active' : ''}`}
                  onClick={() => {
                    setMode(k);
                    setResults(null);
                  }}
                >
                  <div className="method-btn-label">{label}</div>
                  <div className="method-btn-sub">{sub}</div>
                </button>
              ))}
            </div>
            <div className="nakes-search-fields">
              {mode === 'nik' && (
                <input
                  className="search-input"
                  inputMode="numeric"
                  placeholder="16 digit NIK"
                  value={sq.nik}
                  onChange={(e) => setSq((s) => ({ ...s, nik: digits(e.target.value) }))}
                  aria-label="NIK"
                />
              )}
              {mode === 'id' && (
                <input
                  className="search-input"
                  placeholder="mis. 10009880728"
                  value={sq.ihsId}
                  onChange={(e) => setSq((s) => ({ ...s, ihsId: e.target.value }))}
                  aria-label="ID SATUSEHAT"
                />
              )}
              {mode === 'nama' && (
                <>
                  <input
                    className="search-input"
                    placeholder="Nama sesuai KTP (tanpa gelar)"
                    value={sq.name}
                    onChange={(e) => setSq((s) => ({ ...s, name: e.target.value }))}
                    aria-label="Nama"
                  />
                  <select
                    className="search-input"
                    value={sq.gender}
                    onChange={(e) => setSq((s) => ({ ...s, gender: e.target.value }))}
                    aria-label="Jenis kelamin"
                  >
                    <option value="">Jenis kelamin</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                  <input
                    className="search-input"
                    type="date"
                    value={sq.birthDate}
                    onChange={(e) => setSq((s) => ({ ...s, birthDate: e.target.value }))}
                    aria-label="Tanggal lahir"
                  />
                </>
              )}
              <button type="submit" className="btn-primary" disabled={!canSearch || searching}>
                {searching ? 'Mencari...' : 'Cari'}
              </button>
            </div>
          </form>

          {results && (
            <div className="nakes-results">
              <div className="result-count">
                <span className="result-count-dot" />
                {results.length ? `${results.length} hasil ditemukan` : 'Tidak ditemukan di SATUSEHAT'}
              </div>
              {results.map((r) => (
                <div key={r.id} className="nakes-result">
                  <div className="result-avatar">{initials(r.name ?? '?')}</div>
                  <div className="result-info">
                    <div className="result-name">{r.name ?? '(tanpa nama)'}</div>
                    <div className="result-tags">
                      <span className="result-tag">ID {r.id}</span>
                      {r.nikMasked && <span className="result-tag">NIK {r.nikMasked}</span>}
                      {r.gender && <span className="result-tag">{GENDER_LABEL[r.gender] ?? r.gender}</span>}
                      {r.birthDate && <span className="result-tag">{r.birthDate}</span>}
                      {r.city && <span className="result-tag">{r.city}</span>}
                    </div>
                  </div>
                  {r.inClinic ? (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        const p = list?.find((x) => x.id === r.inClinic!.id);
                        if (p) void openEdit(p);
                      }}
                    >
                      Sudah di klinik · Buka
                    </button>
                  ) : (
                    <button type="button" className="btn-add-to-clinic" onClick={() => addFromSatusehat(r)}>
                      <FiPlus /> Tambah ke Klinik
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {list === null ? (
        <p className="nakes-muted">Memuat...</p>
      ) : visible.length === 0 ? (
        <div className="empty-state nakes-empty">
          <p>{list.length ? 'Tidak ada yang cocok' : 'Belum ada tenaga kesehatan'}</p>
          <span>{list.length ? 'Ubah kata kunci atau filter' : 'Tambah manual atau cari di SATUSEHAT'}</span>
        </div>
      ) : (
        <div className="nakes-list">
          {visible.map((p) => {
            const issues = p.isActive === false ? [] : issuesOf(p);
            return (
              <button key={p.id} type="button" className={`nakes-card ${p.isActive === false ? 'inactive' : ''}`} onClick={() => openEdit(p)}>
                <div className="result-avatar nakes-avatar">{initials(p.name)}</div>
                <div className="nakes-card-body">
                  <div className="nakes-card-top">
                    <span className="result-name">{p.name}</span>
                    {p.satusehatPractitionerId ? (
                      <span className="nakes-badge ok">
                        <FiCheckCircle /> SATUSEHAT
                      </span>
                    ) : (
                      <span className="nakes-badge warn">Belum terhubung</span>
                    )}
                    {p.isActive === false && <span className="nakes-badge muted">Nonaktif</span>}
                    {p.account ? (
                      <span className={`nakes-badge ${p.account.isActive ? 'info' : 'muted'}`}>
                        <FiUser /> {p.account.email}
                        {!p.account.isActive && ' (nonaktif)'}
                      </span>
                    ) : (
                      <span className="nakes-badge muted">Belum punya akun</span>
                    )}
                  </div>
                  <div className="result-tags">
                    {p.profession && <span className="result-tag">{professionLabel(p.profession)}</span>}
                    {p.specialization && <span className="result-tag">{p.specialization}</span>}
                    {p.nikMasked && <span className="result-tag">NIK {p.nikMasked}</span>}
                    {p.sipNumber && <span className="result-tag">SIP {p.sipNumber}</span>}
                    {p.satusehatPractitionerId && <span className="result-tag">ID {p.satusehatPractitionerId}</span>}
                  </div>
                  {issues.length > 0 && (
                    <div className="nakes-issues">
                      <FiAlertTriangle /> {issues.join(' · ')}
                    </div>
                  )}
                </div>
                <FiEdit2 className="nakes-edit" aria-hidden />
              </button>
            );
          })}
        </div>
      )}

      {/* Form tambah / revisi */}
      <div
        className={`modal-overlay ${formOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setFormOpen(false);
        }}
      >
        {formOpen && (
          <form className="modal nakes-modal" onSubmit={save} aria-label={editing ? 'Revisi data nakes' : 'Tambah nakes'}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{editing ? 'Revisi Data Tenaga Kesehatan' : 'Tambah Tenaga Kesehatan'}</div>
                <div className="modal-subtitle">
                  {editing ? 'Ubah data yang salah; setiap perubahan tercatat di riwayat revisi' : 'Bertanda * wajib diisi'}
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setFormOpen(false)} aria-label="Tutup">
                <FiX />
              </button>
            </div>

            <div className="nakes-modal-body">
              <fieldset className="nakes-section">
                <legend>Data wajib</legend>
                <label className="nakes-field span-2">
                  Nama lengkap & gelar *
                  <input className="form-input" value={form.name} maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder="mis. drg. Ratna Sari" required />
                </label>
                <label className="nakes-field">
                  NIK {editing ? '' : '*'}
                  <input
                    className="form-input"
                    inputMode="numeric"
                    value={form.nik}
                    onChange={(e) => set('nik', digits(e.target.value))}
                    placeholder={editing?.nikMasked ? `Tersimpan ${editing.nikMasked} — isi untuk mengganti` : '16 digit sesuai KTP'}
                    required={!editing}
                  />
                  {editing && form.nik && <small className="nakes-warn">NIK baru akan mencocokkan ulang ID SATUSEHAT</small>}
                </label>
                <label className="nakes-field">
                  Jenis kelamin *
                  <select className="form-input" value={form.gender} onChange={(e) => set('gender', e.target.value as FormState['gender'])} required>
                    <option value="">Pilih</option>
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </label>
                <label className="nakes-field span-2">
                  Profesi
                  <select className="form-input" value={form.profession} onChange={(e) => set('profession', e.target.value)}>
                    <option value="">Pilih profesi</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <fieldset className="nakes-section">
                <legend>Legalitas praktik</legend>
                <label className="nakes-field span-2">
                  Spesialisasi / kompetensi
                  <input className="form-input" value={form.specialization} maxLength={100} onChange={(e) => set('specialization', e.target.value)} placeholder="mis. Spesialis Konservasi Gigi" />
                </label>
                <label className="nakes-field">
                  No. SIP
                  <input className="form-input" value={form.sipNumber} maxLength={50} onChange={(e) => set('sipNumber', e.target.value)} />
                </label>
                <label className="nakes-field">
                  SIP berlaku s.d.
                  <input className="form-input" type="date" value={form.sipExpiredAt} onChange={(e) => set('sipExpiredAt', e.target.value)} />
                </label>
                <label className="nakes-field">
                  No. STR
                  <input className="form-input" value={form.strNumber} maxLength={50} onChange={(e) => set('strNumber', e.target.value)} />
                </label>
                <label className="nakes-field">
                  STR berlaku s.d.
                  <input className="form-input" type="date" value={form.strExpiredAt} onChange={(e) => set('strExpiredAt', e.target.value)} />
                  <small>Kosongkan bila STR berlaku seumur hidup</small>
                </label>
              </fieldset>

              <fieldset className="nakes-section">
                <legend>Identitas & kontak (opsional)</legend>
                <label className="nakes-field">
                  Tempat lahir
                  <input className="form-input" value={form.birthPlace} maxLength={100} onChange={(e) => set('birthPlace', e.target.value)} />
                </label>
                <label className="nakes-field">
                  Tanggal lahir
                  <input className="form-input" type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
                </label>
                <label className="nakes-field">
                  No. HP
                  <input className="form-input" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/[^\d+]/g, '').slice(0, 16))} placeholder="08xxxxxxxxxx" />
                </label>
                <label className="nakes-field">
                  Email
                  <input className="form-input" type="email" value={form.email} maxLength={100} onChange={(e) => set('email', e.target.value)} />
                </label>
                <label className="nakes-field span-2">
                  Alamat
                  <input className="form-input" value={form.address} maxLength={255} onChange={(e) => set('address', e.target.value)} />
                </label>
              </fieldset>

              <fieldset className="nakes-section">
                <legend>Akun login ApexRecord</legend>
                {editing?.account ? (
                  <>
                    <div className="nakes-acct span-2">
                      <span className={`nakes-badge ${editing.account.isActive ? 'info' : 'muted'}`}>
                        <FiUser /> {editing.account.role === 'perawat' ? 'Perawat' : 'Dokter'} · {editing.account.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <small>
                        {editing.account.lastLoginAt
                          ? `Login terakhir ${formatDateTime(editing.account.lastLoginAt)}`
                          : 'Belum pernah login'}
                      </small>
                    </div>
                    <label className="nakes-field">
                      Email login
                      <input className="form-input" type="email" autoComplete="off" value={acct.email} onChange={(e) => setAcct((a) => ({ ...a, email: e.target.value }))} />
                    </label>
                    <label className="nakes-field">
                      Reset password (opsional)
                      <span className="nakes-pass">
                        <input
                          className="form-input"
                          type="text"
                          autoComplete="new-password"
                          value={acct.password}
                          placeholder="Kosongkan bila tidak diubah"
                          onChange={(e) => setAcct((a) => ({ ...a, password: e.target.value }))}
                        />
                        <button type="button" className="btn-outline" onClick={() => setAcct((a) => ({ ...a, password: generatePassword() }))} title="Buat password acak">
                          <FiRefreshCw />
                        </button>
                      </span>
                    </label>
                    <label className="nakes-check span-2">
                      <input type="checkbox" checked={acct.isActive} onChange={(e) => setAcct((a) => ({ ...a, isActive: e.target.checked }))} />
                      Akun aktif (bisa login)
                    </label>
                    <div className="nakes-acct-actions span-2">
                      <small>Akun ini juga tampil di tab User & Akses. Reset password mengeluarkan semua sesi lamanya.</small>
                      <button type="button" className="btn-outline" onClick={saveAccount} disabled={acctSaving}>
                        {acctSaving ? 'Menyimpan...' : 'Simpan akun'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {!editing && (
                      <label className="nakes-check span-2">
                        <input type="checkbox" checked={acct.enabled} onChange={(e) => setAcct((a) => ({ ...a, enabled: e.target.checked }))} />
                        Buatkan akun login untuk nakes ini (dokter/perawat bisa masuk ke ApexRecord)
                      </label>
                    )}
                    {(editing || acct.enabled) && (
                      <>
                        <label className="nakes-field">
                          Email login *
                          <input
                            className="form-input"
                            type="email"
                            autoComplete="off"
                            value={acct.email}
                            placeholder={form.email || 'nama@klinik.id'}
                            onChange={(e) => setAcct((a) => ({ ...a, email: e.target.value }))}
                          />
                        </label>
                        <label className="nakes-field">
                          Password *
                          <span className="nakes-pass">
                            <input
                              className="form-input"
                              type="text"
                              autoComplete="new-password"
                              value={acct.password}
                              placeholder="Min. 8 karakter, huruf + angka"
                              onChange={(e) => setAcct((a) => ({ ...a, password: e.target.value }))}
                            />
                            <button type="button" className="btn-outline" onClick={() => setAcct((a) => ({ ...a, password: generatePassword() }))} title="Buat password acak">
                              <FiRefreshCw />
                            </button>
                          </span>
                        </label>
                        <label className="nakes-field">
                          Peran akun
                          <select className="form-input" value={acct.role} onChange={(e) => setAcct((a) => ({ ...a, role: e.target.value as typeof a.role }))}>
                            <option value="">Otomatis dari profesi ({roleForProfession(form.profession) === 'perawat' ? 'Perawat' : 'Dokter'})</option>
                            <option value="dokter">Dokter</option>
                            <option value="perawat">Perawat</option>
                          </select>
                        </label>
                        <small className="nakes-field-note">
                          Dokter/perawat hanya melihat pasien yang pernah atau sedang ditanganinya. Catat password lalu bagikan ke yang bersangkutan.
                        </small>
                        {editing && (
                          <div className="nakes-acct-actions span-2">
                            <span />
                            <button type="button" className="btn-outline" onClick={createAccountNow} disabled={acctSaving}>
                              {acctSaving ? 'Membuat...' : 'Buat akun login'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </fieldset>

              {editing && (
                <fieldset className="nakes-section">
                  <legend>SATUSEHAT & status</legend>
                  <div className="nakes-ss span-2">
                    <div>
                      {editing.satusehatPractitionerId ? (
                        <span className="nakes-badge ok">
                          <FiCheckCircle /> Terhubung · ID {editing.satusehatPractitionerId}
                        </span>
                      ) : (
                        <span className="nakes-badge warn">Belum terhubung SATUSEHAT</span>
                      )}
                    </div>
                    <button type="button" className="btn-outline" onClick={runMatch} disabled={matching || !editing.hasNik}>
                      <FiLink /> {matching ? 'Mencocokkan...' : 'Cocokkan dengan SATUSEHAT'}
                    </button>
                  </div>
                  {match && (
                    <div className={`nakes-match span-2 ${match.found ? (match.nameMatches ? 'ok' : 'diff') : 'none'}`}>
                      {!match.found ? (
                        match.message
                      ) : (
                        <>
                          <span>
                            Nama di SATUSEHAT: <strong>{match.satusehatName ?? '-'}</strong>
                            {match.nameMatches ? ' — sesuai' : ' — berbeda dengan data klinik'}
                          </span>
                          {!match.nameMatches && match.satusehatName && (
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                set('name', match.satusehatName ?? form.name);
                                set('reason', form.reason || 'Disamakan dengan nama SATUSEHAT');
                              }}
                            >
                              Pakai nama ini
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <label className="nakes-check span-2">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                    Aktif praktik di klinik ini (nonaktif = tidak muncul di pilihan dokter)
                  </label>
                </fieldset>
              )}

              {editing && (
                <fieldset className="nakes-section">
                  <legend>Revisi</legend>
                  <label className="nakes-field span-2">
                    Alasan revisi (opsional)
                    <input className="form-input" value={form.reason} maxLength={255} onChange={(e) => set('reason', e.target.value)} placeholder="mis. Salah ketik nama" />
                  </label>
                  <div className="nakes-history span-2">
                    <div className="nakes-history-title">
                      <FiClock /> Riwayat revisi
                    </div>
                    {revisions === null ? (
                      <p className="nakes-muted">Memuat...</p>
                    ) : revisions.length === 0 ? (
                      <p className="nakes-muted">Belum ada revisi</p>
                    ) : (
                      <ul>
                        {revisions.map((r) => (
                          <li key={r.id}>
                            <div className="nakes-history-meta">
                              {formatDateTime(r.createdAt)} · {r.changedByName ?? 'Sistem'}
                              {r.reason && <em> — {r.reason}</em>}
                            </div>
                            {r.changes.map((c) => (
                              <div key={c.field} className="nakes-history-change">
                                <strong>{c.label}:</strong> <s>{c.from ?? '(kosong)'}</s> → {c.to ?? '(kosong)'}
                              </div>
                            ))}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </fieldset>
              )}
            </div>

            <div className="modal-footer nakes-footer">
              {editing && (
                <button type="button" className="btn-outline nakes-delete" onClick={remove} disabled={saving}>
                  <FiTrash2 /> Hapus
                </button>
              )}
              <button type="button" className="btn-outline" onClick={() => setFormOpen(false)}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : editing ? 'Simpan revisi' : 'Tambah'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
