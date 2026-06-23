'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { apiClient, ApiError } from '@/lib/api-client';
import type { User, RoleOption } from '@/types/user';
import type { Clinic } from '@/types/clinic';
import '../styles/user-management.css';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  dokter: 'Dokter',
  pending: 'Pending',
};

interface ClinicPractitioner {
  id: string;
  name: string;
  ihs?: string;
  nik?: string;
  avatarVariant: 'doc' | 'default';
  initials: string;
}

const CLINIC_PRACTITIONERS: ClinicPractitioner[] = [
  {
    id: 'pmenu-1',
    name: 'MU** DA** SA**',
    ihs: '13229303626',
    nik: '1307040705010001',
    avatarVariant: 'doc',
    initials: 'MD',
  },
  {
    id: 'pmenu-2',
    name: 'd** Ru** Sp**',
    nik: '7209061211900001',
    avatarVariant: 'default',
    initials: 'DR',
  },
];

type MainTab = 'users' | 'practitioner';
type PTab = 'search' | 'list';
type SearchMethod = 'nik' | 'nama' | 'id';
type UserFilter = 'semua' | 'pending' | 'aktif' | 'nonaktif';

function statusOf(u: User): 'aktif' | 'nonaktif' | 'pending' {
  if (u.role === 'pending') return 'pending';
  return u.isActive ? 'aktif' : 'nonaktif';
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [mainTab, setMainTab] = useState<MainTab>('users');
  const [pTab, setPTab] = useState<PTab>('search');

  const [users, setUsers] = useState<User[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const [userFilter, setUserFilter] = useState<UserFilter>('semua');
  const [userSearch, setUserSearch] = useState('');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [addClinicModalOpen, setAddClinicModalOpen] = useState(false);

  const [searchMethod, setSearchMethod] = useState<SearchMethod>('nik');
  const [showSearchResult, setShowSearchResult] = useState(false);

  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: '', clinicId: '' });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState('');

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await apiClient.get<User[]>('/users');
      setUsers(data);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal memuat data user');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [usersData, rolesData] = await Promise.all([
          apiClient.get<User[]>('/users'),
          apiClient.get<RoleOption[]>('/users/roles'),
        ]);
        setUsers(usersData);
        setRoleOptions(rolesData);
        setInviteForm((f) => (f.role ? f : { ...f, role: rolesData[0]?.value || '' }));
        if (isSuperAdmin) {
          const clinicsData = await apiClient.get<Clinic[]>('/clinics');
          setClinics(clinicsData);
        }
      } catch (err) {
        setActionError(err instanceof ApiError ? err.message : 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [isSuperAdmin]);

  const switchMainTab = (tab: MainTab) => {
    setMainTab(tab);
    if (tab === 'practitioner') setPTab('search');
  };

  const toggleDropdown = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const totalUsers = users.length;
  const aktifCount = users.filter((u) => statusOf(u) === 'aktif').length;
  const dokterCount = users.filter((u) => u.role === 'dokter').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  const filteredUsers = users.filter((u) => {
    const matchesFilter = userFilter === 'semua' || statusOf(u) === userFilter;
    const q = userSearch.toLowerCase();
    const matchesSearch =
      q === '' || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const openEditRole = (u: User) => {
    setEditTarget(u);
    setEditRole(roleOptions.find((r) => r.value === u.role)?.value || roleOptions[0]?.value || '');
    setEditRoleModalOpen(true);
    setOpenMenuId(null);
  };

  const submitInvite = async () => {
    setActionError('');
    setInviteSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
      };
      if (isSuperAdmin && inviteForm.clinicId) {
        payload.clinicId = Number(inviteForm.clinicId);
      }
      const created = await apiClient.post<{ temporaryPassword: string; email: string }>('/users/invite', payload);
      setTempPasswordNotice(`User ${created.email} dibuat. Password sementara: ${created.temporaryPassword}`);
      setInviteForm({ email: '', name: '', role: roleOptions[0]?.value || '', clinicId: '' });
      setInviteModalOpen(false);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal membuat user');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const submitEditRole = async () => {
    if (!editTarget) return;
    setActionError('');
    setEditSubmitting(true);
    try {
      if (editTarget.role === 'pending') {
        await apiClient.patch(`/users/${editTarget.id}/role`, { role: editRole });
      } else {
        await apiClient.patch(`/users/${editTarget.id}/assign-role`, { role: editRole });
      }
      setEditRoleModalOpen(false);
      setEditTarget(null);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengubah peran');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    setActionError('');
    setOpenMenuId(null);
    try {
      if (u.role === 'pending') {
        await apiClient.post(`/users/${u.id}/activate`);
      } else if (u.isActive) {
        await apiClient.post(`/users/${u.id}/deactivate`);
      } else {
        await apiClient.post(`/users/${u.id}/activate`);
      }
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal mengubah status user');
    }
  };

  const handleDelete = async (u: User) => {
    setOpenMenuId(null);
    if (!confirm(`Hapus user ${u.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setActionError('');
    try {
      await apiClient.delete(`/users/${u.id}`);
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal menghapus user');
    }
  };

  return (
    <DashboardLayout>
      <main className="content user-mgmt-page">
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div className="page-header-text">
            <h1>User & Staf Klinik</h1>
            <p>Kelola akses, peran, dan data tenaga kesehatan klinik Anda</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-primary" onClick={() => setInviteModalOpen(true)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah User
            </button>
          </div>
        </div>

        {(actionError || tempPasswordNotice) && (
          <div
            className="form-message form-message-error"
            style={{ marginBottom: 16, cursor: 'pointer' }}
            onClick={() => {
              setActionError('');
              setTempPasswordNotice('');
            }}
          >
            {actionError || tempPasswordNotice}
          </div>
        )}

        {/* Main Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${mainTab === 'users' ? 'active' : ''}`}
            onClick={() => switchMainTab('users')}
          >
            <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            User & Akses
          </button>
          <button
            className={`tab-btn ${mainTab === 'practitioner' ? 'active' : ''}`}
            onClick={() => switchMainTab('practitioner')}
          >
            <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Tenaga Kesehatan
          </button>
        </div>

        {/* VIEW: USER MANAGEMENT */}
        {mainTab === 'users' && (
          <div className="view-section visible">
            {/* Stats */}
            <div className="stat-row">
              <div className="stat-pill">
                <span className="stat-dot dot-blue" /> Total <strong>{totalUsers}</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-dot dot-green" /> Aktif <strong>{aktifCount}</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-dot" style={{ background: '#A855F7' }} /> Dokter{' '}
                <strong>{dokterCount}</strong>
              </div>
              <div className="stat-pill">
                <span className="stat-dot" style={{ background: '#4F46E5' }} /> Admin{' '}
                <strong>{adminCount}</strong>
              </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
              <div className="search-box">
                <span className="search-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari nama atau email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="filter-btns">
                {(['semua', 'pending', 'aktif', 'nonaktif'] as UserFilter[]).map((f) => (
                  <button
                    key={f}
                    className={`filter-btn ${userFilter === f ? 'active' : ''}`}
                    onClick={() => setUserFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* User list */}
            <div id="user-list">
              {loading && <p>Memuat data…</p>}
              {!loading && filteredUsers.length === 0 && <p>Tidak ada user ditemukan.</p>}
              {filteredUsers.map((u) => {
                const menuId = `menu-${u.id}`;
                const status = statusOf(u);
                const initials = initialsOf(u.name);
                const isSelf = u.id === currentUser?.id;
                return (
                  <div className="user-card" key={u.id} style={{ position: 'relative' }}>
                    <div className={`user-avatar ${u.role === 'admin' ? 'avatar-admin' : 'avatar-doc'}`}>
                      {initials}
                      <span
                        className={`status-dot status-${status === 'aktif' ? 'active' : status === 'nonaktif' ? 'inactive' : 'pending'}`}
                      />
                    </div>
                    <div className="user-info">
                      <div className="user-name">{u.name}</div>
                      <div className="user-email">{u.email}</div>
                      <div className="user-meta">
                        <span className="meta-item">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Dibuat {new Date(u.createdAt).toLocaleDateString('id-ID')}
                        </span>
                        {u.lastLoginAt && (
                          <span className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Login terakhir {new Date(u.lastLoginAt).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="user-badges">
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-dokter'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                      <span className={`badge badge-${status}`}>
                        ● {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                    {!isSelf && (
                      <>
                        <button
                          className="action-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(menuId);
                          }}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                        <div className={`dropdown-menu ${openMenuId === menuId ? 'open' : ''}`}>
                          <div className="dropdown-item" onClick={() => openEditRole(u)}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Ubah Peran
                          </div>
                          <div className="dropdown-item" onClick={() => handleToggleActive(u)}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                          </div>
                          <div className="dropdown-divider" />
                          <div className="dropdown-item danger" onClick={() => handleDelete(u)}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            Hapus
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: PRACTITIONER / SATUSEHAT (not yet backed by API — out of scope for this change) */}
        {mainTab === 'practitioner' && (
          <div className="view-section visible">
            <div className="inner-tabs">
              <button
                className={`tab-btn ${pTab === 'search' ? 'active' : ''}`}
                onClick={() => setPTab('search')}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Cari di SATUSEHAT
              </button>
              <button
                className={`tab-btn ${pTab === 'list' ? 'active' : ''}`}
                onClick={() => setPTab('list')}
              >
                <svg className="tab-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Daftar Klinik
              </button>
            </div>

            {pTab === 'search' && (
              <div className="view-section visible">
                <div className="satusehat-grid">
                  <div className="satusehat-panel">
                    <div className="satusehat-header">
                      <div className="satusehat-logo">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="satusehat-title">SATUSEHAT Search</div>
                        <div className="satusehat-subtitle">Cari tenaga kesehatan nasional</div>
                      </div>
                    </div>

                    <div className="method-section-label">Metode Pencarian</div>
                    <div className="search-methods">
                      <div
                        className={`method-btn ${searchMethod === 'nik' ? 'active' : ''}`}
                        onClick={() => setSearchMethod('nik')}
                      >
                        <div className="method-btn-label">NIK</div>
                        <div className="method-btn-sub">16 digit KTP</div>
                      </div>
                      <div
                        className={`method-btn ${searchMethod === 'nama' ? 'active' : ''}`}
                        onClick={() => setSearchMethod('nama')}
                      >
                        <div className="method-btn-label">Nama</div>
                        <div className="method-btn-sub">Nama + TTL</div>
                      </div>
                      <div
                        className={`method-btn ${searchMethod === 'id' ? 'active' : ''}`}
                        onClick={() => setSearchMethod('id')}
                      >
                        <div className="method-btn-label">ID</div>
                        <div className="method-btn-sub">ID Practitioner</div>
                      </div>
                    </div>

                    <div className="search-form">
                      <button className="btn-primary btn-search-full" onClick={() => setShowSearchResult(true)}>
                        Cari Practitioner
                      </button>
                    </div>
                  </div>

                  <div className="search-result-panel">
                    {showSearchResult ? (
                      <div style={{ width: '100%' }}>
                        <div className="result-count">
                          <span className="result-count-dot" />
                          1 Hasil Ditemukan
                        </div>
                        <div className="search-result-card">
                          <div className="result-avatar">DS</div>
                          <div className="result-info">
                            <div className="result-name">drg Daffa Safra</div>
                            <div className="result-tags">
                              <span className="result-tag">IHS: 13229303626</span>
                              <span className="result-tag">NIK: 13070***</span>
                              <span className="result-tag">Perempuan · 1990-06-12</span>
                            </div>
                          </div>
                          <button className="btn-add-to-clinic" onClick={() => setAddClinicModalOpen(true)}>
                            Tambah ke Klinik
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p>Mulai Pencarian</p>
                        <span>Pilih metode dan isi data di panel kiri</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {pTab === 'list' && (
              <div className="view-section visible">
                {CLINIC_PRACTITIONERS.map((p) => (
                  <div className="user-card" key={p.id} style={{ position: 'relative' }}>
                    <div className={`user-avatar ${p.avatarVariant === 'doc' ? 'avatar-doc' : 'avatar-default'}`}>
                      {p.initials}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{p.name}</div>
                      <div className="user-meta">
                        {p.ihs && <span className="meta-item">IHS: {p.ihs}</span>}
                        {p.nik && <span className="meta-item">NIK: {p.nik}</span>}
                      </div>
                    </div>
                    <span className="badge badge-aktif">● Aktif</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: Tambah User */}
        <div
          className={`modal-overlay ${inviteModalOpen ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="page-header-icon modal-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <div className="modal-title">Tambah User Baru</div>
                <div className="modal-subtitle">Buat akun staf klinik secara langsung</div>
              </div>
              <button className="modal-close" onClick={() => setInviteModalOpen(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="form-group modal-form-group">
              <label className="form-label">Nama</label>
              <input
                className="form-input modal-form-input"
                type="text"
                placeholder="Nama lengkap"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="form-group modal-form-group">
              <label className="form-label">Alamat Email</label>
              <input
                className="form-input modal-form-input"
                type="email"
                placeholder="nama@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {isSuperAdmin && (
              <div className="form-group modal-form-group">
                <label className="form-label">Klinik</label>
                <select
                  className="form-input"
                  value={inviteForm.clinicId}
                  onChange={(e) => setInviteForm((f) => ({ ...f, clinicId: e.target.value }))}
                >
                  <option value="">Pilih klinik…</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-section-label">Pilih Peran</div>
            <div className="role-selector">
              {roleOptions.map((r) => (
                <div
                  key={r.value}
                  className={`role-card ${inviteForm.role === r.value ? 'selected' : ''}`}
                  onClick={() => setInviteForm((f) => ({ ...f, role: r.value }))}
                >
                  <div className="role-card-label">{r.label}</div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setInviteModalOpen(false)}>
                Batal
              </button>
              <button
                className="btn-primary"
                disabled={inviteSubmitting || !inviteForm.email || !inviteForm.name || !inviteForm.role}
                onClick={submitInvite}
              >
                {inviteSubmitting ? 'Menyimpan…' : 'Buat User'}
              </button>
            </div>
          </div>
        </div>

        {/* MODAL: Ubah Peran */}
        <div
          className={`modal-overlay ${editRoleModalOpen ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditRoleModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="page-header-icon modal-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <div className="modal-title">Ubah Peran</div>
                <div className="modal-subtitle">{editTarget?.name}</div>
              </div>
              <button className="modal-close" onClick={() => setEditRoleModalOpen(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-section-label">Peran Baru</div>
            <div className="role-selector">
              {roleOptions.map((r) => (
                <div
                  key={r.value}
                  className={`role-card ${editRole === r.value ? 'selected' : ''}`}
                  onClick={() => setEditRole(r.value)}
                >
                  <div className="role-card-label">{r.label}</div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setEditRoleModalOpen(false)}>
                Batal
              </button>
              <button className="btn-primary" disabled={editSubmitting || !editRole} onClick={submitEditRole}>
                {editSubmitting ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>

        {/* MODAL: Add to Clinic (SATUSEHAT — UI only, no backend yet) */}
        <div
          className={`modal-overlay ${addClinicModalOpen ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddClinicModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="page-header-icon modal-icon modal-icon-satusehat">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <div className="modal-title">Tambah ke Klinik</div>
                <div className="modal-subtitle">drg Daffa Safra · IHS: 13229303626</div>
              </div>
              <button className="modal-close" onClick={() => setAddClinicModalOpen(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-hint">Integrasi SATUSEHAT belum tersedia di backend.</div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setAddClinicModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
