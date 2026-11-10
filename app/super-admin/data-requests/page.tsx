'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { Modal, Notice, PageHeader, StatusBadge, TableState, Tabs, formatDateTime, type Tone } from '@/components/super-admin/ui';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import {
  dataRequestsApi,
  DATA_REQUEST_STATUS_LABEL,
  DATA_REQUEST_TYPE_LABEL,
  type AdminDataRequest,
  type DataRequestStatus,
} from '@/lib/data-requests';
import '../../styles/super-admin.css';

const FILTER_TABS = [
  { key: 'open', label: 'Perlu ditindaklanjuti' },
  { key: 'completed', label: 'Selesai' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
];

const DEADLINE_HOURS = 72;

/** Sisa waktu dari batas 3 × 24 jam (PRD KP-01); merah bila lewat. */
function deadline(createdAt: string): { label: string; tone: Tone } {
  const left = new Date(createdAt).getTime() + DEADLINE_HOURS * 3600_000 - Date.now();
  const hours = Math.round(Math.abs(left) / 3600_000);
  if (left < 0) return { label: `Lewat ${hours} jam`, tone: 'bad' };
  if (hours < 24) return { label: `Sisa ${hours} jam`, tone: 'warn' };
  return { label: `Sisa ${Math.floor(hours / 24)} hari ${hours % 24} jam`, tone: 'info' };
}

type Action = Exclude<DataRequestStatus, 'pending'>;
const ACTION_LABEL: Record<Action, string> = {
  in_progress: 'Tandai diproses',
  completed: 'Tandai selesai',
  rejected: 'Tolak',
};

const STATUS_TONE: Record<DataRequestStatus, Tone> = {
  pending: 'warn',
  in_progress: 'info',
  completed: 'ok',
  rejected: 'bad',
};

/** UU PDP data requests from clinic owners: export a copy of the data, or close the account. */
export default function SuperAdminDataRequestsPage() {
  const [rows, setRows] = useState<AdminDataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [acting, setActing] = useState<{ row: AdminDataRequest; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

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
        <PageHeader
          title="Permintaan Data"
          count={filter === 'open' ? openCount : undefined}
          subtitle="Permintaan ekspor data dan penutupan akun dari pemilik klinik (UU PDP). Tanggapi paling lambat 3 × 24 jam."
        />

        <Notice tone="info">
          Owner kini bisa mengunduh semua data kliniknya sendiri dari Pengaturan › Data &amp; Privasi. Untuk permintaan
          ekspor, Anda juga bisa mengunduh ZIP-nya dari detail klinik › Ringkasan › Unduh semua data.
        </Notice>

        <Tabs active={filter} onChange={setFilter} tabs={FILTER_TABS} />

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Diajukan</th>
                <th>Batas waktu</th>
                <th>Klinik</th>
                <th>Permintaan</th>
                <th>Alasan</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <TableState loading={loading} empty={rows.length === 0} colSpan={7} message="Tidak ada permintaan untuk filter ini." />
              {!loading &&
                rows.map((row) => {
                  const open = row.status === 'pending' || row.status === 'in_progress';
                  const due = deadline(row.createdAt);
                  return (
                    <tr key={row.id}>
                      <td className="col-time">{formatDateTime(row.createdAt)}</td>
                      <td>{open ? <StatusBadge tone={due.tone}>{due.label}</StatusBadge> : '-'}</td>
                      <td>
                        <Link href={`/super-admin/clinics/${row.clinicId}`} className="cell-strong">
                          {row.clinicName ?? `Klinik #${row.clinicId}`}
                        </Link>
                        {row.requestedBy && (
                          <span className="cell-sub">
                            {row.requestedBy.name} · {row.requestedBy.email}
                          </span>
                        )}
                      </td>
                      <td>{DATA_REQUEST_TYPE_LABEL[row.type]}</td>
                      <td className="cell-wrap">
                        {row.reason || '—'}
                        {row.adminNote && <span className="cell-sub">Catatan: {row.adminNote}</span>}
                      </td>
                      <td>
                        <StatusBadge tone={STATUS_TONE[row.status]}>{DATA_REQUEST_STATUS_LABEL[row.status]}</StatusBadge>
                      </td>
                      <td>
                        {open && (
                          <div className="cell-actions">
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
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {acting && (
        <Modal
          title={ACTION_LABEL[acting.action]}
          onClose={() => setActing(null)}
          busy={submitting}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setActing(null)} disabled={submitting}>
                Batal
              </button>
              <button
                type="button"
                className={acting.action === 'rejected' ? 'btn-danger' : 'btn-primary'}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? 'Menyimpan...' : ACTION_LABEL[acting.action]}
              </button>
            </>
          }
        >
          <p className="text-sub">
            {acting.row.clinicName ?? `Klinik #${acting.row.clinicId}`} &middot; {DATA_REQUEST_TYPE_LABEL[acting.row.type]}
          </p>
          {acting.action === 'completed' && acting.row.type === 'close_account' && (
            <Notice tone="warn">
              Pastikan salinan data sudah dikirim ke klinik dan data sudah dihapus (Penghapusan Data › Hapus sekarang)
              sebelum menandai selesai.
            </Notice>
          )}
          <div className="sa-field">
            <label htmlFor="drNote">
              {acting.action === 'rejected' ? 'Alasan penolakan (dikirim ke klinik)' : 'Catatan untuk klinik (opsional)'}
            </label>
            <textarea
              id="drNote"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={acting.action === 'completed' ? 'mis. File ekspor dikirim ke email pemilik tanggal ...' : ''}
            />
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  );
}
