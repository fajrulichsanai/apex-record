'use client';

import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { paymentApi } from '@/lib/subscription';
import type { Payment } from '@/types/subscription';
import { ApiError, apiFileUrl } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Menunggu Konfirmasi' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'rejected', label: 'Ditolak' },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SuperAdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<{ payment: Payment; action: 'confirm' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.listQueue({ status: status as 'pending' | 'confirmed' | 'rejected', page, limit: 20 });
      setRows(res.data);
      setMeta(res.meta);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat antrian pembayaran');
    } finally {
      setLoading(false);
    }
  }, [status, page, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = async () => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      if (reviewing.action === 'confirm') {
        await paymentApi.confirm(reviewing.payment.id, { notes: reviewNotes || undefined });
        success('Pembayaran dikonfirmasi, langganan klinik diperpanjang');
      } else {
        await paymentApi.reject(reviewing.payment.id, { notes: reviewNotes || undefined });
        success('Klaim pembayaran ditolak');
      }
      setReviewing(null);
      setReviewNotes('');
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memproses pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const tagClass = (s: string) => (s === 'confirmed' ? 'tag-confirmed' : s === 'rejected' ? 'tag-rejected' : 'tag-pending');
  const tagLabel = (s: string) => (s === 'confirmed' ? 'Dikonfirmasi' : s === 'rejected' ? 'Ditolak' : 'Menunggu');

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Konfirmasi Pembayaran</h1>
              <span className="badge-count">{meta.total}</span>
            </div>
            <p className="page-subtitle">Verifikasi klaim &quot;sudah bayar&quot; dari klinik, lalu konfirmasi untuk memperpanjang langganan.</p>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-select">
            <CustomSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} placeholder="Status" />
          </div>
        </div>

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Klinik</th>
                <th>Paket</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Bukti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-row">Memuat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="empty-row">Tidak ada klaim pembayaran untuk filter ini.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="col-time">{formatDateTime(row.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{row.clinicName || `Klinik #${row.clinicId}`}</td>
                    <td>{row.plan?.name || '-'}</td>
                    <td>Rp {formatCurrency(row.amount)}</td>
                    <td>
                      <span className={`tag ${tagClass(row.status)}`}>{tagLabel(row.status)}</span>
                    </td>
                    <td>
                      {row.proofUrl ? (
                        <a href={apiFileUrl(row.proofUrl)} target="_blank" rel="noopener noreferrer">
                          Lihat
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      {row.status === 'pending' && (
                        <>
                          <button type="button" className="btn-primary btn-sm" onClick={() => setReviewing({ payment: row, action: 'confirm' })}>
                            Konfirmasi
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => setReviewing({ payment: row, action: 'reject' })}>
                            Tolak
                          </button>
                        </>
                      )}
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

      {reviewing && (
        <div className="sa-modal-overlay" onClick={() => setReviewing(null)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>{reviewing.action === 'confirm' ? 'Konfirmasi Pembayaran' : 'Tolak Pembayaran'}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setReviewing(null)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-sub)' }}>
                {reviewing.payment.clinicName || `Klinik #${reviewing.payment.clinicId}`} &middot; {reviewing.payment.plan?.name} &middot; Rp {formatCurrency(reviewing.payment.amount)}
              </p>
              {reviewing.action === 'confirm' && (
                <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                  Konfirmasi akan memperpanjang langganan klinik ini sesuai durasi paket.
                </p>
              )}
              <div className="sa-field">
                <label>Catatan (opsional)</label>
                <textarea rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Contoh: transfer BCA a.n. ..." />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="btn-outline" onClick={() => setReviewing(null)}>Batal</button>
              <button
                type="button"
                className={reviewing.action === 'confirm' ? 'btn-primary' : 'btn-danger'}
                onClick={submitReview}
                disabled={submitting}
              >
                {submitting ? 'Memproses...' : reviewing.action === 'confirm' ? 'Konfirmasi' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
