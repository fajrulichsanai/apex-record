'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { Modal, Notice, PageHeader, Pager, StatusBadge, TableState, Tabs, formatDateTime } from '@/components/super-admin/ui';
import { paymentDetail } from '@/components/subscription/pricing';
import { paymentApi } from '@/lib/subscription';
import type { Payment, PaymentStatus } from '@/types/subscription';
import { ApiError, openProtectedFile } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

const TABS: { key: PaymentStatus; label: string }[] = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'confirmed', label: 'Dikonfirmasi' },
  { key: 'rejected', label: 'Ditolak' },
];

function payer(p: Payment) {
  return p.ownerId ? `${p.ownerName || `Owner #${p.ownerId}`} (Multi-Klinik)` : p.clinicName || `Klinik #${p.clinicId}`;
}

/** Antrian klaim "sudah bayar" (PRD KU-01): tab Menunggu · Dikonfirmasi · Ditolak. */
export default function SuperAdminPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<{ payment: Payment; action: 'confirm' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.listQueue({ status, page, limit: 20 });
      setRows(res.data);
      setMeta(res.meta);
      if (status === 'pending') setPendingCount(res.meta.total);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat antrian pembayaran');
    } finally {
      setLoading(false);
    }
  }, [status, page, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'pending') return;
    paymentApi
      .listQueue({ status: 'pending', page: 1, limit: 1 })
      .then((r) => setPendingCount(r.meta.total))
      .catch(() => undefined);
  }, [status]);

  const submitReview = async () => {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      if (reviewing.action === 'confirm') {
        await paymentApi.confirm(reviewing.payment.id, { notes: reviewNotes || undefined });
        success('Pembayaran dikonfirmasi, langganan diperpanjang, kuitansi dikirim ke email owner');
      } else {
        await paymentApi.reject(reviewing.payment.id, { notes: reviewNotes || undefined });
        success('Klaim pembayaran ditolak');
      }
      setReviewing(null);
      setReviewNotes('');
      void load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memproses pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <PageHeader
          title="Konfirmasi Pembayaran"
          subtitle="Periksa bukti transfer, lalu konfirmasi untuk memperpanjang langganan. Kuitansi dibuat otomatis."
        />

        <Tabs
          active={status}
          onChange={(k) => {
            setStatus(k as PaymentStatus);
            setPage(1);
          }}
          tabs={TABS.map((t) => (t.key === 'pending' ? { ...t, count: pendingCount } : t))}
        />

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pembayar</th>
                <th>Paket</th>
                <th>Rincian</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Bukti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={loading}
                empty={rows.length === 0}
                colSpan={8}
                message={status === 'pending' ? 'Tidak ada pembayaran yang menunggu.' : 'Belum ada data.'}
              />
              {!loading &&
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="col-time">{formatDateTime(row.createdAt)}</td>
                    <td className="cell-strong">
                      {row.clinicId ? <Link href={`/super-admin/clinics/${row.clinicId}?tab=langganan`}>{payer(row)}</Link> : payer(row)}
                    </td>
                    <td>{row.plan?.name || '-'}</td>
                    <td>{paymentDetail(row)}</td>
                    <td className="cell-nowrap">Rp {formatCurrency(row.amount)}</td>
                    <td>
                      <StatusBadge tone={row.status === 'confirmed' ? 'ok' : row.status === 'rejected' ? 'bad' : 'warn'}>
                        {row.status === 'confirmed' ? 'Lunas, dikonfirmasi' : row.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </StatusBadge>
                    </td>
                    <td>
                      {row.proofUrl ? (
                        <button
                          type="button"
                          className="sa-link"
                          onClick={() => openProtectedFile(row.proofUrl!).catch(() => showError('Gagal memuat bukti pembayaran'))}
                        >
                          Lihat
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="cell-actions">
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
                      {row.status === 'confirmed' && (
                        <Link href={`/kuitansi/${row.id}`} target="_blank" className="btn-outline btn-sm">
                          Kuitansi
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pager page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </div>

      {reviewing && (
        <Modal
          title={reviewing.action === 'confirm' ? 'Konfirmasi pembayaran' : 'Tolak pembayaran'}
          onClose={() => setReviewing(null)}
          busy={submitting}
          footer={
            <>
              <button type="button" className="btn-outline" onClick={() => setReviewing(null)} disabled={submitting}>
                Batal
              </button>
              <button
                type="button"
                className={reviewing.action === 'confirm' ? 'btn-primary' : 'btn-danger'}
                onClick={submitReview}
                disabled={submitting}
              >
                {submitting ? 'Memproses...' : reviewing.action === 'confirm' ? 'Konfirmasi' : 'Tolak'}
              </button>
            </>
          }
        >
          <p className="text-sub">
            {payer(reviewing.payment)} &middot; {reviewing.payment.plan?.name} &middot; {paymentDetail(reviewing.payment)} &middot; Rp{' '}
            {formatCurrency(reviewing.payment.amount)}
          </p>
          {reviewing.action === 'confirm' &&
            (reviewing.payment.ownerId ? (
              <Notice tone="warn">
                Pembayaran Multi Klinik ini mencakup <strong>{reviewing.payment.quantity} klinik</strong>. Konfirmasi
                memperpanjang langganan semua klinik tersebut sekaligus.
              </Notice>
            ) : (
              <p className="text-sub">
                Konfirmasi memperpanjang langganan klinik ini {reviewing.payment.months ?? 1} bulan dan mengirim kuitansi ke
                email owner.
              </p>
            ))}
          <div className="sa-field">
            <label htmlFor="review-notes">Catatan (opsional)</label>
            <textarea
              id="review-notes"
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Contoh: transfer BCA a.n. ..."
            />
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  );
}
