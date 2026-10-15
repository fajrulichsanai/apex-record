'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { PageHeader, Pager, StatusBadge, TableState, Tabs, Notice, formatDate } from '@/components/super-admin/ui';
import OwnerCodesPanel, { GenerateCodesModal } from '@/components/super-admin/OwnerCodesPanel';
import { SATUSEHAT_STATUS, clinicStatus } from '@/components/super-admin/clinic-status';
import { clinicSubscriptionApi } from '@/lib/subscription';
import type { ClinicSubscriptionSummary } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { formatBytes, storageApi, type ClinicStorageRow } from '@/lib/storage';
import '../../styles/super-admin.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'expired', label: 'Kadaluarsa' },
];

export default function SuperAdminClinicsPage() {
  return (
    <SuperAdminLayout>
      <Suspense>
        <ClinicsInner />
      </Suspense>
    </SuperAdminLayout>
  );
}

function ClinicsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('tab') === 'kode' ? 'kode' : 'klinik';
  const [rows, setRows] = useState<ClinicSubscriptionSummary[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [codesReload, setCodesReload] = useState(0);
  // Pemakaian storage per klinik — kolom pelengkap.
  const [storage, setStorage] = useState<Map<number, ClinicStorageRow>>(new Map());

  // Pencarian otomatis saat mengetik (PRD KL-02).
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    storageApi
      .clinics()
      .then((list) => setStorage(new Map(list.map((r) => [r.clinicId, r]))))
      .catch(() => setStorage(new Map()));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clinicSubscriptionApi.listAll({
        search: query || undefined,
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
  }, [query, status, page]);

  useEffect(() => {
    if (tab === 'klinik') void load();
  }, [load, tab]);

  return (
    <div className="sa-page">
      <PageHeader
        title="Klinik"
        count={tab === 'klinik' ? meta.total : undefined}
        subtitle="Seluruh klinik terdaftar. Buka satu klinik untuk mengurus langganan, pengguna, fitur, SATUSEHAT, dan migrasi pasien."
        actions={
          <button type="button" className="btn-primary" onClick={() => setGenerating(true)}>
            + Buat kode registrasi
          </button>
        }
      />

      {params.get('pilih') === 'migrasi' && (
        <Notice tone="info">Migrasi data pasien kini ada di detail klinik. Pilih klinik, lalu buka tab Migrasi Pasien.</Notice>
      )}

      <Tabs
        active={tab}
        hrefFor={(k) => (k === 'kode' ? '/super-admin/clinics?tab=kode' : '/super-admin/clinics')}
        tabs={[
          { key: 'klinik', label: 'Daftar klinik' },
          { key: 'kode', label: 'Kode registrasi' },
        ]}
      />

      {tab === 'kode' ? (
        <OwnerCodesPanel reloadKey={codesReload} />
      ) : (
        <>
          <div className="filter-bar">
            <input
              type="search"
              className="search-input"
              placeholder="Cari nama klinik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari nama klinik"
            />
            <div className="filter-select">
              <CustomSelect
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                  router.replace(v ? `/super-admin/clinics?status=${v}` : '/super-admin/clinics');
                }}
                options={STATUS_OPTIONS}
                placeholder="Semua status"
              />
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Klinik</th>
                  <th>Owner</th>
                  <th>Paket</th>
                  <th>Status</th>
                  <th>Berakhir</th>
                  <th>Akun</th>
                  <th>SATUSEHAT</th>
                  <th>Storage</th>
                  <th>Daftar</th>
                </tr>
              </thead>
              <tbody>
                <TableState loading={loading} empty={rows.length === 0} colSpan={9} message="Tidak ada klinik untuk filter ini." />
                {!loading &&
                  rows.map((row) => {
                    const st = clinicStatus(row.subscription, row);
                    const ss = row.satusehatStatus ? SATUSEHAT_STATUS[row.satusehatStatus] : null;
                    const usage = storage.get(row.clinicId);
                    return (
                      <tr key={row.clinicId}>
                        <td className="cell-strong">
                          <Link href={`/super-admin/clinics/${row.clinicId}`}>{row.clinicName}</Link>
                          {row.multiClinicOwner && <span className="cell-sub">Multi-klinik: {row.multiClinicOwner.name}</span>}
                        </td>
                        <td>
                          {row.owner ? (
                            <>
                              {row.owner.name}
                              <span className="cell-sub">{row.owner.email}</span>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{row.subscription?.plan?.name || '-'}</td>
                        <td>
                          <StatusBadge tone={st.tone} title={st.hint}>
                            {st.label}
                          </StatusBadge>
                          {st.hint && <span className="cell-sub">{st.hint}</span>}
                        </td>
                        <td className="cell-nowrap">{formatDate(row.subscription?.endDate)}</td>
                        <td>{row.activeUsers ?? '-'}</td>
                        <td>{ss ? <StatusBadge tone={ss.tone}>{ss.label}</StatusBadge> : '-'}</td>
                        <td className="cell-nowrap">
                          {usage ? (
                            <>
                              {formatBytes(usage.usedBytes)} / {formatBytes(usage.limitBytes)}
                              {usage.scope === 'multiklinik' && <span className="cell-sub">bersama multiklinik</span>}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="cell-nowrap">{formatDate(row.createdAt)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <Pager page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
        </>
      )}

      {generating && (
        <GenerateCodesModal
          onClose={() => setGenerating(false)}
          onCreated={() => {
            setCodesReload((n) => n + 1);
            if (tab !== 'kode') router.push('/super-admin/clinics?tab=kode');
          }}
        />
      )}
    </div>
  );
}
