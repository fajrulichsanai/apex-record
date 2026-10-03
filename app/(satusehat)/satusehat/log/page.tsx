'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { Pager, SatusehatShell, SyncBadge, formatDateTime } from '@/components/satusehat/SatusehatShell';
import {
  RESOURCE_LABELS,
  RESOURCE_TYPES,
  satusehatApi,
  type Paged,
  type SatusehatResourceType,
  type SyncLog,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 20;

export default function SatusehatLogPage() {
  const { showToast } = useToast();
  const [resourceType, setResourceType] = useState<SatusehatResourceType | ''>('');
  const [status, setStatus] = useState<SyncLog['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<SyncLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SyncLog | null>(null);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);

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

  async function openDetail(id: number) {
    if (detail?.id === id) {
      setDetail(null);
      return;
    }
    setDetailLoading(id);
    try {
      setDetail(await satusehatApi.getSyncLog(id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat detail log', 'error');
    } finally {
      setDetailLoading(null);
    }
  }

  return (
    <SatusehatShell
      title="Log Sinkronisasi"
      subtitle="Riwayat setiap pengiriman data ke SATUSEHAT beserta respons-nya"
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
              setResourceType(e.target.value as SatusehatResourceType | '');
            }}
          >
            <option value="">Semua resource</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESOURCE_LABELS[t]} ({t})
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
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="ss-empty">
                    Memuat...
                  </td>
                </tr>
              ) : !data || data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ss-empty">
                    Belum ada log.
                  </td>
                </tr>
              ) : (
                data.items.flatMap((log) => {
                  const rows = [
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                      <td>
                        {RESOURCE_LABELS[log.resourceType as SatusehatResourceType] ?? log.resourceType}
                        <span className="sub">{log.resourceType}</span>
                        {log.errorMessage && <span className="err">{log.errorMessage}</span>}
                      </td>
                      <td className="ss-mono">{log.localId}</td>
                      <td className="ss-mono">{log.satusehatId || '-'}</td>
                      <td className="ss-mono">{log.httpStatus ?? '-'}</td>
                      <td>
                        <SyncBadge status={log.status} />
                      </td>
                      <td>
                        <button type="button" className="ss-btn sm" onClick={() => openDetail(log.id)}>
                          {detailLoading === log.id ? '...' : detail?.id === log.id ? 'Tutup' : 'Detail'}
                        </button>
                      </td>
                    </tr>,
                  ];
                  if (detail?.id === log.id) {
                    rows.push(
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={7}>
                          <div className="ss-grid">
                            <div>
                              <p className="ss-muted" style={{ marginBottom: 6 }}>
                                Request
                              </p>
                              <pre className="ss-json">{JSON.stringify(detail.requestPayload ?? null, null, 2)}</pre>
                            </div>
                            <div>
                              <p className="ss-muted" style={{ marginBottom: 6 }}>
                                Response
                              </p>
                              <pre className="ss-json">{JSON.stringify(detail.responsePayload ?? null, null, 2)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })
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
