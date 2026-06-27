'use client';

import { useEffect, useState } from 'react';
import PrivateRoute from '@/components/PrivateRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedbackModal from '@/components/feedback/FeedbackModal';
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

type MainTab = 'users' | 'practitioner';
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
  return (
    <PrivateRoute>
      <UserManagementPageInner />
    </PrivateRoute>
  );
}

function UserManagementPageInner() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [mainTab, setMainTab] = useState<MainTab>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const [userFilter, setUserFilter] = useState<UserFilter>('semua');
  const [userSearch, setUserSearch] = useState('');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);

  const [searchMethod, setSearchMethod] = useState<SearchMethod>('nik');
  const [searchInput, setSearchInput] = useState('');
  const [searchNamaInput, setSearchNamaInput] = useState({ nama: '', ttl: '' });
  const [showSearchResult, setShowSearchResult] = useState(false);

  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: '', clinicId: '' });
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: 'Hapus',
    cancelText: 'Batalkan',
    isDangerous: false,
  });

  const loadUsers = async () => {
    try {
      const data = await apiClient.get<User[]>('/users');
      setUsers(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data user';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Data',
        message,
      });
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
        const message = err instanceof ApiError ? err.message : 'Gagal memuat data';
        setFeedback({
          isOpen: true,
          type: 'error',
          title: 'Gagal Memuat Data',
          message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isSuperAdmin]);

  const switchMainTab = (tab: MainTab) => {
    setMainTab(tab);
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
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'User Berhasil Dibuat',
        message: `Email: ${created.email}\nPassword sementara: ${created.temporaryPassword}`,
      });
      setInviteForm({ email: '', name: '', role: roleOptions[0]?.value || '', clinicId: '' });
      setInviteModalOpen(false);
      await loadUsers();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal membuat user';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Membuat User',
        message,
      });
    } finally {
      setInviteSubmitting(false);
    }
  };

  const submitEditRole = async () => {
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      if (editTarget.role === 'pending') {
        await apiClient.patch(`/users/${editTarget.id}/role`, { role: editRole });
      } else {
        await apiClient.patch(`/users/${editTarget.id}/assign-role`, { role: editRole });
      }
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Peran Diperbarui',
        message: `Peran user berhasil diubah`,
      });
      setEditRoleModalOpen(false);
      setEditTarget(null);
      await loadUsers();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal mengubah peran';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Mengubah Peran',
        message,
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    setOpenMenuId(null);
    try {
      if (u.role === 'pending') {
        await apiClient.post(`/users/${u.id}/activate`);
      } else if (u.isActive) {
        await apiClient.post(`/users/${u.id}/deactivate`);
      } else {
        await apiClient.post(`/users/${u.id}/activate`);
      }
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Status Diperbarui',
        message: 'Status user berhasil diubah',
      });
      await loadUsers();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal mengubah status user';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Mengubah Status',
        message,
      });
    }
  };

  const handleDelete = (u: User) => {
    setOpenMenuId(null);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus User',
      message: `Apakah Anda yakin ingin menghapus user ${u.name}? Tindakan ini tidak bisa dibatalkan.`,
      isDangerous: true,
      confirmText: 'Hapus',
      cancelText: 'Batalkan',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/users/${u.id}`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setFeedback({
            isOpen: true,
            type: 'success',
            title: 'User Dihapus',
            message: `User ${u.name} berhasil dihapus`,
          });
          await loadUsers();
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Gagal menghapus user';
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setFeedback({
            isOpen: true,
            type: 'error',
            title: 'Gagal Menghapus User',
            message,
          });
        }
      },
    });
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
            Cari Tenaga Kesehatan (SATUSEHAT)
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
                  {searchMethod === 'nik' && (
                    <input
                      type="text"
                      placeholder="Masukkan 16 digit NIK"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="search-input"
                      maxLength={16}
                    />
                  )}
                  {searchMethod === 'nama' && (
                    <>
                      <input
                        type="text"
                        placeholder="Nama lengkap"
                        value={searchNamaInput.nama}
                        onChange={(e) => setSearchNamaInput({ ...searchNamaInput, nama: e.target.value })}
                        className="search-input"
                      />
                      <input
                        type="text"
                        placeholder="Tempat/Tanggal Lahir (TTL)"
                        value={searchNamaInput.ttl}
                        onChange={(e) => setSearchNamaInput({ ...searchNamaInput, ttl: e.target.value })}
                        className="search-input"
                      />
                    </>
                  )}
                  {searchMethod === 'id' && (
                    <input
                      type="text"
                      placeholder="Masukkan ID Practitioner"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="search-input"
                    />
                  )}
                  <button
                    className="btn-primary btn-search-full"
                    onClick={() => setShowSearchResult(true)}
                    disabled={
                      searchMethod === 'nik' && !searchInput ||
                      searchMethod === 'id' && !searchInput ||
                      searchMethod === 'nama' && (!searchNamaInput.nama || !searchNamaInput.ttl)
                    }
                  >
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
                      <button className="btn-add-to-clinic">
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

        {/* Confirmation Modal */}
        <div
          className={`modal-overlay ${confirmModal.isOpen ? 'open' : ''}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
          }}
        >
          <div className="confirmation-modal">
            <div className="confirmation-icon-wrapper" style={{ color: confirmModal.isDangerous ? '#EF4444' : '#3B82F6' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {confirmModal.isDangerous ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4v2m0 0v2m0-2h2m0 0h2m0 0v2m0-2h-2m0 0v-2m0 0h-2m0 0v2m0 0h2"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-1.217.2-1.994.2"
                  />
                )}
              </svg>
            </div>
            <div className="confirmation-title">{confirmModal.title}</div>
            <div className="confirmation-message">{confirmModal.message}</div>
            <div className="confirmation-buttons">
              <button
                className="btn-outline"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              >
                {confirmModal.cancelText || 'Batalkan'}
              </button>
              <button
                className={`btn-primary ${confirmModal.isDangerous ? 'btn-danger' : ''}`}
                onClick={async () => {
                  await confirmModal.onConfirm();
                }}
              >
                {confirmModal.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={feedback.isOpen}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          actionButton={{
            label: feedback.type === 'error' ? 'Coba Lagi' : 'Selesai',
            onClick: () => setFeedback({ ...feedback, isOpen: false }),
          }}
        />
      </main>
    </DashboardLayout>
  );
}
