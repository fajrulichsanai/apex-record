'use client';

import { useState } from 'react';
import './styles/page.css';

const LOCAL_API = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api';

type Mode = 'login' | 'register';

const LoginPage = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [ownerCode, setOwnerCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleRegister = async () => {
    const endpoint = `${LOCAL_API}/auth/register`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        ...(ownerCode ? { ownerCode } : {}),
      }),
    });

    const body = await res.json();

    if (!res.ok || !body.success) {
      throw new Error(body?.error?.message || 'Registrasi gagal');
    }

    return body.data;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const data = await handleRegister();
        setSuccessMsg(data?.message || 'Registrasi berhasil. Silakan cek email Anda.');
        setMode('login');
        setPassword('');
      } else {
        // Login flow is not yet wired to a backend endpoint.
        setErrorMsg('Login belum terhubung ke API. Silakan hubungi admin.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="7" width="18" height="13" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="white" strokeWidth="2"/>
              <path d="M12 11v4M10 13h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="name">Apex</span>
            <span className="sub">Record</span>
          </div>
        </div>

        <div className="hero">
          <h1>Kelola klinik<br/>lebih cerdas.</h1>
          <p>Platform manajemen klinik end-to-end — rekam medis, antrian, farmasi, billing, dan analitik bisnis dalam satu ekosistem yang terintegrasi penuh.</p>

          <div className="feature-pills">
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="white" strokeWidth="2" strokeLinejoin="round"/></svg>
              Rekam Medis FHIR-R4
            </span>
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Integrasi SATUSEHAT
            </span>
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="2"/><path d="M3 9h18M8 4v16" stroke="white" strokeWidth="2"/></svg>
              Farmasi &amp; Resep
            </span>
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2"/><path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Billing &amp; Invoice
            </span>
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 20V10M9 20V4M15 20v-7M21 20V8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Analitik Klinik
            </span>
            <span className="pill">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="8" r="3" stroke="white" strokeWidth="2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/><circle cx="18" cy="9" r="2.2" stroke="white" strokeWidth="2"/><path d="M16 20c0-2.5 1.8-4.5 4-4.8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
              Manajemen Antrian
            </span>
          </div>
        </div>

        <div className="footer-row">
          <span className="badge">
            <span className="dot-green"></span>
            Terintegrasi SATUSEHAT &middot; Kemenkes RI
          </span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel">
        <button className="dark-toggle">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="#374151" strokeWidth="2" strokeLinejoin="round"/></svg>
          Dark
        </button>

        <div className="form-wrap">
          {mode === 'login' ? (
            <>
              <h2>Selamat datang</h2>
              <p className="subtitle">Masuk ke akun ApexRecord Anda</p>
            </>
          ) : (
            <>
              <h2>Buat akun baru</h2>
              <p className="subtitle">Daftarkan klinik Anda ke ApexRecord</p>
            </>
          )}

          {errorMsg && <p className="form-message form-message-error">{errorMsg}</p>}
          {successMsg && <p className="form-message form-message-success">{successMsg}</p>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="name">Nama Lengkap</label>
                <div className="input-wrap">
                  <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="2"/></svg>
                  <input
                    type="text"
                    id="name"
                    placeholder="Dr. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Alamat Email</label>
              <div className="input-wrap">
                <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M2 7l8.4 6a2.6 2.6 0 0 0 3.2 0L22 7" stroke="currentColor" strokeWidth="2"/></svg>
                <input
                  type="email"
                  id="email"
                  placeholder="nama@klinik.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2"/></svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === 'register' ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={togglePasswordVisibility}
                  aria-label="Tampilkan password"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                </button>
              </div>
              {mode === 'login' && (
                <div className="row-between">
                  <a href="#" className="link">Lupa password?</a>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="ownerCode">Owner Code (opsional)</label>
                <div className="input-wrap">
                  <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/></svg>
                  <input
                    type="text"
                    id="ownerCode"
                    placeholder="Kode pendaftaran owner klinik"
                    value={ownerCode}
                    onChange={(e) => setOwnerCode(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div className="divider"><span>atau</span></div>

              <button className="btn-secondary" onClick={() => switchMode('register')}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Buat akun baru
              </button>

              <p className="signup-text">
                Belum punya akun?{' '}
                <a href="#" className="link" onClick={(e) => { e.preventDefault(); switchMode('register'); }}>
                  Daftar sekarang
                </a>
              </p>
            </>
          )}

          {mode === 'register' && (
            <p className="signup-text">
              Sudah punya akun?{' '}
              <a href="#" className="link" onClick={(e) => { e.preventDefault(); switchMode('login'); }}>
                Masuk di sini
              </a>
            </p>
          )}

          <p className="version-text">ApexRecord v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
