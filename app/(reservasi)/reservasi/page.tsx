'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import InputModal from '@/components/feedback/InputModal';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import AddReservationModal from './AddReservationModal';
import EditReservationModal from './EditReservationModal';
import ReservationCard from './ReservationCard';
import ReservationCalendar from '@/components/reservasi/ReservationCalendar';
import { reservationsApi, ReservationItem, ReservationQuery, ReservationStatus } from '@/lib/reservations';
import { encounterApi } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../styles/reservasi.css';

type FilterValue = 'semua' | ReservationStatus;
type DateScope = 'all' | 'today' | 'upcoming' | 'custom';

function statusLabel(status: ReservationStatus) {
  if (status === 'pending') return 'Menunggu Konfirmasi';
  if (status === 'confirmed') return 'Terkonfirmasi';
  if (status === 'completed') return 'Selesai';
  return 'Dibatalkan';
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return isoDate(new Date());
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}

/** Turns the current date-scope selection into the date param(s) the API expects. */
function dateScopeQuery(scope: DateScope, customDate: string): Pick<ReservationQuery, 'date' | 'dateFrom'> {
  switch (scope) {
    case 'today':
      return { date: todayStr() };
    case 'upcoming':
      return { dateFrom: tomorrowStr() };
    case 'custom':
      return customDate ? { date: customDate } : {};
    default:
      return {};
  }
}

interface ReservationStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
}

const EMPTY_STATS: ReservationStats = { total: 0, pending: 0, confirmed: 0, completed: 0 };

export default function ReservasiPage() {
  return (
    <Suspense fallback={null}>
      <ReservasiPageInner />
    </Suspense>
  );
}

