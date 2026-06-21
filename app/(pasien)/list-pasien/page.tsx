'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AddPatientModal, { NewPatientInput } from './AddPatientModal';
import '../../styles/list-pasien.css';

type Gender = 'laki-laki' | 'perempuan' | 'bayi';
type FilterValue = 'semua' | Gender;

interface Patient {
  id: number;
  name: string;
  gender: Gender;
  rmNumber: string;
  age: number;
  active: boolean;
  avatarInitials: string;
}

const PATIENTS: Patient[] = [
  {
    id: 1,
    name: 'Mu** Da** Sa**',
    gender: 'perempuan',
    rmNumber: '000001',
    age: 0,
    active: true,
    avatarInitials: 'MD',
  },
  {
    id: 2,
    name: 'Ahmad Ri**',
    gender: 'laki-laki',
    rmNumber: '000002',
    age: 28,
    active: false,
    avatarInitials: 'AR',
  },
  {
    id: 3,
    name: 'By. Ny. Sa**',
    gender: 'bayi',
    rmNumber: '000003',
    age: 0,
    active: true,
    avatarInitials: 'BY',
  },
  {
    id: 4,
    name: 'Budi Su**',
    gender: 'laki-laki',
    rmNumber: '000004',
    age: 45,
    active: true,
    avatarInitials: 'BS',
  },
  {
    id: 5,
    name: 'Siti Ra**',
    gender: 'perempuan',
    rmNumber: '000005',
    age: 32,
    active: false,
    avatarInitials: 'SR',
  },
];

function genderTagClass(gender: Gender) {
  if (gender === 'laki-laki') return 'male';
  if (gender === 'perempuan') return 'female';
  return 'baby';
}

function genderLabel(gender: Gender) {
  if (gender === 'laki-laki') return 'Laki-laki';
  if (gender === 'perempuan') return 'Perempuan';
  return 'Bayi';
}

function initialsFromName(name: string) {
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

function calcAge(birthDate: string) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(age, 0);
}

