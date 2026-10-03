'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiRefreshCw, FiSend } from 'react-icons/fi';
import { Pager, SatusehatShell, SyncBadge, formatDateTime } from '@/components/satusehat/SatusehatShell';
import {
  RESOURCE_LABELS,
  RESOURCE_TYPES,
  SYNC_STATE_LABELS,
  satusehatApi,
  type ResourceList,
  type SatusehatResourceType,
  type SyncState,
} from '@/lib/satusehat';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 20;

function isResourceType(v: string | null): v is SatusehatResourceType {
  return !!v && (RESOURCE_TYPES as readonly string[]).includes(v);
}

function DataContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

  const typeParam = params.get('type');
  const type: SatusehatResourceType = isResourceType(typeParam) ? typeParam : 'Encounter';

  const [status, setStatus] = useState<SyncState | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ResourceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(
        await satusehatApi.listResources(type, {
          page,
          limit: PAGE_SIZE,
          status: status || undefined,
          search: search || undefined,
        }),
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, page, status, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function selectType(t: SatusehatResourceType) {
    setPage(1);
    router.replace(`/satusehat/data?type=${t}`);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleSync(localId: number) {
    setSyncingId(localId);
    try {
      const res = await satusehatApi.syncResource(type, localId);
      showToast(`Berhasil dikirim ke SATUSEHAT (ID ${res.satusehatId ?? '-'})`, 'success');
    } catch (err) {
      // Backend mengembalikan 400 berisi alasan gagal dari SATUSEHAT
      showToast(err instanceof Error ? err.message : 'Gagal mengirim data', 'error', 8000);
    } finally {
      void load();
      setSyncingId(null);
    }
  }

  const canSync = isOwner && data?.syncable;

  return (
    <SatusehatShell
      title="Data & Status Sync"
      subtitle="Bank data klinik: mana yang sudah terverifikasi SATUSEHAT dan mana yang belum"
      actions={
        <button type="button" className="ss-btn" onClick={load} disabled={loading}>
          <FiRefreshCw /> Muat ulang
        </button>
      }
    >
      <div className="ss-tabs" role="tablist">
        {RESOURCE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === type}
            className={`ss-tab ${t === type ? 'active' : ''}`}
            onClick={() => selectType(t)}
          >
            {RESOURCE_LABELS[t]}
            <span className="ss-muted" style={{ fontSize: 11 }}> · {t}</span>
          </button>
        ))}
      </div>

      <div className="ss-card">
        <form className="ss-toolbar" onSubmit={onSearch}>
          <select
            className="ss-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as SyncState | '');
            }}
          >
            <option value="">Semua status</option>
            {(Object.keys(SYNC_STATE_LABELS) as SyncState[]).map((s) => (
              <option key={s} value={s}>
                {SYNC_STATE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            className="ss-input grow"
            placeholder="Cari nama pasien, kode, dll."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="ss-btn">
            Cari
          </button>
        </form>

        {type === 'Patient' && (
          <p className="ss-muted" style={{ marginBottom: 12 }}>
            Pasien dianggap terverifikasi bila sudah memiliki IHS Number / ID Pasien SATUSEHAT (dicocokkan lewat NIK).
          </p>
        )}
        {(type === 'Practitioner' || type === 'Location') && (
          <p className="ss-muted" style={{ marginBottom: 12 }}>
            Terverifikasi bila sudah memiliki ID SATUSEHAT. Lengkapi ID-nya di menu pengelolaan masing-masing.
          </p>
        )}

        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Tanggal</th>
                <th>ID SATUSEHAT</th>
                <th>Status</th>
                {canSync && <th />}
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
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.localId}>
                    <td className="ss-mono">{row.localId}</td>
                    <td>
                      {row.title || '-'}
                      {row.subtitle && <span className="sub">{row.subtitle}</span>}
                      {row.status === 'failed' && row.lastError && <span className="err">{row.lastError}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.date)}</td>
                    <td className="ss-mono">{row.satusehatId || '-'}</td>
                    <td>
                      <SyncBadge status={row.status} />
                    </td>
                    {canSync && (
                      <td>
                        <button
                          type="button"
                          className="ss-btn sm"
                          disabled={syncingId !== null}
                          onClick={() => handleSync(row.localId)}
                          title={row.status === 'synced' ? 'Kirim ulang (update)' : 'Kirim ke SATUSEHAT'}
                        >
                          <FiSend /> {syncingId === row.localId ? 'Mengirim...' : row.status === 'synced' ? 'Kirim ulang' : 'Kirim'}
                        </button>
                      </td>
                    )}
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

export default function SatusehatDataPage() {
  return (
    <Suspense fallback={null}>
      <DataContent />
    </Suspense>
  );
}
