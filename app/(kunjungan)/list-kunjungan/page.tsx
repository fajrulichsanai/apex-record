'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AddVisitModal, { NewVisitInput } from './AddVisitModal';
import '../../styles/kunjungan.css';

type VisitStatus = 'menunggu' | 'selesai' | 'batal';
type FilterValue = 'semua' | VisitStatus;

interface Visit {
  id: number;
  patientName: string;
  avatarInitials: string;
  doctor: string;
  visitType: string;
  date: string;
  time: string;
  status: VisitStatus;
  price: number;
  notes: string;
}

const VISITS: Visit[] = [
  {
    id: 1,
    patientName: 'Mu** Da** Sa**',
    avatarInitials: 'MD',
    doctor: 'drg. Rina Susanti',
    visitType: 'Pembersihan Karang Gigi',
    date: '2026-06-21',
    time: '09:00',
    status: 'menunggu',
    price: 150000,
    notes: '',
  },
  {
    id: 2,
    patientName: 'Ahmad Ri**',
    avatarInitials: 'AR',
    doctor: 'drg. Anton Wijaya',
    visitType: 'Konsultasi Awal',
    date: '2026-06-21',
    time: '10:30',
    status: 'selesai',
    price: 75000,
    notes: '',
  },
  {
    id: 3,
    patientName: 'Budi Su**',
    avatarInitials: 'BS',
    doctor: 'drg. Rina Susanti',
    visitType: 'Cabut Gigi',
    date: '2026-06-20',
    time: '14:00',
    status: 'selesai',
    price: 300000,
    notes: '',
  },
  {
    id: 4,
    patientName: 'Siti Ra**',
    avatarInitials: 'SR',
    doctor: 'drg. Lestari Putri',
    visitType: 'Kontrol Rutin',
    date: '2026-06-19',
    time: '11:00',
    status: 'batal',
    price: 0,
    notes: '',
  },
];

function statusTagClass(status: VisitStatus) {
  if (status === 'menunggu') return 'pending';
  if (status === 'selesai') return 'done';
  return 'cancel';
}

function statusLabel(status: VisitStatus) {
  if (status === 'menunggu') return 'Menunggu';
  if (status === 'selesai') return 'Selesai';
  return 'Batal';
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function ListKunjunganPage() {
  const searchParams = useSearchParams();
  const [visits, setVisits] = useState<Visit[]>(VISITS);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(VISITS[0]?.id ?? null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  const filteredVisits = visits.filter((v) => {
    const matchStatus = currentFilter === 'semua' || v.status === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      v.patientName.toLowerCase().includes(q) ||
      v.doctor.toLowerCase().includes(q) ||
      v.visitType.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalCount = visits.length;
  const pendingCount = visits.filter((v) => v.status === 'menunggu').length;
  const doneCount = visits.filter((v) => v.status === 'selesai').length;
  const cancelCount = visits.filter((v) => v.status === 'batal').length;

  const selectedVisit = visits.find((v) => v.id === selectedVisitId) ?? null;

  const handleSelectVisit = (id: number) => {
    setSelectedVisitId(id);
    setShowDetailOnMobile(true);
  };

  const handleSetFilter = (filter: FilterValue) => {
    setCurrentFilter(filter);
  };

  const handleAddVisit = () => {
    setShowAddModal(true);
  };

  const handleCreateVisit = (input: NewVisitInput) => {
    const newVisit: Visit = {
      id: Math.max(0, ...visits.map((v) => v.id)) + 1,
      patientName: input.patientName,
      avatarInitials: initialsFromName(input.patientName),
      doctor: input.doctor,
      visitType: input.visitType,
      date: input.date,
      time: input.time,
      status: 'menunggu',
      price: 0,
      notes: input.notes,
    };
    setVisits((prev) => [newVisit, ...prev]);
    setSelectedVisitId(newVisit.id);
    setShowAddModal(false);
  };

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
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                event_note
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Kunjungan</div>
            </div>
          </div>
          <div className="stat-card pending" onClick={() => handleSetFilter('menunggu')}>
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                schedule
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Menunggu</div>
            </div>
          </div>
          <div className="stat-card done" onClick={() => handleSetFilter('selesai')}>
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                task_alt
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{doneCount}</div>
              <div className="stat-label">Selesai</div>
            </div>
          </div>
          <div className="stat-card cancel" onClick={() => handleSetFilter('batal')}>
            <div className="stat-icon">
              <span
                className="material-symbols-rounded"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
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
                  placeholder="Cari pasien, dokter, jenis kunjungan…"
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
                  className={`filter-tab ${currentFilter === 'menunggu' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('menunggu')}
                >
                  Menunggu
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'selesai' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('selesai')}
                >
                  Selesai
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'batal' ? 'active' : ''}`}
                  onClick={() => handleSetFilter('batal')}
                >
                  Batal
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">{filteredVisits.length} Kunjungan ditemukan</span>
            </div>

            <div className="visit-list">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className={`visit-row-item ${visit.id === selectedVisitId ? 'selected' : ''}`}
                  onClick={() => handleSelectVisit(visit.id)}
                >
                  <div className="visit-avatar">{visit.avatarInitials}</div>
                  <div className="visit-row-info">
                    <div className="visit-row-name">{visit.patientName}</div>
                    <div className="visit-row-meta">
                      <span className={`tag ${statusTagClass(visit.status)}`}>
                        {statusLabel(visit.status)}
                      </span>
                      <span className="visit-row-sub">
                        · {visit.visitType} · {formatDate(visit.date)} {visit.time}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-rounded chevron-icon">chevron_right</span>
                </div>
              ))}
            </div>
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
                  <div className="detail-avatar">{selectedVisit.avatarInitials}</div>
                  <div className="detail-name-block">
                    <div className="detail-name">{selectedVisit.patientName}</div>
                    <div className="detail-rm">{selectedVisit.visitType}</div>
                    <div className="detail-tags">
                      <span className={`tag ${statusTagClass(selectedVisit.status)}`}>
                        {statusLabel(selectedVisit.status)}
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
                    <div className="info-label">Tanggal</div>
                    <div className="info-value">{formatDate(selectedVisit.date)}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Jam</div>
                    <div className="info-value">{selectedVisit.time}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Dokter</div>
                    <div className="info-value">{selectedVisit.doctor}</div>
                  </div>
                  <div className="info-cell">
                    <div className="info-label">Biaya</div>
                    <div className="info-value">
                      {selectedVisit.price > 0 ? formatRupiah(selectedVisit.price) : '—'}
                    </div>
                  </div>
                  <div className="info-cell" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Catatan</div>
                    <div className="info-value">{selectedVisit.notes || '—'}</div>
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
                        receipt
                      </span>
                      Buat Tagihan
                    </button>
                    <button className="btn-outline" style={{ fontSize: '12.5px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                        print
                      </span>
                      Cetak Catatan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddVisitModal onClose={() => setShowAddModal(false)} onCreate={handleCreateVisit} />
      )}
    </DashboardLayout>
  );
}
