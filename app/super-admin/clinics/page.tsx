'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { clinicSubscriptionApi } from '@/lib/subscription';
import type { ClinicSubscriptionSummary } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import '../../styles/super-admin.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'expired', label: 'Kadaluarsa' },
];

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SuperAdminClinicsPage() {
  const [rows, setRows] = useState<ClinicSubscriptionSummary[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clinicSubscriptionApi.listAll({
        search: search || undefined,
        status: (status || undefined) as 'active' | 'expired' | undefined,
        page,
        limit: 20,
      });
      setRows(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data klinik');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Klinik</h1>
              <span className="badge-count">{meta.total}</span>
            </div>
            <p className="page-subtitle">Seluruh klinik terdaftar dan status langganannya.</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Cari nama klinik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
          <div className="filter-select">
            <CustomSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} placeholder="Semua Status" />
          </div>
          <button type="button" className="btn-primary" onClick={() => setPage(1)}>
            Terapkan
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Klinik</th>
                <th>Paket</th>
                <th>Status</th>
                <th>Berakhir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty-row">Memuat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="empty-row">Tidak ada klinik untuk filter ini.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.clinicId}>
                    <td style={{ fontWeight: 600 }}>{row.clinicName}</td>
                    <td>{row.subscription?.plan?.name || '-'}</td>
                    <td>
                      {row.subscription?.status === 'active' ? (
                        <span className="tag tag-active">Aktif</span>
                      ) : (
                        <span className="tag tag-expired">{row.subscription ? 'Kadaluarsa' : 'Belum Berlangganan'}</span>
                      )}
                    </td>
                    <td>{formatDate(row.subscription?.endDate)}</td>
                    <td>
                      <Link href={`/super-admin/clinics/${row.clinicId}`} className="btn-outline btn-sm">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Sebelumnya
            </button>
            <span>Halaman {meta.page} dari {meta.totalPages}</span>
            <button type="button" disabled={page >= meta.totalPages} onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}>
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
