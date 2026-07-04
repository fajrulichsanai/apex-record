'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import '../styles/page.css';
import '../styles/verify-email.css';

const LOCAL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ResetState = 'idle' | 'loading' | 'success' | 'error';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<ResetState>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setState('error');
      setMessage('Token reset tidak ditemukan. Link mungkin tidak valid.');
      return;
    }

    if (password !== confirmPassword) {
      setState('error');
      setMessage('Konfirmasi password tidak cocok.');
      return;
    }

    setState('loading');

    try {
      const res = await fetch(`${LOCAL_API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message || 'Gagal mereset password');
      }

      setState('success');
      setMessage(body.data?.message || 'Password berhasil direset!');

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  return (
    <div className="verify-page">
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
        <div className="form-wrap verify-wrap">
          <div className="verify-container">
            {state === 'success' ? (
              <>
                <div className="verify-icon success">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Password Berhasil Direset!</h2>
                <p className="verify-message">{message}</p>
                <p className="verify-subtitle">Anda akan diarahkan ke halaman login dalam beberapa detik...</p>
                <button className="btn-primary" onClick={() => router.push('/')}>
                  Kembali ke Login
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            ) : (
              <>
                <h2>Reset Password</h2>
                <p className="verify-message">Masukkan password baru untuk akun Anda.</p>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: 24 }}>
                  <div className="field">
                    <label htmlFor="password">Password Baru</label>
                    <div className="input-wrap">
                      <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2"/></svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        className="toggle-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Tampilkan password"
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="confirmPassword">Konfirmasi Password</label>
                    <div className="input-wrap">
                      <svg className="icon-left" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2"/></svg>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                      />
                    </div>
                  </div>

                  {state === 'error' && (
                    <p className="verify-message" style={{ color: 'var(--error-color)' }}>{message}</p>
                  )}

                  <button type="submit" className="btn-primary" disabled={state === 'loading'}>
                    {state === 'loading' ? 'Memproses...' : 'Reset Password'}
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="version-text">ApexRecord v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="verify-page" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

export default ResetPasswordPage;
