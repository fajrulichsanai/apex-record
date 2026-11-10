'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../styles/page.css';
import '../styles/verify-email.css';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { defaultRouteForRole } from '@/lib/permissions';

const LockIcon = () => (
  <svg className="icon-left" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

function passwordProblem(next: string, confirm: string, current: string): string | null {
  if (next.length < 8) return 'Password baru minimal 8 karakter.';
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return 'Password baru harus memuat huruf dan angka.';
  if (next === current) return 'Password baru harus berbeda dari password saat ini.';
  if (next !== confirm) return 'Konfirmasi password tidak cocok.';
  return null;
}

/**
 * Ganti password. Wajib sebelum memakai aplikasi bila akun dibuat dengan
 * password sementara (PRD Multi-Klinik alur A); bisa juga dibuka kapan saja
 * dari menu akun.
 */
export default function GantiPasswordPage() {
  const router = useRouter();
  const { account, loading, login, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!loading && !account) router.replace('/');
  }, [loading, account, router]);

  if (loading || !account) return null;

  const forced = !!account.mustChangePassword;
  const problem = passwordProblem(next, confirm, current);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (problem || !current) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/change-password', { currentPassword: current, newPassword: next });
      login({ ...account!, mustChangePassword: false });
      router.replace(defaultRouteForRole(account!.role));
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Gagal mengganti password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verify-page">
      <div className="left-panel">
        <div className="brand">
          <div className="brand-icon">
            {/* eslint-disable-next-line @next/next/no-img-element -- same static logo as the other auth pages */}
            <img src="/logo-apex-record.png" alt="ApexRecord" />
          </div>
          <div className="brand-text">
            <span className="name">Apex</span>
            <span className="sub">Record</span>
          </div>
        </div>
        <div className="hero">
          <h1>
            Satu langkah
            <br />
            lagi<span className="accent">.</span>
          </h1>
          <p>Ganti password sementara dengan password milik Anda sendiri agar akun tetap aman.</p>
        </div>
      </div>

      <div className="right-panel">
        <div className="form-wrap verify-wrap">
          <div className="verify-container">
            <h2>{forced ? 'Buat password Anda' : 'Ganti password'}</h2>
            <p className="verify-message">
              {forced
                ? `Halo ${account.name}, akun Anda masih memakai password sementara. Ganti dulu sebelum melanjutkan.`
                : 'Setelah diganti, sesi di perangkat lain akan berakhir.'}
            </p>

            <form onSubmit={submit} style={{ textAlign: 'left', marginTop: 24 }} noValidate>
              <div className="field">
                <label htmlFor="current">{forced ? 'Password sementara' : 'Password saat ini'}</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="current"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="next">Password baru</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="next"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    aria-describedby="pw-rule"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
                <small id="pw-rule" style={{ color: 'var(--text-muted, #6B695D)', fontSize: 12 }}>
                  Minimal 8 karakter, memuat huruf dan angka.
                </small>
              </div>
              <div className="field">
                <label htmlFor="confirm">Ulangi password baru</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="confirm"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              {(message || (touched && (problem || !current))) && (
                <div className="verify-alert error" role="alert" style={{ marginBottom: 14, color: '#C1381F', fontSize: 13 }}>
                  {message ?? (!current ? 'Isi password saat ini.' : problem)}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan password'}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13 }}>
              {forced ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.replace('/');
                  }}
                  style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Keluar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => router.back()}
                  style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
