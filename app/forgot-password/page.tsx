'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/page.css';
import '../styles/verify-email.css';

const LOCAL_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RequestState = 'idle' | 'loading' | 'sent' | 'error';

const ForgotPasswordPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<RequestState>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState('loading');

    try {
      const res = await fetch(`${LOCAL_API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message || 'Gagal mengirim link reset password');
      }

      setMessage(body.data?.message || 'Jika email terdaftar, tautan reset password telah dikirim.');
      setState('sent');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setState('error');
    }
  };

  return (
    <div className="verify-page">
      {/* LEFT PANEL */}
      <div className="left-panel">
        <div className="brand">
          <div className="brand-icon">
            <img src="/logo-apex-record.png" alt="ApexRecord" />
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
            {state !== 'sent' ? (
              <>
                <h2>Lupa Password</h2>
                <p className="verify-message">
                  Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mereset password.
                </p>

                <form onSubmit={handleSubmit} style={{ textAlign: 'left', marginTop: 24 }}>
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

                  {state === 'error' && (
                    <p className="verify-message" style={{ color: 'var(--error-color)' }}>{message}</p>
                  )}

                  <button type="submit" className="btn-primary" disabled={state === 'loading'}>
                    {state === 'loading' ? 'Mengirim...' : 'Kirim Tautan Reset'}
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </form>

                <p className="signup-text" style={{ marginTop: 20 }}>
                  <a href="#" className="link" onClick={(e) => { e.preventDefault(); router.push('/'); }}>
                    Kembali ke Login
                  </a>
                </p>
              </>
            ) : (
              <>
                <div className="verify-icon success">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Cek Email Anda</h2>
                <p className="verify-message">{message}</p>
                <button className="btn-primary" onClick={() => router.push('/')}>
                  Kembali ke Login
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}
          </div>

          <p className="version-text">ApexRecord v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
