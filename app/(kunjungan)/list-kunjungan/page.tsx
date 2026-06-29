'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  encounterApi,
  EncounterListItem,
  EncounterStatus,
  EncounterDetail,
} from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import '../../styles/kunjungan.css';

type FilterValue = 'semua' | EncounterStatus;

function statusTagClass(status: EncounterStatus) {
  if (status === 'arrived') return 'pending';
  if (status === 'in_progress') return 'pending';
  if (status === 'finished') return 'done';
  return 'cancel';
}

function statusLabel(status: EncounterStatus) {
  if (status === 'arrived') return 'Menunggu';
  if (status === 'in_progress') return 'Berlangsung';
  if (status === 'finished') return 'Selesai';
  return 'Batal';
}

function syncStatusLabel(status?: string) {
  if (status === 'synced') return 'Tersinkron ke Satu Sehat';
  if (status === 'failed') return 'Gagal sinkron Satu Sehat';
  return 'Belum sinkron Satu Sehat';
}

function initialsFromName(name?: string) {
  if (!name) return '?';
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

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return {
    date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function ListKunjunganPage() {
  return (
    <Suspense fallback={null}>
      <ListKunjunganPageInner />
    </Suspense>
  );
}

function ListKunjunganPageInner() {
  const router = useRouter();
  const [visits, setVisits] = useState<EncounterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await encounterApi.list();
      setVisits(res.data);
      setSelectedVisitId((prev) => prev ?? res.data[0]?.encounterId ?? null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat daftar kunjungan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (!selectedVisitId) {
      setDetail(null);
      return;
    }
    encounterApi
      .detail(selectedVisitId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedVisitId]);

  const filteredVisits = visits.filter((v) => {
    const matchStatus = currentFilter === 'semua' || v.status === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (v.patientName || '').toLowerCase().includes(q) ||
      (v.practitionerName || '').toLowerCase().includes(q) ||
      (v.chiefComplaint || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalCount = visits.length;
  const pendingCount = visits.filter((v) => v.status === 'arrived' || v.status === 'in_progress').length;
  const doneCount = visits.filter((v) => v.status === 'finished').length;
  const cancelCount = visits.filter((v) => v.status === 'cancelled').length;

  const selectedVisit = visits.find((v) => v.encounterId === selectedVisitId) ?? null;

  const handleSelectVisit = (id: number) => {
    setSelectedVisitId(id);
    setShowDetailOnMobile(true);
    setActionError(null);
  };

  const handleSetFilter = (filter: FilterValue) => {
    setCurrentFilter(filter);
  };

  const handleAddVisit = () => {
    router.push('/list-kunjungan/tambah');
  };

  const handleChangeStatus = async (status: EncounterStatus) => {
    if (!selectedVisitId) return;
    setActionError(null);

    let reason: string | undefined;
    if (status === 'cancelled') {
      reason = window.prompt('Alasan pembatalan?') || '';
      if (!reason.trim()) {
        setActionError('Alasan pembatalan wajib diisi');
        return;
      }
    }

    setActionLoading(true);
    try {
      await encounterApi.updateStatus(selectedVisitId, { status, reason });
      await loadVisits();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal memperbarui status kunjungan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncSatusehat = async () => {
    if (!selectedVisitId) return;
    setActionError(null);
    setSyncLoading(true);
    try {
      await encounterApi.syncToSatusehat(selectedVisitId);
      const refreshed = await encounterApi.detail(selectedVisitId);
      setDetail(refreshed);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal sinkron ke Satu Sehat');
    } finally {
      setSyncLoading(false);
    }
  };

  const arrivedDateTime = formatDateTime(selectedVisit?.arrivedTime);

  return (
    <DashboardLayout>
      <main className="content kunjungan-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Daftar Kunjungan</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola seluruh kunjungan pasien klinik Anda</p>
          </div>
          <button className="btn-primary" onClick={handleAddVisit}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              add
            </span>
            Buat Kunjungan
          </button>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total" onClick={() => handleSetFilter('semua')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                event_note
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Kunjungan</div>
            </div>
          </div>
          <div className="stat-card pending" onClick={() => handleSetFilter('arrived')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                schedule
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Menunggu / Berlangsung</div>
            </div>
          </div>
          <div className="stat-card done" onClick={() => handleSetFilter('finished')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{doneCount}</div>
              <div className="stat-label">Selesai</div>
            </div>
          </div>
          <div className="stat-card cancel" onClick={() => handleSetFilter('cancelled')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                cancel
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{cancelCount}</div>
              <div className="stat-label">Batal</div>
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
                  placeholder="Cari pasien, dokter, keluhan…"
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
                  className={`filter-tab ${currentFilter === 'arrived' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('arrived')}
                >
                  Menunggu
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'in_progress' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('in_progress')}
                >
                  Berlangsung
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'finished' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('finished')}
                >
                  Selesai
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'cancelled' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('cancelled')}
                >
                  Batal
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">
                {loading ? 'Memuat…' : `${filteredVisits.length} Kunjungan ditemukan`}
              </span>
            </div>

            {loadError ? (
              <div style={{ padding: '16px', color: '#FF4D4F' }}>{loadError}</div>
            ) : (
              <div className="visit-list">
                {filteredVisits.map((visit) => {
                  const dt = formatDateTime(visit.arrivedTime);
                  return (
                    <div
                      key={visit.encounterId}
                      className={`visit-row-item ${visit.encounterId === selectedVisitId ? 'selected' : ''}`}
                      onClick={() => handleSelectVisit(visit.encounterId)}
                    >
                      <div className="visit-avatar">{initialsFromName(visit.patientName)}</div>
                      <div className="visit-row-info">
                        <div className="visit-row-name">{visit.patientName || `Pasien #${visit.patientId}`}</div>
                        <div className="visit-row-meta">
                          <span className={`tag ${statusTagClass(visit.status)}`}>{statusLabel(visit.status)}</span>
                          <span className="visit-row-sub">
                            · {visit.practitionerName || '—'} ·{' '}
                            {typeof dt === 'string' ? dt : `${dt.date} ${dt.time}`}
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-rounded chevron-icon">chevron_right</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className={`detail-panel ${showDetailOnMobile ? 'show' : ''}`}>
            {!selectedVisit ? (
              <div className="detail-empty">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">event_busy</span>
                </div>
                <div className="empty-title">Belum ada kunjungan dipilih</div>
                <div className="empty-sub">
                  Pilih salah satu kunjungan dari daftar untuk melihat detail informasi
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                <div className="detail-header">
                  <div className="detail-avatar">{initialsFromName(selectedVisit.patientName)}</div>
                  <div className="detail-name-block">
                    <div className="detail-name">{selectedVisit.patientName || `Pasien #${selectedVisit.patientId}`}</div>
                    <div className="detail-rm">{selectedVisit.noRM || '—'}</div>
                    <div className="detail-tags">
                      <span className={`tag ${statusTagClass(selectedVisit.status)}`}>
                        {statusLabel(selectedVisit.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-info-grid">
                  <div className="info-cell">
                    <div className="info-label">Tanggal</div>
                    <div className="info-value">{typeof arrivedDateTime === 'string' ? arrivedDateTime : arrivedDateTime.date}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Jam</div>
                    <div className="info-value">{typeof arrivedDateTime === 'string' ? '—' : arrivedDateTime.time}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Dokter</div>
                    <div className="info-value">{selectedVisit.practitionerName || detail?.practitioner?.name || '—'}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Lokasi</div>
                    <div className="info-value">{detail?.location?.name || '—'}</div>
                  </div>
                  <div className="info-cell" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Keluhan Utama</div>
                    <div className="info-value">{selectedVisit.chiefComplaint || '—'}</div>
                  </div>
                  <div className="info-cell" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Status Satu Sehat</div>
                    <div className="info-value">{syncStatusLabel(detail?.syncStatus)}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <div className="section-title">
                    <span className="material-symbols-rounded">bolt</span>
                    Ubah Status
                  </div>
                  <div className="quick-actions">
                    {selectedVisit.status === 'arrived' && (
                      <button
                        className="btn-outline"
                        style={{ fontSize: '12.5px' }}
                        disabled={actionLoading}
                        onClick={() => handleChangeStatus('in_progress')}
                      >
                        Mulai Periksa
                      </button>
                    )}
                    {selectedVisit.status === 'in_progress' && (
                      <button
                        className="btn-outline"
                        style={{ fontSize: '12.5px' }}
                        disabled={actionLoading}
                        onClick={() => handleChangeStatus('finished')}
                      >
                        Selesaikan Kunjungan
                      </button>
                    )}
                    {(selectedVisit.status === 'arrived' || selectedVisit.status === 'in_progress') && (
                      <button
                        className="btn-outline danger"
                        style={{ fontSize: '12.5px', color: '#FF4D4F', borderColor: '#FFCCC7' }}
                        disabled={actionLoading}
                        onClick={() => handleChangeStatus('cancelled')}
                      >
                        Batalkan
                      </button>
                    )}
                    {selectedVisit.status === 'finished' && (
                      <button
                        className="btn-outline"
                        style={{ fontSize: '12.5px' }}
                        onClick={() => router.push(`/transaksi?encounterId=${selectedVisit.encounterId}`)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          receipt
                        </span>
                        Buat Tagihan
                      </button>
                    )}
                    {selectedVisit.status === 'finished' && detail?.syncStatus !== 'synced' && (
                      <button
                        className="btn-outline"
                        style={{ fontSize: '12.5px' }}
                        disabled={syncLoading}
                        onClick={handleSyncSatusehat}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          sync
                        </span>
                        {syncLoading ? 'Mensinkronkan…' : 'Sync ke Satu Sehat'}
                      </button>
                    )}
                  </div>
                  {actionError && (
                    <div style={{ color: '#FF4D4F', fontSize: '13px', marginTop: '8px' }}>{actionError}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
