'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { patientsApi, type Encounter, type PatientBillingRow, type PatientHistoryPage } from '@/lib/patients';
import './PatientHistoryList.css';

const PAGE_SIZE = 10;

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  finished: 'Selesai',
  arrived: 'Sedang Berlangsung',
  in_progress: 'Sedang Berlangsung',
  cancelled: 'Dibatalkan',
};

const BILLING_STATUS_LABEL: Record<string, string> = {
  paid: 'Lunas',
  partial: 'Sebagian',
  unpaid: 'Belum Bayar',
  cancelled: 'Dibatalkan',
  refunded: 'Refund',
};

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/** "2026-10" → "Oktober 2026" */
function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function dateTimeLabel(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Kind = 'kunjungan' | 'transaksi';
type Row = Encounter | PatientBillingRow;

interface Props {
  patientId: number;
  kind: Kind;
}

/**
 * Riwayat kunjungan atau transaksi satu pasien: bisa dipilih per bulan (dengan
 * jumlah per bulan), melihat tanggal mana saja pasien datang, dan dibuka per
 * halaman — tidak lagi memuat seluruh riwayat sekaligus.
 *
 * Pemanggil memberi `key` per pasien+jenis supaya state (bulan, halaman, data)
 * dimulai bersih; tanpa itu data jenis lama sempat dirender sebagai jenis baru.
 */
export default function PatientHistoryList({ patientId, kind }: Props) {
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PatientHistoryPage<Row> | null>(null);
  const [months, setMonths] = useState<PatientHistoryPage<Row>['months']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const query = { month: month || undefined, page, limit: PAGE_SIZE };
    const request =
      kind === 'kunjungan'
        ? patientsApi.encounterHistory(patientId, query)
        : patientsApi.billingHistory(patientId, query);
    (request as Promise<PatientHistoryPage<Row>>)
      .then((res) => {
        if (!active) return;
        setData(res);
        setMonths(res.months);
      })
      .catch(() => {
        if (active) setError(`Gagal memuat riwayat ${kind}.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId, kind, month, page, reloadKey]);

  const selectMonth = (next: string) => {
    setMonth(next);
    setPage(1);
  };

  // Daftar bulan terbaru → terlama: "lebih baru" = indeks lebih kecil.
  const idx = months.findIndex((m) => m.month === month);
  const newer = idx > 0 ? months[idx - 1].month : null;
  const older = idx >= 0 && idx < months.length - 1 ? months[idx + 1].month : null;

  const meta = data?.meta;
  const from = meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const to = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;
  const noun = kind === 'kunjungan' ? 'kunjungan' : 'transaksi';

  return (
    <div className="ph-root">
      <div className="ph-toolbar">
        <button
          type="button"
          className="ph-nav"
          disabled={!newer}
          onClick={() => newer && selectMonth(newer)}
          aria-label="Bulan lebih baru"
          title="Bulan lebih baru"
        >
          <span aria-hidden="true" className="material-symbols-rounded">chevron_left</span>
        </button>
        <select
          className="ph-month"
          value={month}
          onChange={(e) => selectMonth(e.target.value)}
          aria-label="Pilih bulan"
        >
          <option value="">Semua bulan</option>
          {months.map((m) => (
            <option key={m.month} value={m.month}>
              {monthLabel(m.month)} ({m.count})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ph-nav"
          disabled={!older}
          onClick={() => older && selectMonth(older)}
          aria-label="Bulan lebih lama"
          title="Bulan lebih lama"
        >
          <span aria-hidden="true" className="material-symbols-rounded">chevron_right</span>
        </button>
      </div>

      {month && data && data.days.length > 0 && (
        <div className="ph-days" aria-label={`Tanggal ${noun} pada ${monthLabel(month)}`}>
          <span className="ph-days-label">{kind === 'kunjungan' ? 'Tanggal datang' : 'Tanggal transaksi'}:</span>
          {data.days.map((d) => (
            <span key={d.date} className="ph-day" title={`${d.count} ${noun}`}>
              {Number(d.date.slice(8))}
              {d.count > 1 && <small aria-label={`${d.count} ${noun}`}>{d.count}</small>}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="ph-state">
          {error}{' '}
          <button type="button" className="ph-link" onClick={() => setReloadKey((k) => k + 1)}>
            Coba lagi
          </button>
        </div>
      )}
      {!error && loading && !data && <div className="ph-state">Memuat riwayat {noun}…</div>}
      {!error && data && data.items.length === 0 && (
        <div className="ph-state">
          {month ? `Tidak ada ${noun} pada ${monthLabel(month)}.` : `Belum ada riwayat ${noun}.`}
        </div>
      )}

      {!error && data && data.items.length > 0 && (
        <div className={`ph-list${loading ? ' is-loading' : ''}`} aria-busy={loading}>
          {kind === 'kunjungan'
            ? (data.items as Encounter[]).map((enc) => (
                <div className="ph-item" key={enc.id}>
                  <div className="ph-dot" />
                  <div className="ph-info">
                    <Link className="ph-title ph-linked" href={`/list-kunjungan/${enc.id}/rekam-medis`} title="Buka rekam medis kunjungan ini">
                      {enc.chiefComplaint || enc.serviceType}
                    </Link>
                    <div className="ph-sub">
                      {dateTimeLabel(enc.arrivedTime)}
                      {enc.practitionerName ? ` · drg. ${enc.practitionerName}` : ''}
                    </div>
                  </div>
                  <span className={`ph-badge st-${enc.status}`}>{ENCOUNTER_STATUS_LABEL[enc.status] ?? enc.status}</span>
                </div>
              ))
            : (data.items as PatientBillingRow[]).map((b) => (
                <div className="ph-item" key={b.id}>
                  <div className="ph-dot ph-dot-money" />
                  <div className="ph-info">
                    <Link className="ph-title ph-linked" href={`/transaksi?billingId=${b.id}`} title="Buka detail invoice">
                      {b.invoiceNumber}
                    </Link>
                    <div className="ph-sub">
                      {dateTimeLabel(b.createdAt)}
                      {b.itemNames?.length ? ` · ${b.itemNames.join(', ')}` : ''}
                    </div>
                    {b.outstandingAmount > 0 && <div className="ph-sub ph-due">Sisa tagihan {rupiah(b.outstandingAmount)}</div>}
                  </div>
                  <div className="ph-amount">
                    <strong>{rupiah(b.grandTotal)}</strong>
                    <span className={`ph-badge st-${b.status}`}>{BILLING_STATUS_LABEL[b.status] ?? b.status}</span>
                  </div>
                </div>
              ))}
        </div>
      )}

      {!error && meta && meta.total > 0 && (
        <div className="ph-pager">
          <span className="ph-range">
            {from}–{to} dari {meta.total} {noun}
          </span>
          {meta.totalPages > 1 && (
            <div className="ph-pager-btns">
              <button type="button" className="ph-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </button>
              <span className="ph-page">
                {meta.page} / {meta.totalPages}
              </span>
              <button
                type="button"
                className="ph-btn"
                disabled={page >= meta.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
