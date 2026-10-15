'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { patientsApi, Patient, Encounter, PatientQuery, PatientStats, TimelineItem } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';
import { pressable, useEscapeKey } from '@/lib/a11y';
import '../../styles/list-pasien.css';

type UiGender = 'laki-laki' | 'perempuan' | 'bayi';
type FilterValue = 'semua' | UiGender;

function apiGenderToUi(patient: Patient): UiGender {
  if (!patient.nik && patient.nikIbu) return 'bayi';
  return patient.gender === 'male' ? 'laki-laki' : 'perempuan';
}

// Must mirror apiGenderToUi: laki-laki/perempuan exclude babies, who get
// their own tab. The server applies the same rule (kategori=bayi|umum).
function filterToQuery(filter: FilterValue): PatientQuery {
  if (filter === 'laki-laki') return { gender: 'male', kategori: 'umum' };
  if (filter === 'perempuan') return { gender: 'female', kategori: 'umum' };
  if (filter === 'bayi') return { kategori: 'bayi' };
  return {};
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function formatCount(n: number | undefined) {
  return n === undefined ? '—' : n.toLocaleString('id-ID');
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

const TIMELINE_TYPE_META: Record<
  TimelineItem['type'],
  { label: string; icon: string; dot: string }
> = {
  kunjungan: { label: 'Kunjungan', icon: 'calendar_month', dot: 'var(--info)' },
  billing: { label: 'Invoice', icon: 'receipt_long', dot: 'var(--accent)' },
  foto: { label: 'Foto Klinis', icon: 'photo_camera', dot: 'var(--orange)' },
  treatment_plan: { label: 'Treatment Plan', icon: 'timeline', dot: 'var(--violet)' },
  recall: { label: 'Recall', icon: 'event_repeat', dot: '#FF6B9D' },
};

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ListPasienContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // The selected patient is kept as an object (not looked up in `patients`)
  // so the detail panel survives filtering/searching and can show a patient
  // opened via ?patientId that is not on the loaded pages.
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const selectedPatientId = selectedPatient?.id ?? null;
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  useEscapeKey(() => setShowDeleteConfirm(false), showDeleteConfirm);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);


  const [detailTab, setDetailTab] = useState<'ringkasan' | 'timeline'>('ringkasan');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const detailPanelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Bumped on every new search/filter so responses for an older query are
  // dropped instead of overwriting (or being appended to) the current list.
  const querySeq = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const buildQuery = useCallback(
    (pageNum: number): PatientQuery => ({
      ...filterToQuery(currentFilter),
      search: searchQuery || undefined,
      page: pageNum,
      limit: PAGE_SIZE,
    }),
    [currentFilter, searchQuery],
  );

  const loadFirstPage = useCallback(async () => {
    const seq = ++querySeq.current;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadError(null);
    setLoadMoreError(null);
    setLoadingMore(false);
    try {
      const res = await patientsApi.listPage(buildQuery(1));
      if (seq !== querySeq.current) return;
      setPatients(res.data);
      setTotal(res.meta.total);
      setPage(1);
      setHasMore(res.meta.page < res.meta.totalPages);
      setSelectedPatient((prev) => prev ?? res.data[0] ?? null);
      listRef.current?.scrollTo({ top: 0 });
    } catch (err) {
      if (seq !== querySeq.current) return;
      setPatients([]);
      setTotal(0);
      setHasMore(false);
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data pasien');
    } finally {
      if (seq === querySeq.current) setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loading || !hasMore) return;
    const seq = querySeq.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await patientsApi.listPage(buildQuery(page + 1));
      if (seq !== querySeq.current) return;
      // A patient added meanwhile shifts the offsets by one, so the next page
      // can repeat the last row of the previous one — skip what we already have.
      setPatients((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.data.filter((p) => !seen.has(p.id))];
      });
      setTotal(res.meta.total);
      setPage(res.meta.page);
      setHasMore(res.meta.page < res.meta.totalPages && res.data.length > 0);
    } catch (err) {
      if (seq !== querySeq.current) return;
      setLoadMoreError(err instanceof ApiError ? err.message : 'Gagal memuat pasien berikutnya');
    } finally {
      if (seq === querySeq.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [buildQuery, hasMore, loading, page]);

  // Infinite scroll: load the next page as the end of the list comes into
  // view. Re-created after every page, so a list still shorter than the panel
  // keeps loading until it fills it. Stops on error until the user retries.
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loading || loadMoreError || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { root: listRef.current, rootMargin: '0px 0px 240px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMoreError, loadMore]);

  // Counts come from the server so they cover every patient, not just the
  // pages loaded so far. They follow the search box like the list does.
  useEffect(() => {
    let active = true;
    patientsApi
      .stats(searchQuery)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {
        if (active) setStats(null);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, statsVersion]);

  // ?patientId=… (links from kunjungan, reservasi, etc.) opens that patient
  // even when it is far down the list.
  const linkedPatientId = Number(searchParams.get('patientId')) || null;
  useEffect(() => {
    if (!linkedPatientId) return;
    let active = true;
    patientsApi
      .get(linkedPatientId)
      .then((p) => {
        if (active) setSelectedPatient(p);
      })
      .catch(() => {
        /* not found / no access — keep the default selection */
      });
    return () => {
      active = false;
    };
  }, [linkedPatientId]);

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

  useEffect(() => {
    if (!selectedPatient || detailTab !== 'timeline') return;
    let active = true;
    setTimelineLoading(true);
    patientsApi
      .getTimeline(selectedPatient.id)
      .then((data) => {
        if (active) setTimeline(data);
      })
      .catch(() => {
        if (active) setTimeline([]);
      })
      .finally(() => {
        if (active) setTimelineLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedPatient, detailTab]);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetailOnMobile(true);
    setDetailTab('ringkasan');
  };

  useEffect(() => {
    if (showDetailOnMobile && window.innerWidth <= 900) {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedPatientId, showDetailOnMobile]);

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
      const wasListed = patients.some((p) => p.id === selectedPatient.id);
      setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
      if (wasListed) setTotal((t) => Math.max(0, t - 1));
      setStatsVersion((v) => v + 1);
      setSelectedPatient(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Gagal menghapus data pasien');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="pasien">
      <main className="content list-pasien-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Daftar Pasien</h1>
              <span className="badge-count">{formatCount(stats?.total)}</span>
            </div>
            <p className="page-subtitle">Kelola seluruh data pasien klinik Anda</p>
          </div>
          <button className="btn-primary" onClick={handleAddPatient}>
            <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              add
            </span>
            Tambah Pasien
          </button>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total" {...pressable(() => handleSetFilter('semua'))}>
            <div className="stat-icon">
              <span aria-hidden="true"
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                group
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatCount(stats?.total)}</div>
              <div className="stat-label">Total Pasien</div>
            </div>
          </div>
          <div className="stat-card male" {...pressable(() => handleSetFilter('laki-laki'))}>
            <div className="stat-icon">
              <span aria-hidden="true"
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                man
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatCount(stats?.male)}</div>
              <div className="stat-label">Laki-laki</div>
            </div>
          </div>
          <div className="stat-card female" {...pressable(() => handleSetFilter('perempuan'))}>
            <div className="stat-icon">
              <span aria-hidden="true"
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                woman
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatCount(stats?.female)}</div>
              <div className="stat-label">Perempuan</div>
            </div>
          </div>
          <div className="stat-card baby" {...pressable(() => handleSetFilter('bayi'))}>
            <div className="stat-icon">
              <span aria-hidden="true"
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                child_care
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatCount(stats?.baby)}</div>
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
                <span aria-hidden="true" className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari nama, No. RM, NIK…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Cari pasien"
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
              <span className="sort-label" aria-live="polite">
                {loading
                  ? 'Memuat…'
                  : `${total.toLocaleString('id-ID')} pasien ditemukan`}
              </span>
              {!loading && total > patients.length && (
                <span className="sort-label">
                  Menampilkan {patients.length.toLocaleString('id-ID')}
                </span>
              )}
            </div>

            {loadError && (
              <div className="satusehat-empty">
                <span aria-hidden="true" className="material-symbols-rounded">error</span>
                <div className="empty-title">Gagal memuat data</div>
                <div className="empty-sub">{loadError}</div>
              </div>
            )}

            <div
              ref={listRef}
              className={`patient-list ${loading && patients.length > 0 ? 'is-refreshing' : ''}`}
              aria-busy={loading || loadingMore}
            >
              {!loading && !loadError && patients.length === 0 && (
                <div className="list-empty">
                  <span aria-hidden="true" className="material-symbols-rounded">person_off</span>
                  <div className="empty-title">
                    {searchQuery ? 'Pasien tidak ditemukan' : 'Belum ada pasien'}
                  </div>
                  <div className="empty-sub">
                    {searchQuery
                      ? 'Coba kata kunci lain: nama, No. RM, atau NIK lengkap.'
                      : 'Pasien yang didaftarkan akan muncul di sini.'}
                  </div>
                </div>
              )}
              {patients.map((patient) => {
                  const uiGender = apiGenderToUi(patient);
                  return (
                    <div
                      key={patient.id}
                      className={`patient-item ${patient.id === selectedPatientId ? 'selected' : ''}`}
                      {...pressable(() => handleSelectPatient(patient))}
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
                        <span aria-hidden="true" className="material-symbols-rounded chevron-icon">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              {patients.length > 0 && (
                <div ref={sentinelRef} className="list-footer">
                  {loadingMore ? (
                    <span className="list-footer-note">
                      <span aria-hidden="true" className="list-spinner" />
                      Memuat pasien berikutnya…
                    </span>
                  ) : loadMoreError ? (
                    <>
                      <span className="list-footer-note error">{loadMoreError}</span>
                      <button type="button" className="list-more-btn" onClick={() => void loadMore()}>
                        Coba lagi
                      </button>
                    </>
                  ) : hasMore ? (
                    <button type="button" className="list-more-btn" onClick={() => void loadMore()}>
                      Muat lebih banyak
                    </button>
                  ) : (
                    patients.length > PAGE_SIZE && (
                      <span className="list-footer-note">
                        Semua {total.toLocaleString('id-ID')} pasien sudah ditampilkan
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div ref={detailPanelRef} className={`detail-panel ${showDetailOnMobile ? 'show' : ''}`}>
            {!selectedPatient ? (
              <div className="detail-empty">
                <div className="empty-icon-wrap">
                  <span aria-hidden="true" className="material-symbols-rounded">person_search</span>
                </div>
                <div className="empty-title">Belum ada pasien dipilih</div>
                <div className="empty-sub">
                  Pilih salah satu pasien dari daftar untuk melihat detail informasi
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                <div className="detail-header">
                  <div className={`detail-avatar ${genderTagClass(apiGenderToUi(selectedPatient))}`}>
                    {initialsFromName(selectedPatient.name)}
                  </div>
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
                    <button
                      className="btn-outline"
                      onClick={() => router.push(`/list-pasien/${selectedPatient.id}/rekam-medis`)}
                    >
                      <span aria-hidden="true" className="material-symbols-rounded">folder_shared</span>
                      Rekam Medis
                    </button>
                    <button className="btn-outline" onClick={handleEditPatient}>
                      <span aria-hidden="true" className="material-symbols-rounded">edit</span>
                      Edit
                    </button>
                    <button aria-label="Hapus pasien"
                      className="btn-outline danger"
                      style={{ color: 'var(--red)', borderColor: 'rgba(193,56,31,.35)' }}
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <span aria-hidden="true" className="material-symbols-rounded">delete</span>
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

                <div className="detail-tabs">
                  <button
                    type="button"
                    className={`filter-tab ${detailTab === 'ringkasan' ? 'active' : ''}`}
                    onClick={() => setDetailTab('ringkasan')}
                  >
                    Ringkasan
                  </button>
                  <button
                    type="button"
                    className={`filter-tab ${detailTab === 'timeline' ? 'active' : ''}`}
                    onClick={() => setDetailTab('timeline')}
                  >
                    Timeline Aktivitas
                  </button>
                </div>

                {detailTab === 'ringkasan' && (
                  <>
                    <div className="detail-section">
                      <div className="section-title">
                        <span aria-hidden="true" className="material-symbols-rounded">calendar_month</span>
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
                  </>
                )}

                {detailTab === 'timeline' && (
                  <div className="detail-section">
                    <div className="section-title">
                      <span aria-hidden="true" className="material-symbols-rounded">history</span>
                      Timeline Aktivitas Pasien
                    </div>
                    {timelineLoading && <div className="empty-sub">Memuat timeline aktivitas…</div>}
                    {!timelineLoading && timeline.length === 0 && (
                      <div className="empty-sub">Belum ada aktivitas tercatat.</div>
                    )}
                    {!timelineLoading &&
                      timeline.map((item, idx) => {
                        const meta = TIMELINE_TYPE_META[item.type];
                        return (
                          <div className="visit-item" key={`${item.type}-${idx}`}>
                            <div className="visit-dot" style={{ background: meta.dot }} />
                            <div className="visit-info">
                              <div className="visit-type" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span aria-hidden="true"
                                  className="material-symbols-rounded"
                                  style={{ fontSize: '14px', color: meta.dot }}
                                >
                                  {meta.icon}
                                </span>
                                {item.title}
                              </div>
                              <div className="visit-date">
                                {formatDateTime(item.date)}
                                {item.subtitle ? ` · ${item.subtitle}` : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
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
                  <span aria-hidden="true" className="material-symbols-rounded">warning</span>
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
                <span aria-hidden="true" className="material-symbols-rounded">close</span>
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
                  <span aria-hidden="true" className="material-symbols-rounded">error</span>
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
                style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={handleDeletePatient}
                disabled={deleting}
              >
                <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  delete
                </span>
                {deleting ? 'Menghapus…' : 'Hapus Pasien'}
              </button>
            </div>
          </div>
        </div>
      )}
      </FeatureGuard>
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
