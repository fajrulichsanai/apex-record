'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AddQueueModal from './AddQueueModal';
import { queuesApi, QueueItem, QueueStatus } from '@/lib/queues';
import { ApiError } from '@/lib/api-client';
import '../../styles/antrian.css';

type FilterValue = 'semua' | QueueStatus;

function statusTagClass(status: QueueStatus) {
  if (status === 'waiting') return 'waiting';
  if (status === 'called') return 'called';
  if (status === 'done') return 'done';
  return 'cancel';
}

function statusLabel(status: QueueStatus) {
  if (status === 'waiting') return 'Menunggu';
  if (status === 'called') return 'Dipanggil';
  if (status === 'done') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  return 'Dikonfirmasi';
}

export default function AntarianPasienPage() {
  return (
    <Suspense fallback={null}>
      <AntarianPasienPageInner />
    </Suspense>
  );
}

function AntarianPasienPageInner() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const loadQueues = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await queuesApi.list({ date: today });
      setQueues(res.data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat antrian');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 8000);
    return () => clearInterval(interval);
  }, [loadQueues]);

  const filteredQueues = queues
    .filter((q) => currentFilter === 'semua' || q.status === currentFilter)
    .filter((q) => {
      const matchSearch =
        (q.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.chiefComplaint || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.nomorAntrian.includes(searchQuery);
      return matchSearch;
    })
    .sort((a, b) => {
      const numA = parseInt(a.nomorAntrian) || 0;
      const numB = parseInt(b.nomorAntrian) || 0;
      return numA - numB;
    });

  const totalCount = queues.length;
  const waitingCount = queues.filter((q) => q.status === 'waiting').length;
  const calledCount = queues.filter((q) => q.status === 'called').length;
  const doneCount = queues.filter((q) => q.status === 'done').length;

  const handleAddQueue = () => {
    setShowAddModal(true);
  };

  const handleQueueCreated = () => {
    setShowAddModal(false);
    loadQueues();
  };

  const handleCallNext = async () => {
    const nextQueue = queues.find((q) => q.status === 'waiting');
    if (!nextQueue) {
      setActionError('Tidak ada antrian yang menunggu');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await queuesApi.updateStatus(nextQueue.id, { status: 'called' });
      await loadQueues();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal memanggil antrian');
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <DashboardLayout>
      <main className="content antrian-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Antrian Pasien</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola antrian pasien klinik Anda secara real-time</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={handleAddQueue}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                add
              </span>
              Tambah Antrian
            </button>
            <Link
              href="/antrian-pasien/display"
              target="_blank"
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg,#7B5CFA,#5C3AC8)',
                boxShadow: '0 4px 14px rgba(123,92,250,.35)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                monitor
              </span>
              Tampilan Display
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total" onClick={() => setCurrentFilter('semua')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                people
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Antrian</div>
            </div>
          </div>
          <div className="stat-card waiting" onClick={() => setCurrentFilter('waiting')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                schedule
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{waitingCount}</div>
              <div className="stat-label">Menunggu</div>
            </div>
          </div>
          <div className="stat-card called" onClick={() => setCurrentFilter('called')}>
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                campaign
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{calledCount}</div>
              <div className="stat-label">Dipanggil</div>
            </div>
          </div>
          <div className="stat-card done" onClick={() => setCurrentFilter('done')}>
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
                  placeholder="Cari nomor antrian, nama pasien, keluhan…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${currentFilter === 'semua' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('semua')}
                >
                  Semua
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'waiting' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('waiting')}
                >
                  Menunggu
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'called' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('called')}
                >
                  Dipanggil
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'done' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('done')}
                >
                  Selesai
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">
                {loading ? 'Memuat…' : `${filteredQueues.length} Antrian ditemukan`}
              </span>
            </div>

            {loadError ? (
              <div style={{ padding: '16px', color: '#FF4D4F' }}>{loadError}</div>
            ) : (
              <div className="queue-list">
                {filteredQueues.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0AEC0' }}>
                    Tidak ada antrian
                  </div>
                ) : (
                  filteredQueues.map((queue) => (
                    <div key={queue.id} className="queue-row-item">
                      <div className="queue-row-header">
                        <div className="queue-number">{queue.nomorAntrian}</div>
                        <div className="queue-patient-info">
                          <div className="queue-patient-name">{queue.patientName || `Pasien #${queue.patientId}`}</div>
                          <div className="queue-patient-meta">
                            {queue.jamSlot && <span>{queue.jamSlot}</span>}
                            {queue.phone && <span>·</span>}
                            {queue.phone && <span>{queue.phone}</span>}
                          </div>
                        </div>
                        <span className={`queue-status-tag ${statusTagClass(queue.status)}`}>
                          {statusLabel(queue.status)}
                        </span>
                      </div>
                      {queue.chiefComplaint && (
                        <div style={{ fontSize: '12px', color: '#6B7A99', marginLeft: '4px' }}>
                          {queue.chiefComplaint}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="action-panel">
            <div className="action-panel-header">
              <h3>Aksi Cepat</h3>
              <div className="action-panel-section">
                <button
                  className="btn-call-next"
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingCount === 0}
                >
                  <span className="material-symbols-rounded">campaigns</span>
                  Panggil Berikutnya
                </button>
                {actionError && <div className="action-error">{actionError}</div>}
              </div>
            </div>

            <div style={{ padding: '0 20px 16px' }}>
              <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '12px' }}>
                Antrian Menunggu: <strong style={{ color: '#1A2340' }}>{waitingCount}</strong>
              </div>
              {queues.find((q) => q.status === 'waiting') && (
                <div
                  style={{
                    padding: '12px',
                    background: 'rgba(245,166,35,.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(245,166,35,.2)',
                    fontSize: '13px',
                    color: '#F5A623',
                  }}
                >
                  Antrian berikutnya: <strong>{queues.find((q) => q.status === 'waiting')?.patientName}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showAddModal && (
        <AddQueueModal onClose={() => setShowAddModal(false)} onCreated={handleQueueCreated} />
      )}
    </DashboardLayout>
  );
}
