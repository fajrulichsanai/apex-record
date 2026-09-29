'use client';

import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';
import {
  dataRequestsApi,
  DATA_REQUEST_STATUS_LABEL,
  DATA_REQUEST_TYPE_LABEL,
  type AdminDataRequest,
  type DataRequestStatus,
} from '@/lib/data-requests';
import '../../styles/super-admin.css';

const FILTER_OPTIONS = [
  { value: 'open', label: 'Perlu ditindaklanjuti' },
  { value: 'completed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'all', label: 'Semua' },
];

type Action = Exclude<DataRequestStatus, 'pending'>;
const ACTION_LABEL: Record<Action, string> = {
  in_progress: 'Tandai diproses',
  completed: 'Tandai selesai',
  rejected: 'Tolak',
};

const STATUS_STYLE: Record<DataRequestStatus, { background: string; color: string }> = {
  pending: { background: 'rgba(245,166,35,.15)', color: '#8A5A00' },
  in_progress: { background: 'rgba(29,95,174,.12)', color: '#1D5FAE' },
  completed: { background: 'rgba(54,125,47,.12)', color: '#2B6B22' },
  rejected: { background: 'rgba(193,56,31,.12)', color: '#C1381F' },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** UU PDP data requests from clinic owners: export a copy of the data, or close the account. */
export default function SuperAdminDataRequestsPage() {
  const [rows, setRows] = useState<AdminDataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [acting, setActing] = useState<{ row: AdminDataRequest; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();
  useEscapeKey(() => !submitting && setActing(null), acting !== null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await dataRequestsApi.adminList(
        filter === 'completed' || filter === 'rejected' ? filter : undefined,
      );
      setRows(filter === 'open' ? all.filter((r) => r.status === 'pending' || r.status === 'in_progress') : all);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat permintaan data');
    } finally {
      setLoading(false);
    }
  }, [filter, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!acting) return;
    if (acting.action === 'rejected' && !note.trim()) {
      showError('Tuliskan alasan penolakan untuk klinik');
      return;
    }
    setSubmitting(true);
    try {
      await dataRequestsApi.adminUpdate(acting.row.id, acting.action, note.trim());
      success(`Permintaan ${DATA_REQUEST_STATUS_LABEL[acting.action].toLowerCase()}`);
      setActing(null);
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memperbarui permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = rows.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Permintaan Data</h1>
              {filter === 'open' && <span className="badge-count">{openCount}</span>}
            </div>
            <p className="page-subtitle">
              Permintaan ekspor data dan penutupan akun dari pemilik klinik (UU PDP). Tanggapi paling lambat 3 x 24 jam.
              Untuk tutup akun, kirim salinan data ke klinik sebelum menghapus.
            </p>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-select">
            <CustomSelect value={filter} onChange={setFilter} options={FILTER_OPTIONS} placeholder="Status" />
          </div>
        </div>

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Diajukan</th>
                <th>Klinik</th>
                <th>Permintaan</th>
                <th>Alasan</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty-row">Memuat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="empty-row">Tidak ada permintaan untuk filter ini.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="col-time">{formatDateTime(row.createdAt)}</td>
                    <td>
                      <strong>{row.clinicName ?? `Klinik #${row.clinicId}`}</strong>
                      {row.requestedBy && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {row.requestedBy.name} · {row.requestedBy.email}
                        </div>
                      )}
                    </td>
                    <td>{DATA_REQUEST_TYPE_LABEL[row.type]}</td>
                    <td style={{ maxWidth: 260, whiteSpace: 'normal' }}>
                      {row.reason || '—'}
                      {row.adminNote && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Catatan: {row.adminNote}</div>
                      )}
                    </td>
                    <td>
                      <span style={{ ...STATUS_STYLE[row.status], padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {DATA_REQUEST_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td>
                      {(row.status === 'pending' || row.status === 'in_progress') && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {row.status === 'pending' && (
                            <button type="button" className="btn-outline btn-sm" onClick={() => { setNote(''); setActing({ row, action: 'in_progress' }); }}>
                              Proses
                            </button>
                          )}
                          <button type="button" className="btn-primary btn-sm" onClick={() => { setNote(''); setActing({ row, action: 'completed' }); }}>
                            Selesai
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => { setNote(''); setActing({ row, action: 'rejected' }); }}>
                            Tolak
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {acting && (
        <div className="sa-modal-overlay" onClick={() => !submitting && setActing(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="dr-modal-title">
            <div className="sa-modal-header">
              <h2 id="dr-modal-title">{ACTION_LABEL[acting.action]}</h2>
              <button type="button" className="sa-modal-close" aria-label="Tutup" onClick={() => setActing(null)} disabled={submitting}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-sub)' }}>
                {acting.row.clinicName ?? `Klinik #${acting.row.clinicId}`} &middot; {DATA_REQUEST_TYPE_LABEL[acting.row.type]}
              </p>
              {acting.action === 'completed' && acting.row.type === 'close_account' && (
                <p style={{ fontSize: 13, color: '#8A5A00', background: 'rgba(245,166,35,.12)', padding: '10px 12px', borderRadius: 8 }}>
                  Pastikan salinan data sudah dikirim ke klinik dan data sudah dihapus dari server sebelum menandai selesai.
                </p>
              )}
              <div className="sa-field">
                <label htmlFor="drNote">{acting.action === 'rejected' ? 'Alasan penolakan (dikirim ke klinik)' : 'Catatan untuk klinik (opsional)'}</label>
                <textarea
                  id="drNote"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={acting.action === 'completed' ? 'mis. File ekspor dikirim ke email pemilik tanggal ...' : ''}
                />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="btn-outline" onClick={() => setActing(null)} disabled={submitting}>Batal</button>
              <button
                type="button"
                className={acting.action === 'rejected' ? 'btn-danger' : 'btn-primary'}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Menyimpan...' : ACTION_LABEL[acting.action]}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