export default function ListPasienPage() {
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    PATIENTS[0]?.id ?? null
  );
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPatients = patients.filter((p) => {
    const matchGender = currentFilter === 'semua' || p.gender === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      `no.rm ${p.rmNumber}`.toLowerCase().includes(q) ||
      p.rmNumber.toLowerCase().includes(q);
    return matchGender && matchSearch;
  });

  const totalCount = patients.length;
  const maleCount = patients.filter((p) => p.gender === 'laki-laki').length;
  const femaleCount = patients.filter((p) => p.gender === 'perempuan').length;
  const babyCount = patients.filter((p) => p.gender === 'bayi').length;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    setShowDetailOnMobile(true);
  };

  const handleSetFilter = (filter: FilterValue) => {
    setCurrentFilter(filter);
  };

  const handleAddPatient = () => {
    setShowAddModal(true);
  };

  const handleCreatePatient = (input: NewPatientInput) => {
    const nextRm = String(patients.length + 1).padStart(6, '0');
    const newPatient: Patient = {
      id: Math.max(0, ...patients.map((p) => p.id)) + 1,
      name: input.name,
      gender: input.gender,
      rmNumber: nextRm,
      age: calcAge(input.birthDate),
      active: true,
      avatarInitials: initialsFromName(input.name),
    };
    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatientId(newPatient.id);
    setShowAddModal(false);
  };

  return (
    <DashboardLayout>
      <main className="content list-pasien-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Daftar Pasien</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola seluruh data pasien klinik Anda</p>
          </div>
          <button className="btn-primary" onClick={handleAddPatient}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              add
            </span>
            Tambah Pasien
          </button>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total" onClick={() => handleSetFilter('semua')}>
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                group
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Pasien</div>
            </div>
          </div>
          <div className="stat-card male">
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                man
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{maleCount}</div>
              <div className="stat-label">Laki-laki</div>
            </div>
          </div>
          <div className="stat-card female">
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                woman
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{femaleCount}</div>
              <div className="stat-label">Perempuan</div>
            </div>
          </div>
          <div className="stat-card baby">
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                child_care
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{babyCount}</div>
              <div className="stat-label">Bayi</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content-area">
          {/* List Panel */}
          <div className="panel">
            <div className="panel-toolbar">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari nama, No. RM, NIK…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${currentFilter === 'semua' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('semua')}
                >
                  Semua
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'laki-laki' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('laki-laki')}
                >
                  Laki-laki
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'perempuan' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('perempuan')}
                >
                  Perempuan
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'bayi' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('bayi')}
                >
                  Bayi
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">{filteredPatients.length} Pasien ditemukan</span>
              <button className="sort-btn">
                <span className="material-symbols-rounded">swap_vert</span>
                No. RM
              </button>
            </div>

            <div className="patient-list">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className={`patient-item ${patient.id === selectedPatientId ? 'selected' : ''}`}
                  onClick={() => handleSelectPatient(patient.id)}
                >
                  <div className={`patient-avatar ${genderTagClass(patient.gender)}`}>
                    {patient.avatarInitials}
                  </div>
                  <div className="patient-info">
                    <div className="patient-name">{patient.name}</div>
                    <div className="patient-meta">
                      <span className={`tag ${genderTagClass(patient.gender)}`}>
                        {genderLabel(patient.gender)}
                      </span>
                      <span className="patient-rm">
                        · No.RM {patient.rmNumber} · {patient.age} th
                      </span>
                    </div>
                  </div>
                  <div className="patient-status">
                    <div className={`status-dot ${patient.active ? '' : 'inactive'}`} />
                    <span className="material-symbols-rounded chevron-icon">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className={`detail-panel ${showDetailOnMobile ? 'show' : ''}`}>
            {!selectedPatient ? (
              <div className="detail-empty">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">person_search</span>
                </div>
                <div className="empty-title">Belum ada pasien dipilih</div>
                <div className="empty-sub">
                  Pilih salah satu pasien dari daftar untuk melihat detail informasi
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                <div className="detail-header">
                  <div className="detail-avatar">{selectedPatient.avatarInitials}</div>
                  <div className="detail-name-block">
                    <div className="detail-name">{selectedPatient.name}</div>
                    <div className="detail-rm">No. Rekam Medis: {selectedPatient.rmNumber}</div>
                    <div className="detail-tags">
                      <span className={`tag ${genderTagClass(selectedPatient.gender)}`}>
                        {genderLabel(selectedPatient.gender)}
                      </span>
                      <span className={`tag ${selectedPatient.active ? 'active' : ''}`}>
                        {selectedPatient.active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button className="btn-outline">
                      <span className="material-symbols-rounded">edit</span>
                      Edit
                    </button>
                    <button
                      className="btn-outline danger"
                      style={{ color: '#FF4D4F', borderColor: '#FFCCC7' }}
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="info-cell">
                    <div className="info-label">Tanggal Lahir</div>
                    <div className="info-value">—</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Usia</div>
                    <div className="info-value">{selectedPatient.age} tahun</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">No. Telepon</div>
                    <div className="info-value">—</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">NIK</div>
                    <div className="info-value">—</div>
                  </div>
                  <div className="info-cell" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Alamat</div>
                    <div className="info-value">—</div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <span className="material-symbols-rounded">calendar_month</span>
                    Riwayat Kunjungan
                  </div>
                  <div className="visit-item">
                    <div className="visit-dot" />
                    <div className="visit-info">
                      <div className="visit-type">Pembersihan Karang Gigi</div>
                      <div className="visit-date">14 Jun 2025 · drg. Rina Susanti</div>
                    </div>
                    <div className="visit-price">Rp 150.000</div>
                  </div>
                  <div className="visit-item">
                    <div className="visit-dot" style={{ background: 'var(--text-muted)' }} />
                    <div className="visit-info">
                      <div className="visit-type">Konsultasi Awal</div>
                      <div className="visit-date">02 Jun 2025 · drg. Rina Susanti</div>
                    </div>
                    <div className="visit-price">Rp 75.000</div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <span className="material-symbols-rounded">bolt</span>
                    Tindakan Cepat
                  </div>
                  <div className="quick-actions">
                    <button className="btn-outline" style={{ fontSize: '12.5px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                        add
                      </span>
                      Buat Kunjungan
                    </button>
                    <button className="btn-outline" style={{ fontSize: '12.5px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                        receipt
                      </span>
                      Buat Tagihan
                    </button>
                    <button className="btn-outline" style={{ fontSize: '12.5px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                        print
                      </span>
                      Cetak RM
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddPatientModal onClose={() => setShowAddModal(false)} onCreate={handleCreatePatient} />
      )}
    </DashboardLayout>
  );
}
