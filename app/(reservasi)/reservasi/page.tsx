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
import { reservationsApi, ReservationItem, ReservationStatus } from '@/lib/reservations';
import { encounterApi } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../styles/reservasi.css';

type FilterValue = 'semua' | ReservationStatus;

function statusLabel(status: ReservationStatus) {
  if (status === 'pending') return 'Menunggu Konfirmasi';
  if (status === 'confirmed') return 'Terkonfirmasi';
  if (status === 'completed') return 'Selesai';
  return 'Dibatalkan';
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type QuickFilter = 'none' | 'today' | 'upcoming';

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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('none');
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
        date: quickFilter === 'today' ? todayStr() : dateFilter || undefined,
        dateFrom: quickFilter === 'upcoming' ? todayStr() : undefined,
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
  }, [dateFilter, currentFilter, searchQuery, quickFilter]);

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
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menghapus reservasi');
    } finally {
      setActionLoadingId(null);
      setPendingDeleteId(null);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="reservasi">
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

        {pageView === 'calendar' ? (
          <div className="panel">
            <ReservationCalendar
              onSelectReservation={(r) => {
                setPageView('list');
                setQuickFilter('none');
                setDateFilter(r.reservationDate.slice(0, 10));
                setSearchQuery(r.patientName);
              }}
              onSelectDate={(dateIso) => {
                setPageView('list');
                setQuickFilter('none');
                setDateFilter(dateIso);
                setSearchQuery('');
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
              <div className="date-filter">
                <input
                  type="date"
                  value={dateFilter}
                  disabled={quickFilter !== 'none'}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && quickFilter === 'none' && (
                  <button className="date-filter-clear" onClick={() => setDateFilter('')}>
                    Semua Tanggal
                  </button>
                )}
              </div>
            </div>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${quickFilter === 'today' ? 'active' : ''}`}
                onClick={() => setQuickFilter(quickFilter === 'today' ? 'none' : 'today')}
              >
                Hari Ini
              </button>
              <button
                className={`filter-tab ${quickFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setQuickFilter(quickFilter === 'upcoming' ? 'none' : 'upcoming')}
              >
                Kedepannya
              </button>
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
