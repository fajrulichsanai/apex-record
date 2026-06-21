'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '../styles/user-management.css';

type UserRole = 'admin' | 'dokter';
type UserStatus = 'aktif' | 'nonaktif' | 'menunggu';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  registeredDaysAgo: number;
  lastLogin?: string;
  ihs?: string;
}

const USERS: ManagedUser[] = [
  {
    id: 'biim',
    name: 'biim',
    email: 'silent***@gmail.com',
    role: 'admin',
    status: 'aktif',
    registeredDaysAgo: 25,
    lastLogin: 'hari ini',
  },
  {
    id: 'daffa',
    name: 'drg Daffa Safra',
    email: 'daffasa***@gmail.com',
    role: 'dokter',
    status: 'aktif',
    registeredDaysAgo: 25,
    ihs: '13229303626',
  },
];

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
type UserFilter = 'semua' | 'menunggu' | 'aktif' | 'nonaktif';
type InviteRole = 'admin' | 'dokter' | 'staff';
type EditRole = 'admin2' | 'dokter2' | 'staff2';
type AddClinicRole = 'admin3' | 'dokter3';

export default function UserManagementPage() {
  const [mainTab, setMainTab] = useState<MainTab>('users');
  const [pTab, setPTab] = useState<PTab>('search');

  const [userFilter, setUserFilter] = useState<UserFilter>('semua');
  const [userSearch, setUserSearch] = useState('');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false);
  const [addClinicModalOpen, setAddClinicModalOpen] = useState(false);

  const [searchMethod, setSearchMethod] = useState<SearchMethod>('nik');
  const [showSearchResult, setShowSearchResult] = useState(false);

  const [inviteRole, setInviteRole] = useState<InviteRole>('admin');
  const [editRole, setEditRole] = useState<EditRole>('admin2');
  const [addClinicRole, setAddClinicRole] = useState<AddClinicRole>('dokter3');

  const switchMainTab = (tab: MainTab) => {
    setMainTab(tab);
    if (tab === 'practitioner') setPTab('search');
  };

  const toggleDropdown = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  const totalUsers = USERS.length;
  const aktifCount = USERS.filter((u) => u.status === 'aktif').length;
  const dokterCount = USERS.filter((u) => u.role === 'dokter').length;
  const adminCount = USERS.filter((u) => u.role === 'admin').length;

  const filteredUsers = USERS.filter((u) => {
    const matchesFilter = userFilter === 'semua' || u.status === userFilter;
    const q = userSearch.toLowerCase();
    const matchesSearch =
      q === '' || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

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
            <button className="btn-outline" onClick={() => setInviteModalOpen(true)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Undang via Email
            </button>
            <button className="btn-primary" onClick={() => switchMainTab('practitioner')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Cari SATUSEHAT
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${mainTab === 'users' ? 'active' : ''}`}
            onClick={() => switchMainTab('users')}
          >
            <svg
              className="tab-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <svg
              className="tab-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
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
                {(['semua', 'menunggu', 'aktif', 'nonaktif'] as UserFilter[]).map((f) => (
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
              {filteredUsers.map((u) => {
                const menuId = `menu-${u.id}`;
                const initials = u.name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase();
                return (
                  <div className="user-card" key={u.id} style={{ position: 'relative' }}>
                    <div className={`user-avatar ${u.role === 'admin' ? 'avatar-admin' : 'avatar-doc'}`}>
                      {initials}
                      <span className={`status-dot status-${u.status === 'aktif' ? 'active' : u.status === 'nonaktif' ? 'inactive' : 'pending'}`} />
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
                          Daftar {u.registeredDaysAgo} hari lalu
                        </span>
                        {u.lastLogin && (
                          <span className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Login terakhir {u.lastLogin}
                          </span>
                        )}
                        {u.ihs && (
                          <span className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            IHS: {u.ihs}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="user-badges">
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-dokter'}`}>
                        {u.role === 'admin' ? 'Admin' : 'Dokter'}
                      </span>
                      <span className={`badge badge-${u.status}`}>
                        ● {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </div>
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
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          setEditRoleModalOpen(true);
                          setOpenMenuId(null);
                        }}
                      >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Ubah Peran
                      </div>
                      {u.role === 'admin' ? (
                        <div className="dropdown-item">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                          </svg>
                          Reset Password
                        </div>
                      ) : (
                        <div
                          className="dropdown-item"
                          onClick={() => {
                            switchMainTab('practitioner');
                            setOpenMenuId(null);
                          }}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          Lihat Data SATUSEHAT
                        </div>
                      )}
                      <div className="dropdown-divider" />
                      <div className="dropdown-item danger">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        Nonaktifkan
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: PRACTITIONER / SATUSEHAT */}
        {mainTab === 'practitioner' && (
          <div className="view-section visible">
            {/* Inner tabs */}
            <div className="inner-tabs">
              <button
                className={`tab-btn ${pTab === 'search' ? 'active' : ''}`}
                onClick={() => setPTab('search')}
              >
                <svg
                  className="tab-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                <svg
                  className="tab-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Daftar Klinik
              </button>
            </div>

            {/* SEARCH PANEL */}
            {pTab === 'search' && (
              <div className="view-section visible">
                <div className="satusehat-grid">
                  {/* Left: Search Form */}
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
                        <div className="method-btn-label">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                            />
                          </svg>
                          NIK
                        </div>
                        <div className="method-btn-sub">16 digit KTP</div>
                      </div>
                      <div
                        className={`method-btn ${searchMethod === 'nama' ? 'active' : ''}`}
                        onClick={() => setSearchMethod('nama')}
                      >
                        <div className="method-btn-label">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Nama
                        </div>
                        <div className="method-btn-sub">Nama + TTL</div>
                      </div>
                      <div
                        className={`method-btn ${searchMethod === 'id' ? 'active' : ''}`}
                        onClick={() => setSearchMethod('id')}
                      >
                        <div className="method-btn-label">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                            />
                          </svg>
                          ID
                        </div>
                        <div className="method-btn-sub">ID Practitioner</div>
                      </div>
                    </div>

                    {searchMethod === 'nik' && (
                      <div className="search-form">
                        <div className="form-group">
                          <label className="form-label">NIK Practitioner</label>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="Masukkan 16 digit NIK…"
                            maxLength={16}
                            onInput={(e) => {
                              const target = e.currentTarget;
                              target.value = target.value.replace(/\D/g, '');
                            }}
                          />
                        </div>
                        <button
                          className="btn-primary btn-search-full"
                          onClick={() => setShowSearchResult(true)}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Cari Practitioner
                        </button>
                      </div>
                    )}

                    {searchMethod === 'nama' && (
                      <div className="search-form">
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Nama</label>
                            <input className="form-input" type="text" placeholder="Nama lengkap…" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Gender</label>
                            <select className="form-input" style={{ cursor: 'pointer' }}>
                              <option value="">Pilih gender</option>
                              <option>Laki-laki</option>
                              <option>Perempuan</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tanggal Lahir</label>
                          <input className="form-input" type="date" />
                        </div>
                        <button
                          className="btn-primary btn-search-full"
                          onClick={() => setShowSearchResult(true)}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Cari Practitioner
                        </button>
                      </div>
                    )}

                    {searchMethod === 'id' && (
                      <div className="search-form">
                        <div className="form-group">
                          <label className="form-label">ID Practitioner SATUSEHAT</label>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="Masukkan ID Practitioner…"
                          />
                        </div>
                        <button
                          className="btn-primary btn-search-full"
                          onClick={() => setShowSearchResult(true)}
                        >
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Cari Practitioner
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Result */}
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
                              <span className="result-tag">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                  />
                                </svg>
                                IHS: 13229303626
                              </span>
                              <span className="result-tag">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                  />
                                </svg>
                                NIK: 13070***
                              </span>
                              <span className="result-tag">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                Perempuan · 1990-06-12
                              </span>
                            </div>
                          </div>
                          <button
                            className="btn-add-to-clinic"
                            onClick={() => setAddClinicModalOpen(true)}
                          >
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Tambah ke Klinik
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <p>Mulai Pencarian</p>
                        <span>Pilih metode dan isi data di panel kiri</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DAFTAR KLINIK */}
            {pTab === 'list' && (
              <div className="view-section visible">
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
                    <input type="text" placeholder="Cari nama atau NIK…" />
                  </div>
                  <div className="filter-btns">
                    <button className="filter-btn active">Semua</button>
                    <button className="filter-btn">Aktif</button>
                    <button className="filter-btn">Nonaktif</button>
                  </div>
                </div>

                {CLINIC_PRACTITIONERS.map((p) => (
                  <div className="user-card" key={p.id} style={{ position: 'relative' }}>
                    <div className={`user-avatar ${p.avatarVariant === 'doc' ? 'avatar-doc' : 'avatar-default'}`}>
                      {p.initials}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{p.name}</div>
                      <div className="user-meta">
                        {p.ihs && (
                          <span className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                            IHS: {p.ihs}
                          </span>
                        )}
                        {p.nik && (
                          <span className="meta-item">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                              />
                            </svg>
                            NIK: {p.nik}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="badge badge-aktif">● Aktif</span>
                    <button
                      className="action-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(p.id);
                      }}
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    <div className={`dropdown-menu ${openMenuId === p.id ? 'open' : ''}`}>
                      <div className="dropdown-item">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Lihat Detail
                      </div>
                      <div className="dropdown-item danger">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                          />
                        </svg>
                        Nonaktifkan
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODALS */}

        {/* Invite via email */}
        <div className={`modal-overlay ${inviteModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setInviteModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="page-header-icon modal-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="modal-title">Undang Anggota Baru</div>
                <div className="modal-subtitle">Kirim undangan ke email staf klinik</div>
              </div>
              <button className="modal-close" onClick={() => setInviteModalOpen(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="form-group modal-form-group">
              <label className="form-label">Alamat Email</label>
              <input className="form-input modal-form-input" type="email" placeholder="nama@email.com" />
            </div>
            <div className="modal-section-label">Pilih Peran</div>
            <div className="role-selector">
              <div
                className={`role-card ${inviteRole === 'admin' ? 'selected' : ''}`}
                onClick={() => setInviteRole('admin')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Admin</div>
                <div className="role-card-desc">Akses penuh klinik</div>
              </div>
              <div
                className={`role-card ${inviteRole === 'dokter' ? 'selected' : ''}`}
                onClick={() => setInviteRole('dokter')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Dokter</div>
                <div className="role-card-desc">Akses rekam medis</div>
              </div>
              <div
                className={`role-card ${inviteRole === 'staff' ? 'selected' : ''}`}
                onClick={() => setInviteRole('staff')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Staf</div>
                <div className="role-card-desc">Akses terbatas</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setInviteModalOpen(false)}>
                Batal
              </button>
              <button className="btn-primary">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Kirim Undangan
              </button>
            </div>
          </div>
        </div>

        {/* Edit Role */}
        <div className={`modal-overlay ${editRoleModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setEditRoleModalOpen(false); }}>
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
                <div className="modal-subtitle">Ganti hak akses pengguna ini</div>
              </div>
              <button className="modal-close" onClick={() => setEditRoleModalOpen(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-section-label">Peran Baru</div>
            <div className="role-selector">
              <div
                className={`role-card ${editRole === 'admin2' ? 'selected' : ''}`}
                onClick={() => setEditRole('admin2')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Admin</div>
                <div className="role-card-desc">Akses penuh klinik</div>
              </div>
              <div
                className={`role-card ${editRole === 'dokter2' ? 'selected' : ''}`}
                onClick={() => setEditRole('dokter2')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Dokter</div>
                <div className="role-card-desc">Akses rekam medis</div>
              </div>
              <div
                className={`role-card ${editRole === 'staff2' ? 'selected' : ''}`}
                onClick={() => setEditRole('staff2')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Staf</div>
                <div className="role-card-desc">Akses terbatas</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setEditRoleModalOpen(false)}>
                Batal
              </button>
              <button className="btn-primary">Simpan Perubahan</button>
            </div>
          </div>
        </div>

        {/* Add to Clinic (from SATUSEHAT) */}
        <div className={`modal-overlay ${addClinicModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setAddClinicModalOpen(false); }}>
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
            <div className="modal-section-label">Tetapkan Peran</div>
            <div className="role-selector" style={{ marginBottom: '16px' }}>
              <div
                className={`role-card ${addClinicRole === 'admin3' ? 'selected' : ''}`}
                onClick={() => setAddClinicRole('admin3')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Admin</div>
                <div className="role-card-desc">Akses penuh</div>
              </div>
              <div
                className={`role-card ${addClinicRole === 'dokter3' ? 'selected' : ''}`}
                onClick={() => setAddClinicRole('dokter3')}
              >
                <div className="role-card-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div className="role-card-label">Dokter</div>
                <div className="role-card-desc">Akses rekam medis</div>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="form-label">Email Akun (opsional)</label>
              <input
                className="form-input modal-form-input"
                type="email"
                placeholder="Hubungkan ke akun email staf…"
              />
            </div>
            <div className="modal-hint">
              Jika dikosongkan, akun dibuat tanpa login (hanya data tenaga kesehatan)
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setAddClinicModalOpen(false)}>
                Batal
              </button>
              <button className="btn-primary">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambahkan ke Klinik
              </button>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
