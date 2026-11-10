'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Pager, SatusehatShell, SyncBadge, formatDateTime } from '@/components/satusehat/SatusehatShell';
import {
  LOG_RESOURCE_LABELS,
  LOG_RESOURCE_TYPES,
  satusehatApi,
  type LogResourceType,
  type Paged,
  type SyncLog,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 20;

export default function SatusehatLogPage() {
  const { showToast } = useToast();
  const [resourceType, setResourceType] = useState<LogResourceType | ''>('');
  const [status, setStatus] = useState<SyncLog['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<SyncLog> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await satusehatApi.listSyncLogs({
          page,
          limit: PAGE_SIZE,
          resourceType: resourceType || undefined,
          status: status || undefined,
        }),
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat log', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, resourceType, status, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SatusehatShell
      title="Log Sinkronisasi"
      subtitle="Riwayat setiap pengiriman data ke SATUSEHAT. Isi data klinis tidak disimpan di log demi keamanan."
      actions={
        <button type="button" className="ss-btn" onClick={load} disabled={loading}>
          <FiRefreshCw /> Muat ulang
        </button>
      }
    >
      <div className="ss-card">
        <div className="ss-toolbar">
          <select
            className="ss-input"
            value={resourceType}
            onChange={(e) => {
              setPage(1);
              setResourceType(e.target.value as LogResourceType | '');
            }}
          >
            <option value="">Semua resource</option>
            {LOG_RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {LOG_RESOURCE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            className="ss-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as SyncLog['status'] | '');
            }}
          >
            <option value="">Semua status</option>
            <option value="success">Berhasil</option>
            <option value="failed">Gagal</option>
            <option value="pending">Antre</option>
          </select>
        </div>

        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Resource</th>
                <th>ID Lokal</th>
                <th>ID SATUSEHAT</th>
                <th>HTTP</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="ss-empty">
                    Memuat...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ss-empty">
                    Belum ada log.
                  </td>
                </tr>
              ) : (
                data.items.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                    <td>
                      {LOG_RESOURCE_LABELS[log.resourceType.split(':')[0] as LogResourceType] ?? log.resourceType}
                      <span className="sub">{log.resourceType}</span>
                      {log.errorMessage && <span className="err">{log.errorMessage}</span>}
                    </td>
                    <td className="ss-mono">{log.localId}</td>
                    <td className="ss-mono">{log.satusehatId || '-'}</td>
                    <td className="ss-mono">{log.httpStatus ?? '-'}</td>
                    <td>
                      <SyncBadge status={log.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && (
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} loading={loading} onChange={setPage} />
        )}
      </div>
    </SatusehatShell>
  );
}
