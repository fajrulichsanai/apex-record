'use client';

import { useCallback, useEffect, useState } from 'react';
import { reportsApi, FinancialVisitDetailResponse } from '@/lib/reports';
import { useToast } from '@/lib/toast-context';

function formatTanggal(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatJam(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface VisitDetailTableProps {
  dateFrom: string;
  dateTo: string;
}

export default function VisitDetailTable({ dateFrom, dateTo }: VisitDetailTableProps) {
  const { error: showError } = useToast();
  const [result, setResult] = useState<FinancialVisitDetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getFinancialVisitDetail({ dateFrom, dateTo, page, limit: 20 });
      setResult(res);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal memuat detail kunjungan');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, showError]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = result?.data ?? [];
  const meta = result?.meta;

  return (
    <div className="panel laporan-table-panel">
      <div className="panel-header">
        <h2>Detail Kunjungan Pasien</h2>
        <span className="referral-panel-sub">{meta ? `${meta.total} kunjungan` : ''}</span>
      </div>
      {loading ? (
        <div className="empty-list">
          <div className="empty-title">Memuat detail kunjungan...</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Tidak ada kunjungan pada periode ini</div>
        </div>
      ) : (
        <>
          <div className="laporan-table-wrap">
            <table className="laporan-table">
              <thead>
                <tr>
                  <th>Nama Pasien</th>
                  <th>Tanggal Lahir</th>
                  <th>Tindakan</th>
                  <th>Jam Masuk</th>
                  <th>Jam Keluar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.encounterId}>
                    <td>{r.patientName}</td>
                    <td>{formatTanggal(r.birthDate)}</td>
                    <td>{r.tindakan}</td>
                    <td>{formatJam(r.jamMasuk)}</td>
                    <td>{formatJam(r.jamKeluar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="laporan-table-pagination">
              <button
                type="button"
                className="btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </button>
              <span>
                Halaman {meta.page} dari {meta.totalPages}
              </span>
              <button
                type="button"
                className="btn-outline"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
