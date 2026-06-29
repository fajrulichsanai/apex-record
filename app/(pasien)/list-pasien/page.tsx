'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { patientsApi, Patient, Encounter, ApiGender } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';
import '../../styles/list-pasien.css';

type UiGender = 'laki-laki' | 'perempuan' | 'bayi';
type FilterValue = 'semua' | UiGender;

function apiGenderToUi(patient: Patient): UiGender {
  if (!patient.nik && patient.nikIbu) return 'bayi';
  return patient.gender === 'male' ? 'laki-laki' : 'perempuan';
}

function genderFilterToApi(filter: FilterValue): ApiGender | undefined {
  if (filter === 'laki-laki') return 'male';
  if (filter === 'perempuan') return 'female';
  return undefined;
}

function genderTagClass(gender: UiGender) {
  if (gender === 'laki-laki') return 'male';
  if (gender === 'perempuan') return 'female';
  return 'baby';
}

function genderLabel(gender: UiGender) {
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

function calcAge(birthDate?: string) {
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

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  finished: 'Selesai',
  arrived: 'Sedang Berlangsung',
  cancelled: 'Dibatalkan',
};

function ListPasienContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await patientsApi.list({
        search: searchQuery || undefined,
        gender: genderFilterToApi(currentFilter),
        limit: 100,
      });
      setPatients(data);
      const queryPatientId = Number(searchParams.get('patientId'));
      const preselected = queryPatientId && data.some((p) => p.id === queryPatientId)
        ? queryPatientId
        : null;
      setSelectedPatientId((prev) => preselected ?? prev ?? data[0]?.id ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data pasien');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentFilter, searchParams]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  useEffect(() => {
    if (!selectedPatient) return;
    let active = true;
    setEncountersLoading(true);
    patientsApi
      .encounters(selectedPatient.id)
      .then((data) => {
        if (active) setEncounters(data);
      })
      .catch(() => {
        if (active) setEncounters([]);
      })
      .finally(() => {
        if (active) setEncountersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPatient]);

  const totalCount = patients.length;
  const maleCount = patients.filter((p) => apiGenderToUi(p) === 'laki-laki').length;
  const femaleCount = patients.filter((p) => apiGenderToUi(p) === 'perempuan').length;
  const babyCount = patients.filter((p) => apiGenderToUi(p) === 'bayi').length;

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    setShowDetailOnMobile(true);
  };

  const handleSetFilter = (filter: FilterValue) => {
    setCurrentFilter(filter);
  };

  const handleAddPatient = () => {
    router.push('/list-pasien/tambah');
  };

  const handleEditPatient = () => {
    if (!selectedPatient) return;
    router.push(`/list-pasien/edit/${selectedPatient.id}`);
  };

  const handleDeletePatient = async () => {
    if (!selectedPatient) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await patientsApi.remove(selectedPatient.id);
      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
      setSelectedPatientId(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Gagal menghapus data pasien');
    } finally {
      setDeleting(false);
    }
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
          <div className="stat-card male" onClick={() => handleSetFilter('laki-laki')}>
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
          <div className="stat-card female" onClick={() => handleSetFilter('perempuan')}>
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
          <div className="stat-card baby" onClick={() => handleSetFilter('bayi')}>
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
              <span className="sort-label">
                {loading ? 'Memuat…' : `${patients.length} Pasien ditemukan`}
              </span>
            </div>

            {loadError && (
              <div className="satusehat-empty">
                <span className="material-symbols-rounded">error</span>
                <div className="empty-title">Gagal memuat data</div>
                <div className="empty-sub">{loadError}</div>
              </div>
            )}

            <div className="patient-list">
              {patients
                .filter((p) => currentFilter === 'semua' || apiGenderToUi(p) === currentFilter)
                .map((patient) => {
                  const uiGender = apiGenderToUi(patient);
                  return (
                    <div
                      key={patient.id}
                      className={`patient-item ${patient.id === selectedPatientId ? 'selected' : ''}`}
                      onClick={() => handleSelectPatient(patient.id)}
                    >
                      <div className={`patient-avatar ${genderTagClass(uiGender)}`}>
                        {initialsFromName(patient.name)}
                      </div>
                      <div className="patient-info">
                        <div className="patient-name">{patient.name}</div>
                        <div className="patient-meta">
                          <span className={`tag ${genderTagClass(uiGender)}`}>
                            {genderLabel(uiGender)}
                          </span>
                          <span className="patient-rm">
                            · No.RM {patient.noRm} · {calcAge(patient.birthDate)} th
                          </span>
                        </div>
                      </div>
                      <div className="patient-status">
                        <div
                          className={`status-dot ${patient.syncStatus === 'failed' ? 'inactive' : ''}`}
                        />
                        <span className="material-symbols-rounded chevron-icon">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                  <div className="detail-avatar">{initialsFromName(selectedPatient.name)}</div>
                  <div className="detail-name-block">
                    <div className="detail-name">{selectedPatient.name}</div>
                    <div className="detail-rm">No. Rekam Medis: {selectedPatient.noRm}</div>
                    <div className="detail-tags">
                      <span className={`tag ${genderTagClass(apiGenderToUi(selectedPatient))}`}>
                        {genderLabel(apiGenderToUi(selectedPatient))}
                      </span>
                      <span
                        className={`tag ${selectedPatient.syncStatus === 'synced' ? 'active' : ''}`}
                      >
                        {selectedPatient.syncStatus === 'synced'
                          ? 'Tersinkron SatuSehat'
                          : selectedPatient.syncStatus === 'failed'
                            ? 'Sinkronisasi Gagal'
                            : 'Belum Disinkronkan'}
                      </span>
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button className="btn-outline" onClick={handleEditPatient}>
                      <span className="material-symbols-rounded">edit</span>
                      Edit
                    </button>
                    <button
                      className="btn-outline danger"
                      style={{ color: '#FF4D4F', borderColor: '#FFCCC7' }}
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <span className="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="info-cell">
                    <div className="info-label">Tanggal Lahir</div>
                    <div className="info-value">{formatDate(selectedPatient.birthDate)}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Usia</div>
                    <div className="info-value">
                      {calcAge(selectedPatient.birthDate)} tahun
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">No. Telepon</div>
                    <div className="info-value">{selectedPatient.phone || '—'}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">NIK</div>
                    <div className="info-value">
                      {selectedPatient.nik || selectedPatient.nikIbu || '—'}
                    </div>
                  </div>
                  <div className="info-cell" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Alamat</div>
                    <div className="info-value">
                      {[
                        selectedPatient.address,
                        selectedPatient.city,
                        selectedPatient.province,
                        selectedPatient.postalCode,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <span className="material-symbols-rounded">calendar_month</span>
                    Riwayat Kunjungan
                  </div>
                  {encountersLoading && <div className="empty-sub">Memuat riwayat kunjungan…</div>}
                  {!encountersLoading && encounters.length === 0 && (
                    <div className="empty-sub">Belum ada riwayat kunjungan.</div>
                  )}
                  {!encountersLoading &&
                    encounters.map((enc) => (
                      <div className="visit-item" key={enc.id}>
                        <div className="visit-dot" />
                        <div className="visit-info">
                          <div className="visit-type">{enc.serviceType}</div>
                          <div className="visit-date">
                            {formatDate(enc.arrivedTime)} ·{' '}
                            {ENCOUNTER_STATUS_LABEL[enc.status] ?? enc.status}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showDeleteConfirm && selectedPatient && (
        <div className="list-pasien-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-header-icon">
                  <span className="material-symbols-rounded">warning</span>
                </div>
                <div>
                  <h2>Hapus Pasien</h2>
                  <p>Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Tutup"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>
                Apakah Anda yakin ingin menghapus data pasien{' '}
                <strong>{selectedPatient.name}</strong> (No. RM {selectedPatient.noRm})? Data
                yang sudah dihapus tidak dapat dikembalikan.
              </p>
              {deleteError && (
                <div className="satusehat-empty">
                  <span className="material-symbols-rounded">error</span>
                  <div className="empty-title">Gagal menghapus</div>
                  <div className="empty-sub">{deleteError}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Batalkan
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#FF4D4F', borderColor: '#FF4D4F' }}
                onClick={handleDeletePatient}
                disabled={deleting}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  delete
                </span>
                {deleting ? 'Menghapus…' : 'Hapus Pasien'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ListPasienPage() {
  return (
    <Suspense fallback={<DashboardLayout><div>Loading...</div></DashboardLayout>}>
      <ListPasienContent />
    </Suspense>
  );
}
