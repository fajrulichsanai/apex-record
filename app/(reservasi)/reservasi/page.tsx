'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AddReservationModal from './AddReservationModal';
import { reservationsApi, ReservationItem, ReservationStatus } from '@/lib/reservations';
import { ApiError } from '@/lib/api-client';
import '../../styles/reservasi.css';

type FilterValue = 'semua' | ReservationStatus;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function statusLabel(status: ReservationStatus) {
  if (status === 'pending') return 'Menunggu Konfirmasi';
  if (status === 'confirmed') return 'Terkonfirmasi';
  if (status === 'completed') return 'Selesai';
  return 'Dibatalkan';
}

function sourceLabel(source: string) {
  if (source === 'website') return 'Website';
  if (source === 'phone') return 'Telepon';
  return 'Dashboard';
}

export default function ReservasiPage() {
  return (
    <Suspense fallback={null}>
      <ReservasiPageInner />
    </Suspense>
  );
}

function ReservasiPageInner() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await reservationsApi.list({
        date: dateFilter || undefined,
        status: currentFilter === 'semua' ? undefined : currentFilter,
        search: searchQuery || undefined,
        limit: 100,
      });
      setReservations(res.data);
      setTotal(res.meta.total);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat reservasi');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, currentFilter, searchQuery]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const completedCount = reservations.filter((r) => r.status === 'completed').length;

  const handleCreated = () => {
    setShowAddModal(false);
    loadReservations();
  };

  const handleConfirm = async (id: number) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reservationsApi.updateStatus(id, { status: 'confirmed' });
      await loadReservations();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengkonfirmasi reservasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reservationsApi.updateStatus(id, { status: 'completed' });
      await loadReservations();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menyelesaikan reservasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    const reason = window.prompt('Alasan pembatalan (opsional):') || undefined;
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reservationsApi.updateStatus(id, { status: 'cancelled', cancelledReason: reason });
      await loadReservations();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal membatalkan reservasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus reservasi ini secara permanen?')) return;
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reservationsApi.remove(id);
      await loadReservations();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menghapus reservasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <DashboardLayout>
      <main className="content reservasi-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Reservasi</h1>
              <span className="badge-count">{total}</span>
            </div>
            <p className="page-subtitle">
              Kelola reservasi janji temu pasien, termasuk yang dibuat lewat website klinik Anda
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
              add
            </span>
            Tambah Reservasi
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-card total" onClick={() => setCurrentFilter('semua')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                event
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{total}</div>
              <div className="stat-label">Total Reservasi</div>
            </div>
          </div>
          <div className="stat-card pending" onClick={() => setCurrentFilter('pending')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                schedule
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Menunggu Konfirmasi</div>
            </div>
          </div>
          <div className="stat-card confirmed" onClick={() => setCurrentFilter('confirmed')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{confirmedCount}</div>
              <div className="stat-label">Terkonfirmasi</div>
            </div>
          </div>
          <div className="stat-card done" onClick={() => setCurrentFilter('completed')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Selesai</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari nama atau nomor telepon pasien…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="date-filter">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && (
                  <button className="date-filter-clear" onClick={() => setDateFilter('')}>
                    Semua Tanggal
                  </button>
                )}
              </div>
            </div>
            <div className="filter-tabs">
              {(['semua', 'pending', 'confirmed', 'completed', 'cancelled'] as FilterValue[]).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${currentFilter === f ? 'active' : ''}`}
                  onClick={() => setCurrentFilter(f)}
                >
                  {f === 'semua' ? 'Semua' : statusLabel(f)}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">
              {loading ? 'Memuat…' : `${reservations.length} reservasi ditemukan`}
            </span>
            {actionError && <span style={{ color: '#FF4D4F', fontSize: '12px' }}>{actionError}</span>}
          </div>

          {loadError ? (
            <div style={{ padding: '16px', color: '#FF4D4F' }}>{loadError}</div>
          ) : (
            <div className="reservation-list">
              {reservations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0AEC0' }}>
                  Tidak ada reservasi
                </div>
              ) : (
                reservations.map((r) => {
                  const date = new Date(r.reservationDate);
                  const busy = actionLoadingId === r.id;
                  return (
                    <div key={r.id} className="reservation-row-item">
                      <div className="reservation-date-block">
                        <div className="reservation-date-day">{date.getDate()}</div>
                        <div className="reservation-date-month">{MONTHS[date.getMonth()]}</div>
                        {r.jamSlot && <div className="reservation-time">{r.jamSlot.slice(0, 5)}</div>}
                      </div>
                      <div className="reservation-info">
                        <div className="reservation-patient-name">{r.patientName}</div>
                        <div className="reservation-meta">
                          {r.patientPhone && <span>{r.patientPhone}</span>}
                          {r.practitioner?.name && <span>· {r.practitioner.name}</span>}
                          {r.notes && <span>· {r.notes}</span>}
                        </div>
                      </div>
                      <div className="reservation-tags">
                        <span className="reservation-source-tag">{sourceLabel(r.source)}</span>
                        <span className={`reservation-status-tag ${r.status}`}>{statusLabel(r.status)}</span>
                      </div>
                      <div className="reservation-actions">
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="btn-row-action confirm"
                              disabled={busy}
                              onClick={() => handleConfirm(r.id)}
                            >
                              <span className="material-symbols-rounded">check</span>
                              Konfirmasi
                            </button>
                            <button
                              className="btn-row-action cancel"
                              disabled={busy}
                              onClick={() => handleCancel(r.id)}
                            >
                              <span className="material-symbols-rounded">close</span>
                              Tolak
                            </button>
                          </>
                        )}
                        {r.status === 'confirmed' && (
                          <>
                            <button
                              className="btn-row-action complete"
                              disabled={busy}
                              onClick={() => handleComplete(r.id)}
                            >
                              <span className="material-symbols-rounded">task_alt</span>
                              Selesai
                            </button>
                            <button
                              className="btn-row-action cancel"
                              disabled={busy}
                              onClick={() => handleCancel(r.id)}
                            >
                              <span className="material-symbols-rounded">close</span>
                              Batalkan
                            </button>
                          </>
                        )}
                        <button
                          className="btn-row-action delete"
                          disabled={busy}
                          onClick={() => handleDelete(r.id)}
                          aria-label="Hapus reservasi"
                          title="Hapus reservasi"
                        >
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddReservationModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
    </DashboardLayout>
  );
}
