'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { PageHeader, Pager, StatusBadge, TableState, formatDateTime } from '@/components/super-admin/ui';
import InviteUserModal, { ROLE_LABEL } from '@/components/super-admin/InviteUserModal';
import LoginAsModal from '@/components/super-admin/LoginAsModal';
import { superAdminApi, type AdminUserRow } from '@/lib/super-admin';
import { clinicApi, type ClinicResponse } from '@/lib/clinic';
import { ApiError } from '@/lib/api-client';
import type { UserRole } from '@/types/user';
import '../../styles/super-admin.css';

const ROLE_FILTER = [
  { value: '', label: 'Semua peran' },
  ...Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })),
];

/** Semua pengguna lintas klinik di panel Super Admin (PRD PG-01..03). */
export default function SuperAdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [clinics, setClinics] = useState<ClinicResponse[]>([]);
  const [inviting, setInviting] = useState(false);
  const [loginAs, setLoginAs] = useState<AdminUserRow | null>(null);

  useEffect(() => {
    clinicApi
      .listAll()
      .then(setClinics)
      .catch(() => setClinics([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.users({
        page,
        limit: 20,
        role: (role || undefined) as UserRole | undefined,
        clinicId: clinicId ? Number(clinicId) : undefined,
        search: query || undefined,
      });
      setRows(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  }, [page, role, clinicId, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <PageHeader
          title="Pengguna"
          count={meta.total}
          subtitle="Semua akun di ApexRecord: Super Admin, Multi-Klinik Owner, dan akun klinik."
          actions={
            <button type="button" className="btn-primary" onClick={() => setInviting(true)}>
              + Undang pengguna
            </button>
          }
        />

        <div className="filter-bar">
          <input
            type="search"
            className="search-input"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari nama atau email"
          />
          <div className="filter-select">
            <CustomSelect value={role} onChange={(v) => { setRole(v); setPage(1); }} options={ROLE_FILTER} placeholder="Semua peran" />
          </div>
          <div className="filter-select">
            <CustomSelect
              value={clinicId}
              onChange={(v) => { setClinicId(v); setPage(1); }}
              options={[{ value: '', label: 'Semua klinik' }, ...clinics.map((c) => ({ value: String(c.id), label: c.name }))]}
              placeholder="Semua klinik"
            />
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Peran</th>
                <th>Klinik</th>
                <th>Status</th>
                <th>Login terakhir</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <TableState loading={loading} empty={rows.length === 0} colSpan={6} message="Tidak ada pengguna untuk filter ini." />
              {!loading &&
                rows.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-strong">
                      {u.name}
                      <span className="cell-sub">{u.email}</span>
                    </td>
                    <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td>
                      {u.clinicId ? (
                        <Link href={`/super-admin/clinics/${u.clinicId}?tab=pengguna`}>{u.clinicName ?? `Klinik #${u.clinicId}`}</Link>
                      ) : u.role === 'multi_clinic_owner' ? (
                        <Link href="/super-admin/multi-clinic-owners">Lihat cabang</Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <StatusBadge tone={u.isActive ? 'ok' : 'neutral'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</StatusBadge>
                      {u.mustChangePassword && <span className="cell-sub">Belum ganti password sementara</span>}
                    </td>
                    <td className="col-time">{formatDateTime(u.lastLoginAt)}</td>
                    <td>
                      {u.isActive && u.role !== 'super_admin' && (
                        <button type="button" className="btn-outline btn-sm" onClick={() => setLoginAs(u)}>
                          Login sebagai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pager page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} />
      </div>

      {inviting && <InviteUserModal onClose={() => setInviting(false)} onCreated={() => void load()} />}
      {loginAs && <LoginAsModal target={loginAs} onClose={() => setLoginAs(null)} />}
    </SuperAdminLayout>
  );
}