function ReservasiPageInner() {
  const router = useRouter();
  const { error: showError } = useToast();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateScope, setDateScope] = useState<DateScope>('all');
  const [customDate, setCustomDate] = useState('');
  const [stats, setStats] = useState<ReservationStats>(EMPTY_STATS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationItem | null>(null);
  const [pageView, setPageView] = useState<'list' | 'calendar'>('list');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [pendingCancellationId, setPendingCancellationId] = useState<number | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await reservationsApi.list({
        ...dateScopeQuery(dateScope, customDate),
        status: currentFilter === 'semua' ? undefined : currentFilter,
        search: searchQuery || undefined,
        limit: 100,
      });
      setReservations(res.data);
      setListTotal(res.meta.total);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat reservasi');
    } finally {
      setLoading(false);
    }
  }, [dateScope, customDate, currentFilter, searchQuery]);

  // Stat cards are a clinic-wide overview ("berapa total, berapa yang masih
  // menunggu, dst"), independent from whatever the list below is filtered to
  // — otherwise narrowing the list to one date/search makes the cards read
  // as "0" and look broken even though nothing is wrong.
  const loadStats = useCallback(async () => {
    try {
      const [all, pending, confirmed, completed] = await Promise.all([
        reservationsApi.list({ limit: 1 }),
        reservationsApi.list({ limit: 1, status: 'pending' }),
        reservationsApi.list({ limit: 1, status: 'confirmed' }),
        reservationsApi.list({ limit: 1, status: 'completed' }),
      ]);
      setStats({
        total: all.meta.total,
        pending: pending.meta.total,
        confirmed: confirmed.meta.total,
        completed: completed.meta.total,
      });
    } catch {
      // Non-critical overview numbers; keep whatever was last loaded.
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleCreated = () => {
    setShowAddModal(false);
    loadReservations();
    loadStats();
  };

  const handleRescheduled = () => {
    setEditingReservation(null);
    loadReservations();
  };

  const handleConfirm = async (id: number) => {
    setActionLoadingId(id);
    setActionError(null);
    try {
      await reservationsApi.updateStatus(id, { status: 'confirmed' });
      await loadReservations();
      loadStats();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengkonfirmasi reservasi');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCheckIn = async (r: ReservationItem) => {
    if (!r.patientId) {
      const params = new URLSearchParams({
        reservationId: r.id.toString(),
        nama: r.patientName,
        telp: r.patientPhone,
      });
      if (r.patientNik) params.set('nik', r.patientNik);
      router.push(`/list-pasien/tambah?${params.toString()}`);
      return;
    }
    if (!r.practitionerId) {
      const msg = 'Dokter belum ditentukan untuk reservasi ini. Buat kunjungan manual dari menu Kunjungan lalu pilih reservasi ini.';
      setActionError(msg);
      showError(msg);
      return;
    }
    setActionLoadingId(r.id);
    setActionError(null);
    try {
      const encounter = await encounterApi.create({
        patientId: r.patientId,
        practitionerId: r.practitionerId,
        reservationId: r.id,
        chiefComplaint: r.notes || undefined,
      });
      await loadReservations();
      router.push(`/list-kunjungan?encounterId=${encounter.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal check-in reservasi';
      setActionError(msg);
      showError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = (id: number) => {
    setPendingCancellationId(id);
    setShowCancellationModal(true);
  };

  const performCancel = async (reason: string) => {
    if (!pendingCancellationId) return;
    setShowCancellationModal(false);
    setActionLoadingId(pendingCancellationId);
    setActionError(null);
    try {
      await reservationsApi.updateStatus(pendingCancellationId, {
        status: 'cancelled',
        cancelledReason: reason || undefined,
      });
      await loadReservations();
      loadStats();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal membatalkan reservasi');
    } finally {
      setActionLoadingId(null);
      setPendingCancellationId(null);
    }
  };

  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
    setShowDeleteConfirmation(true);
  };

  const performDelete = async () => {
    if (!pendingDeleteId) return;
    setShowDeleteConfirmation(false);
    setActionLoadingId(pendingDeleteId);
    setActionError(null);
    try {
      await reservationsApi.remove(pendingDeleteId);
      await loadReservations();
      loadStats();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menghapus reservasi');
    } finally {
      setActionLoadingId(null);
      setPendingDeleteId(null);
    }
  };

  const selectDateScope = (scope: DateScope) => {
    setDateScope(scope);
    setCustomDate('');
  };

  const goToDate = (dateIso: string) => {
    setPageView('list');
    setCustomDate(dateIso);
    setDateScope('custom');
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="reservasi">
      <main className="content reservasi-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Reservasi</h1>
              <span className="badge-count">{listTotal}</span>
            </div>
            <p className="page-subtitle">
              Kelola reservasi janji temu pasien, termasuk yang dibuat lewat website klinik Anda
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${pageView === 'list' ? 'active' : ''}`}
                onClick={() => setPageView('list')}
              >
                Daftar
              </button>
              <button
                className={`filter-tab ${pageView === 'calendar' ? 'active' : ''}`}
                onClick={() => setPageView('calendar')}
              >
                Kalender
              </button>
            </div>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                add
              </span>
              Tambah Reservasi
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card total" onClick={() => setCurrentFilter('semua')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                event
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{stats.total}</div>
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
              <div className="stat-value">{stats.pending}</div>
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
              <div className="stat-value">{stats.confirmed}</div>
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
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Selesai</div>
            </div>
          </div>
        </div>

        {pageView === 'calendar' ? (
          <div className="panel">
            <ReservationCalendar
              onSelectReservation={(r) => {
                setPageView('list');
                setSearchQuery(r.patientName);
                setCustomDate(r.reservationDate.slice(0, 10));
                setDateScope('custom');
              }}
              onSelectDate={(dateIso) => {
                setSearchQuery('');
                goToDate(dateIso);
              }}
            />
          </div>
        ) : (
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
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Rentang Waktu</span>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${dateScope === 'all' ? 'active' : ''}`}
                  onClick={() => selectDateScope('all')}
                >
                  Semua Tanggal
                </button>
                <button
                  className={`filter-tab ${dateScope === 'today' ? 'active' : ''}`}
                  onClick={() => selectDateScope('today')}
                >
                  Hari Ini
                </button>
                <button
                  className={`filter-tab ${dateScope === 'upcoming' ? 'active' : ''}`}
                  onClick={() => selectDateScope('upcoming')}
                >
                  Kedepannya
                </button>
                <label className={`date-pick ${dateScope === 'custom' ? 'active' : ''}`}>
                  <span className="material-symbols-rounded">calendar_month</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateScope('custom');
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-group-label">Status</span>
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
            <div className="reservation-card-grid">
              {reservations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0AEC0' }}>
                  Tidak ada reservasi
                </div>
              ) : (
                reservations.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    busy={actionLoadingId === r.id}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    onCheckIn={handleCheckIn}
                    onDelete={handleDelete}
                    onEdit={setEditingReservation}
                  />
                ))
              )}
            </div>
          )}
        </div>
        )}
      </main>

      {showAddModal && (
        <AddReservationModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}

      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onUpdated={handleRescheduled}
        />
      )}

      <InputModal
        isOpen={showCancellationModal}
        title="Batalkan Reservasi"
        message="Alasan pembatalan (opsional)"
        placeholder="Masukkan alasan pembatalan..."
        confirmLabel="Batalkan"
        onConfirm={performCancel}
        onCancel={() => setShowCancellationModal(false)}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        title="Hapus Reservasi"
        message="Hapus reservasi ini secara permanen? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous={true}
        onConfirm={performDelete}
        onCancel={() => setShowDeleteConfirmation(false)}
      />
      </FeatureGuard>
    </DashboardLayout>
  );
}
