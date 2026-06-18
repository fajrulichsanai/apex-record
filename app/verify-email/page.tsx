'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import '../styles/verify-email.css';

const LOCAL_API = 'http://localhost:3001';

type VerificationState = 'loading' | 'success' | 'error' | 'expired';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Token verifikasi tidak ditemukan. Link mungkin tidak valid.');
      return;
    }

    const verifyEmail = async () => {
      try {
        console.log('Token yang dikirim:', token);

        const res = await fetch(`${LOCAL_API}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        console.log('Response status:', res.status);
        const body = await res.json();
        console.log('Response body:', body);

        if (!res.ok || !body.success) {
          const errorMessage = body?.error?.message || 'Verifikasi email gagal';

          if (res.status === 410 || errorMessage.includes('expired')) {
            setState('expired');
            setMessage('Link verifikasi telah kadaluarsa. Silakan minta link baru.');
          } else {
            setState('error');
            setMessage(errorMessage);
          }
          return;
        }

        setState('success');
        setMessage(body.data?.message || 'Email berhasil diverifikasi!');

        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (err) {
        console.error('Fetch error:', err);
        setState('error');
        setMessage(
          err instanceof Error ? err.message : 'Terjadi kesalahan saat verifikasi'
        );
      }
    };

    verifyEmail();
  }, [token, router]);

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
        <div className="form-wrap verify-wrap">
          <div className="verify-container">
            {state === 'loading' && (
              <>
                <div className="verify-icon loading">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15.7 50" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2>Memverifikasi Email</h2>
                <p className="verify-message">Silakan tunggu, kami sedang memverifikasi email Anda...</p>
              </>
            )}

            {state === 'success' && (
              <>
                <div className="verify-icon success">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Email Berhasil Diverifikasi!</h2>
                <p className="verify-message">{message}</p>
                <p className="verify-subtitle">Anda akan diarahkan ke halaman login dalam beberapa detik...</p>
                <button className="btn-primary" onClick={() => router.push('/')}>
                  Kembali ke Login
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </>
            )}

            {state === 'error' && (
              <>
                <div className="verify-icon error">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2>Verifikasi Gagal</h2>
                <p className="verify-message">{message}</p>
                <div className="button-group">
                  <button className="btn-primary" onClick={() => router.push('/')}>
                    Kembali ke Login
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </>
            )}

            {state === 'expired' && (
              <>
                <div className="verify-icon expired">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2>Link Verifikasi Kadaluarsa</h2>
                <p className="verify-message">{message}</p>
                <div className="button-group">
                  <button className="btn-primary" onClick={() => router.push('/')}>
                    Minta Link Baru
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 03.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="version-text">ApexRecord v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="verify-page">
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
      </div>
      <div className="right-panel">
        <div className="form-wrap verify-wrap">
          <div className="verify-container">
            <div className="verify-icon loading">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="15.7 50" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>Memverifikasi Email</h2>
            <p className="verify-message">Silakan tunggu...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
