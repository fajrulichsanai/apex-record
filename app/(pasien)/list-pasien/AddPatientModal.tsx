'use client';

import { useState } from 'react';
import { patientsApi, PatientPayload, SatusehatPatientResult } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';

type UiGender = 'laki-laki' | 'perempuan';

export type NewPatientInput = PatientPayload;

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function uiGenderToApi(gender: UiGender): 'male' | 'female' {
  return gender === 'laki-laki' ? 'male' : 'female';
}

type TabKey = 'satusehat' | 'baru' | 'bayi';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'satusehat', label: 'Cari di SatuSehat', icon: 'travel_explore' },
  { key: 'baru', label: 'Pasien Baru', icon: 'person_add' },
  { key: 'bayi', label: 'Pasien Bayi', icon: 'child_care' },
];

interface FormNewState {
  name: string;
  gender: UiGender;
  nik: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  maritalStatus: '' | 'single' | 'married' | 'divorced' | 'widowed';
}

interface FormBabyState {
  name: string;
  babySex: UiGender;
  birthDate: string;
  motherName: string;
  nikIbu: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

interface AddPatientModalProps {
  onClose: () => void;
  onCreate: (patient: PatientPayload) => void;
}

export default function AddPatientModal({ onClose, onCreate }: AddPatientModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('satusehat');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [ssQuery, setSsQuery] = useState('');
  const [ssSearched, setSsSearched] = useState(false);
  const [ssLoading, setSsLoading] = useState(false);
  const [ssError, setSsError] = useState<string | null>(null);
  const [ssResults, setSsResults] = useState<SatusehatPatientResult[]>([]);

  const [formNew, setFormNew] = useState<FormNewState>({
    name: '',
    gender: 'laki-laki',
    nik: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    maritalStatus: '',
  });

  const [formBaby, setFormBaby] = useState<FormBabyState>({
    name: '',
    babySex: 'laki-laki',
    birthDate: '',
    motherName: '',
    nikIbu: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const handleSearchSatuSehat = async () => {
    const q = ssQuery.trim();
    if (!q) {
      setSsSearched(true);
      setSsResults([]);
      return;
    }
    setSsLoading(true);
    setSsSearched(false);
    setSsError(null);
    try {
      const results = await patientsApi.searchSatusehat(q);
      setSsResults(results ?? []);
    } catch (err) {
      setSsError(err instanceof ApiError ? err.message : 'Gagal menghubungi layanan SatuSehat');
      setSsResults([]);
    } finally {
      setSsLoading(false);
      setSsSearched(true);
    }
  };

  const handleSelectSatuSehatResult = (result: SatusehatPatientResult) => {
    onCreate({
      name: result.name,
      gender: result.gender ?? 'male',
      nik: result.nik,
      dateOfBirth: result.birthDate,
      address: result.address,
    });
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNew.name.trim()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: PatientPayload = {
        name: formNew.name,
        gender: uiGenderToApi(formNew.gender),
        nik: formNew.nik || undefined,
        dateOfBirth: formNew.birthDate || undefined,
        phone: formNew.phone || undefined,
        email: formNew.email || undefined,
        address: formNew.address || undefined,
        city: formNew.city || undefined,
        province: formNew.province || undefined,
        postalCode: formNew.postalCode || undefined,
        maritalStatus: formNew.maritalStatus || undefined,
      };
      onCreate(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBaby.name.trim() || !formBaby.motherName.trim()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: PatientPayload = {
        name: formBaby.name,
        gender: uiGenderToApi(formBaby.babySex),
        isNewborn: true,
        nikIbu: formBaby.nikIbu || undefined,
        dateOfBirth: formBaby.birthDate || undefined,
        phone: formBaby.phone || undefined,
        address: formBaby.address || undefined,
        city: formBaby.city || undefined,
        province: formBaby.province || undefined,
        postalCode: formBaby.postalCode || undefined,
      };
      onCreate(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="list-pasien-modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">person_add</span>
            </div>
            <div>
              <h2>Registrasi Pasien Baru</h2>
              <p>Lengkapi data pasien atau ambil data resmi dari SatuSehat</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`modal-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              <span className="material-symbols-rounded">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'satusehat' && (
          <>
            <div className="modal-body">
              <div className="satusehat-search-box">
                <span className="material-symbols-rounded search-icon">search</span>
                <input
                  type="text"
                  placeholder="Masukkan NIK pasien…"
                  value={ssQuery}
                  onChange={(e) => setSsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSatuSehat()}
                />
                <button
                  className="btn-primary"
                  onClick={handleSearchSatuSehat}
                  type="button"
                  disabled={ssLoading}
                >
                  {ssLoading ? 'Mencari…' : 'Cari Data'}
                </button>
              </div>
              <div className="satusehat-hint">
                <span className="material-symbols-rounded">info</span>
                <span>
                  Pencarian dilakukan langsung ke Platform SatuSehat berdasarkan NIK pasien.
                </span>
              </div>

              {ssLoading && (
                <div className="satusehat-loading">
                  <span className="spinner" />
                  Menghubungi layanan SatuSehat…
                </div>
              )}

              {!ssLoading && ssError && (
                <div className="satusehat-empty">
                  <span className="material-symbols-rounded">error</span>
                  <div className="empty-title">Gagal mencari data</div>
                  <div className="empty-sub">{ssError}</div>
                </div>
              )}

              {!ssLoading && !ssError && ssSearched && ssResults.length === 0 && (
                <div className="satusehat-empty">
                  <span className="material-symbols-rounded">search_off</span>
                  <div className="empty-title">Data tidak ditemukan</div>
                  <div className="empty-sub">
                    Periksa kembali NIK yang dimasukkan, atau daftarkan pasien secara manual
                    melalui tab &ldquo;Pasien Baru&rdquo;.
                  </div>
                </div>
              )}

              {!ssLoading && ssResults.length > 0 && (
                <div className="satusehat-result-list">
                  <div className="satusehat-result-count">
                    {ssResults.length} data pasien ditemukan
                  </div>
                  {ssResults.map((r) => (
                    <div
                      key={r.nik}
                      className="satusehat-result-item"
                      onClick={() => handleSelectSatuSehatResult(r)}
                    >
                      <div className="satusehat-result-avatar">{getInitials(r.name)}</div>
                      <div className="satusehat-result-info">
                        <div className="satusehat-result-name">
                          {r.name}
                          <span className="tag-verified">
                            <span className="material-symbols-rounded">verified</span>
                            Terverifikasi
                          </span>
                        </div>
                        <div className="satusehat-result-meta">
                          NIK {r.nik}
                          {r.birthDate ? ` · Lahir ${r.birthDate}` : ''}
                          {r.address ? ` · ${r.address}` : ''}
                        </div>
                      </div>
                      <span className="material-symbols-rounded chevron-icon">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={onClose} type="button">
                Batalkan
              </button>
            </div>
          </>
        )}

        {activeTab === 'baru' && (
          <form onSubmit={handleSubmitNew}>
            <div className="modal-body">
              <div className="form-section-title">Data Identitas Pasien</div>
              {submitError && <div className="satusehat-empty">{submitError}</div>}
              <div className="form-row">
                <div className="form-field full">
                  <label>Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Sesuai KTP / dokumen identitas resmi"
                    value={formNew.name}
                    onChange={(e) => setFormNew({ ...formNew, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Jenis Kelamin</label>
                  <select
                    value={formNew.gender}
                    onChange={(e) =>
                      setFormNew({ ...formNew, gender: e.target.value as UiGender })
                    }
                  >
                    <option value="laki-laki">Laki-laki</option>
                    <option value="perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formNew.birthDate}
                    onChange={(e) => setFormNew({ ...formNew, birthDate: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Nomor Induk Kependudukan (NIK)</label>
                  <input
                    type="text"
                    placeholder="16 digit NIK"
                    value={formNew.nik}
                    onChange={(e) => setFormNew({ ...formNew, nik: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Nomor Telepon</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={formNew.phone}
                    onChange={(e) => setFormNew({ ...formNew, phone: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={formNew.email}
                    onChange={(e) => setFormNew({ ...formNew, email: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Status Perkawinan</label>
                  <select
                    value={formNew.maritalStatus}
                    onChange={(e) =>
                      setFormNew({
                        ...formNew,
                        maritalStatus: e.target.value as FormNewState['maritalStatus'],
                      })
                    }
                  >
                    <option value="">Tidak diisi</option>
                    <option value="single">Belum Menikah</option>
                    <option value="married">Menikah</option>
                    <option value="divorced">Cerai Hidup</option>
                    <option value="widowed">Cerai Mati</option>
                  </select>
                </div>
                <div className="form-field full">
                  <label>Alamat Domisili</label>
                  <textarea
                    placeholder="Alamat lengkap sesuai domisili saat ini"
                    value={formNew.address}
                    onChange={(e) => setFormNew({ ...formNew, address: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Kota / Kabupaten</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bandung"
                    value={formNew.city}
                    onChange={(e) => setFormNew({ ...formNew, city: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Provinsi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jawa Barat"
                    value={formNew.province}
                    onChange={(e) => setFormNew({ ...formNew, province: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Kode Pos</label>
                  <input
                    type="text"
                    placeholder="Contoh: 40123"
                    value={formNew.postalCode}
                    onChange={(e) => setFormNew({ ...formNew, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose}>
                Batalkan
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  save
                </span>
                {submitting ? 'Menyimpan…' : 'Simpan Data Pasien'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'bayi' && (
          <form onSubmit={handleSubmitBaby}>
            <div className="modal-body">
              <div className="form-section-title">Data Identitas Bayi</div>
              {submitError && <div className="satusehat-empty">{submitError}</div>}
              <div className="form-row">
                <div className="form-field full">
                  <label>Nama Bayi</label>
                  <input
                    type="text"
                    placeholder="Contoh: By. Ny. Sari"
                    value={formBaby.name}
                    onChange={(e) => setFormBaby({ ...formBaby, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Jenis Kelamin</label>
                  <select
                    value={formBaby.babySex}
                    onChange={(e) =>
                      setFormBaby({ ...formBaby, babySex: e.target.value as UiGender })
                    }
                  >
                    <option value="laki-laki">Laki-laki</option>
                    <option value="perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formBaby.birthDate}
                    onChange={(e) => setFormBaby({ ...formBaby, birthDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-section-title">Data Identitas Orang Tua / Wali</div>
              <div className="form-row">
                <div className="form-field full">
                  <label>Nama Ibu Kandung</label>
                  <input
                    type="text"
                    placeholder="Sesuai dokumen identitas resmi"
                    value={formBaby.motherName}
                    onChange={(e) => setFormBaby({ ...formBaby, motherName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>NIK Ibu</label>
                  <input
                    type="text"
                    placeholder="16 digit NIK"
                    value={formBaby.nikIbu}
                    onChange={(e) => setFormBaby({ ...formBaby, nikIbu: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Nomor Telepon</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812xxxxxxxx"
                    value={formBaby.phone}
                    onChange={(e) => setFormBaby({ ...formBaby, phone: e.target.value })}
                  />
                </div>
                <div className="form-field full">
                  <label>Alamat Domisili</label>
                  <textarea
                    placeholder="Alamat lengkap sesuai domisili saat ini"
                    value={formBaby.address}
                    onChange={(e) => setFormBaby({ ...formBaby, address: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={formBaby.city}
                    onChange={(e) => setFormBaby({ ...formBaby, city: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Provinsi</label>
                  <input
                    type="text"
                    value={formBaby.province}
                    onChange={(e) => setFormBaby({ ...formBaby, province: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Kode Pos</label>
                  <input
                    type="text"
                    value={formBaby.postalCode}
                    onChange={(e) => setFormBaby({ ...formBaby, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose}>
                Batalkan
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  save
                </span>
                {submitting ? 'Menyimpan…' : 'Simpan Data Pasien Bayi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
