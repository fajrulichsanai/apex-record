'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import AuditLogDetailModal from '@/app/(settings)/audit-log/AuditLogDetailModal';
import '../../styles/audit-log.css';
import '../../styles/super-admin.css';
import { ApiError } from '@/lib/api-client';
import { auditLogApi, AuditLogEntry, AuditActionType } from '@/lib/audit-log';
import { clinicApi, ClinicResponse } from '@/lib/clinic';

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'Buat' },
  { value: 'UPDATE', label: 'Ubah' },
  { value: 'DELETE', label: 'Hapus' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'EXPORT', label: 'Ekspor' },
];

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
    case 'DELETE': return 'tag-delete';
    case 'CREATE': return 'tag-create';
    case 'UPDATE': return 'tag-update';
    case 'LOGIN':
    case 'LOGOUT': return 'tag-auth';
    default: return 'tag-neutral';
  }
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export default function SuperAdminAuditLogPage() {
  return (
    <Suspense fallback={null}>
      <SuperAdminAuditLogPageInner />
    </Suspense>
  );
}

function SuperAdminAuditLogPageInner() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<ClinicResponse[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionType, setActionType] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    clinicApi.listAll().then(setClinics).catch(() => {});
  }, []);

  const currentQuery = useCallback(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      actionType: (actionType || undefined) as AuditActionType | undefined,
      clinicId: clinicId ? Number(clinicId) : undefined,
      search: search || undefined,
      page,
      limit: 20,
    }),
    [dateFrom, dateTo, actionType, clinicId, search, page],
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

  const clinicOptions = [
    { value: '', label: 'Semua Klinik' },
    ...clinics.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <SuperAdminLayout>
      <div className="sa-page audit-log-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Log Aktivitas</h1>
              <span className="badge-count">{meta.total}</span>
            </div>
            <p className="page-subtitle">Riwayat aktivitas seluruh klinik pada platform.</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Cari nama pengguna atau data terkait..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
          <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="Dari tanggal" />
          <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="Sampai tanggal" />
          <div className="filter-select">
            <CustomSelect value={clinicId} onChange={(v) => { setClinicId(v); setPage(1); }} options={clinicOptions} placeholder="Semua Klinik" />
          </div>
          <div className="filter-select">
            <CustomSelect value={actionType} onChange={(v) => { setActionType(v); setPage(1); }} options={ACTION_OPTIONS} placeholder="Semua Aksi" />
          </div>
          <button type="button" className="btn-primary" onClick={() => setPage(1)}>Terapkan</button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Klinik</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-row">Memuat...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={7} className="empty-row">Tidak ada log aktivitas untuk filter ini.</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className={entry.actionType === 'DELETE' ? 'row-critical' : ''}>
                    <td className="col-time">{formatTimestamp(entry.createdAt)}</td>
                    <td>{clinics.find((c) => c.id === entry.clinicId)?.name || (entry.clinicId ? `#${entry.clinicId}` : '-')}</td>
                    <td>
                      <div className="actor-name">{entry.actorName}</div>
                      <div className="actor-role">{entry.actorRole}</div>
                    </td>
                    <td>
                      <span className={`tag ${actionTagClass(entry.actionType)}`}>{ACTION_LABEL[entry.actionType]}</span>
                    </td>
                    <td>
                      <div className="entity-type">{entry.entityType}</div>
                      <div className="entity-label">{entry.entityLabel || entry.entityId || '-'}</div>
                    </td>
                    <td>
                      <span className={`status-dot ${entry.status === 'FAILED' ? 'failed' : 'success'}`}>
                        {entry.status === 'FAILED' ? 'Gagal' : 'Berhasil'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn-detail" onClick={() => setSelectedId(entry.id)}>Detail</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Sebelumnya</button>
            <span>Halaman {meta.page} dari {meta.totalPages}</span>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}>Berikutnya</button>
          </div>
        )}
      </div>

      {selectedId !== null && <AuditLogDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </SuperAdminLayout>
  );
}
