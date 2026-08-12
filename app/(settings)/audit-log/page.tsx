'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import CustomSelect from '@/components/form/CustomSelect';
import AuditLogDetailModal from './AuditLogDetailModal';
import '../../styles/audit-log.css';
import { ApiError } from '@/lib/api-client';
import { auditLogApi, AuditLogEntry, AuditActionType } from '@/lib/audit-log';
import { useToast } from '@/lib/toast-context';

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'Buat' },
  { value: 'UPDATE', label: 'Ubah' },
  { value: 'DELETE', label: 'Hapus' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Ekspor' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Semua Entitas' },
  { value: 'Patient', label: 'Pasien' },
  { value: 'MedicalRecord', label: 'Rekam Medis' },
  { value: 'Appointment', label: 'Janji Temu' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'DrugStock', label: 'Stok Obat' },
  { value: 'Staff', label: 'Staff' },
  { value: 'AuditLog', label: 'Log Audit' },
];

const SENSITIVE_ENTITY_TYPES = new Set(['Patient', 'MedicalRecord']);

const ACTION_LABEL: Record<AuditActionType, string> = {
  CREATE: 'Buat',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  EXPORT: 'Ekspor',
  VIEW: 'Lihat',
};

function actionTagClass(action: AuditActionType) {
  switch (action) {
    case 'DELETE':
      return 'tag-delete';
    case 'CREATE':
      return 'tag-create';
    case 'UPDATE':
      return 'tag-update';
    case 'LOGIN':
    case 'LOGOUT':
      return 'tag-auth';
    default:
      return 'tag-neutral';
  }
}

function maskLabel(entry: AuditLogEntry) {
  const label = entry.entityLabel || entry.entityId || '-';
  if (!SENSITIVE_ENTITY_TYPES.has(entry.entityType)) return label;
  if (label.length <= 3) return '***';
  return `${label.slice(0, 2)}${'*'.repeat(Math.max(3, label.length - 2))}`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogPageInner />
    </Suspense>
  );
}

function AuditLogPageInner() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { error: showError } = useToast();

  const currentQuery = useCallback(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      actionType: (actionType || undefined) as AuditActionType | undefined,
      entityType: entityType || undefined,
      search: search || undefined,
      page,
      limit: 20,
    }),
    [dateFrom, dateTo, actionType, entityType, search, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditLogApi.list(currentQuery());
      setEntries(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat log aktivitas');
    } finally {
      setLoading(false);
    }
  }, [currentQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const resetAndSearch = () => {
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await auditLogApi.exportCsv(currentQuery());
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('Gagal mengekspor log aktivitas');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="audit-log">
        <div className="audit-log-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Log Aktivitas</h1>
                <span className="badge-count">{meta.total}</span>
              </div>
              <p className="page-subtitle">
                Riwayat aktivitas seluruh pengguna di klinik ini. Hanya dapat dilihat oleh owner.
              </p>
            </div>
            <button type="button" className="btn-outline" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Mengekspor...' : 'Ekspor CSV'}
            </button>
          </div>

          <div className="filter-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Cari nama pengguna atau data terkait..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && resetAndSearch()}
            />
            <input
              type="date"
              className="date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Dari tanggal"
            />
            <input
              type="date"
              className="date-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Sampai tanggal"
            />
            <div className="filter-select">
              <CustomSelect value={actionType} onChange={setActionType} options={ACTION_OPTIONS} placeholder="Semua Aksi" />
            </div>
            <div className="filter-select">
              <CustomSelect value={entityType} onChange={setEntityType} options={ENTITY_OPTIONS} placeholder="Semua Entitas" />
            </div>
            <button type="button" className="btn-primary" onClick={resetAndSearch}>
              Terapkan
            </button>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengguna</th>
                  <th>Aksi</th>
                  <th>Entitas</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      Memuat...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      Tidak ada log aktivitas untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className={entry.actionType === 'DELETE' ? 'row-critical' : ''}>
                      <td className="col-time">{formatTimestamp(entry.createdAt)}</td>
                      <td>
                        <div className="actor-name">{entry.actorName}</div>
                        <div className="actor-role">{entry.actorRole}</div>
                      </td>
                      <td>
                        <span className={`tag ${actionTagClass(entry.actionType)}`}>
                          {ACTION_LABEL[entry.actionType]}
                        </span>
                      </td>
                      <td>
                        <div className="entity-type">{entry.entityType}</div>
                        <div className="entity-label">{maskLabel(entry)}</div>
                      </td>
                      <td>
                        <span className={`status-dot ${entry.status === 'FAILED' ? 'failed' : 'success'}`}>
                          {entry.status === 'FAILED' ? 'Gagal' : 'Berhasil'}
                        </span>
                      </td>
                      <td className="col-ip">{entry.ipAddress || '-'}</td>
                      <td>
                        <button type="button" className="btn-detail" onClick={() => setSelectedId(entry.id)}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Sebelumnya
              </button>
              <span>
                Halaman {meta.page} dari {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>

        {selectedId !== null && (
          <AuditLogDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
        )}
      </FeatureGuard>
    </DashboardLayout>
  );
}
