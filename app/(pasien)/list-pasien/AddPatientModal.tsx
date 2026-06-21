'use client';

import { useState } from 'react';

type Gender = 'laki-laki' | 'perempuan' | 'bayi';

export interface NewPatientInput {
  name: string;
  gender: Gender;
  nik: string;
  birthDate: string;
  phone: string;
  address: string;
  motherName?: string;
}

interface SatuSehatResult {
  nik: string;
  name: string;
  birthDate: string;
  gender: 'laki-laki' | 'perempuan';
  address: string;
}

const MOCK_SATUSEHAT_DB: SatuSehatResult[] = [
  {
    nik: '3201012003900001',
    name: 'Ahmad Ridwan Saputra',
    birthDate: '1990-03-20',
    gender: 'laki-laki',
    address: 'Jl. Merdeka No. 12, Bandung',
  },
  {
    nik: '3201015506950002',
    name: 'Siti Rahayu Putri',
    birthDate: '1995-06-15',
    gender: 'perempuan',
    address: 'Jl. Sudirman No. 45, Bandung',
  },
  {
    nik: '3201017801850003',
    name: 'Budi Santoso',
    birthDate: '1985-01-17',
    gender: 'laki-laki',
    address: 'Jl. Asia Afrika No. 8, Bandung',
  },
];

type TabKey = 'satusehat' | 'baru' | 'bayi';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'satusehat', label: 'Cari di SatuSehat', icon: 'travel_explore' },
  { key: 'baru', label: 'Pasien Baru', icon: 'person_add' },
  { key: 'bayi', label: 'Pasien Bayi', icon: 'child_care' },
];

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

interface AddPatientModalProps {
  onClose: () => void;
  onCreate: (patient: NewPatientInput) => void;
}

export default function AddPatientModal({ onClose, onCreate }: AddPatientModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('satusehat');

  const [ssQuery, setSsQuery] = useState('');
  const [ssSearched, setSsSearched] = useState(false);
  const [ssLoading, setSsLoading] = useState(false);
  const [ssResults, setSsResults] = useState<SatuSehatResult[]>([]);

  const [formNew, setFormNew] = useState<NewPatientInput>({
    name: '',
    gender: 'laki-laki',
    nik: '',
    birthDate: '',
    phone: '',
    address: '',
  });

  const [formBaby, setFormBaby] = useState<NewPatientInput>({
    name: '',
    gender: 'bayi',
    nik: '',
    birthDate: '',
    phone: '',
    address: '',
    motherName: '',
  });
  const [babySex, setBabySex] = useState<'laki-laki' | 'perempuan'>('laki-laki');

  const handleSearchSatuSehat = () => {
    const q = ssQuery.trim().toLowerCase();
    if (!q) {
      setSsSearched(true);
      setSsResults([]);
      return;
    }
    setSsLoading(true);
    setSsSearched(false);
    window.setTimeout(() => {
      setSsResults(
        MOCK_SATUSEHAT_DB.filter(
          (r) => r.nik.includes(q) || r.name.toLowerCase().includes(q)
        )
      );
      setSsLoading(false);
      setSsSearched(true);
    }, 450);
  };

  const handleSelectSatuSehatResult = (result: SatuSehatResult) => {
    onCreate({
      name: result.name,
      gender: result.gender,
      nik: result.nik,
      birthDate: result.birthDate,
      phone: '',
      address: result.address,
    });
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNew.name.trim()) return;
    onCreate(formNew);
  };

  const handleSubmitBaby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBaby.name.trim() || !formBaby.motherName?.trim()) return;
    onCreate({ ...formBaby, gender: 'bayi' });
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
                  placeholder="Masukkan NIK atau nama lengkap pasien…"
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
                  Hasil pencarian saat ini menggunakan data simulasi untuk keperluan demonstrasi.
                  Integrasi resmi dengan Platform SatuSehat akan diaktifkan setelah kredensial
                  klinik diverifikasi.
                </span>
              </div>

              {ssLoading && (
                <div className="satusehat-loading">
                  <span className="spinner" />
                  Menghubungi layanan SatuSehat…
                </div>
              )}

              {!ssLoading && ssSearched && ssResults.length === 0 && (
                <div className="satusehat-empty">
                  <span className="material-symbols-rounded">search_off</span>
                  <div className="empty-title">Data tidak ditemukan</div>
                  <div className="empty-sub">
                    Periksa kembali NIK atau nama yang dimasukkan, atau daftarkan pasien secara
                    manual melalui tab &ldquo;Pasien Baru&rdquo;.
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
                          NIK {r.nik} · Lahir {r.birthDate} · {r.address}
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
                      setFormNew({ ...formNew, gender: e.target.value as Gender })
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
                <div className="form-field full">
                  <label>Alamat Domisili</label>
                  <textarea
                    placeholder="Alamat lengkap sesuai domisili saat ini"
                    value={formNew.address}
                    onChange={(e) => setFormNew({ ...formNew, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose}>
                Batalkan
              </button>
              <button type="submit" className="btn-primary">
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  save
                </span>
                Simpan Data Pasien
              </button>
            </div>
          </form>
        )}

        {activeTab === 'bayi' && (
          <form onSubmit={handleSubmitBaby}>
            <div className="modal-body">
              <div className="form-section-title">Data Identitas Bayi</div>
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
                    value={babySex}
                    onChange={(e) => setBabySex(e.target.value as 'laki-laki' | 'perempuan')}
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
                    value={formBaby.nik}
                    onChange={(e) => setFormBaby({ ...formBaby, nik: e.target.value })}
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
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose}>
                Batalkan
              </button>
              <button type="submit" className="btn-primary">
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  save
                </span>
                Simpan Data Pasien Bayi
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
