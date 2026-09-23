'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ApiError } from '@/lib/api-client';
import { mfaApi, type MfaSetupResult } from '@/lib/mfa';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { MFA_ENFORCED_ROLES } from '@/lib/mfa-gate-context';
import '../../styles/keamanan.css';

type Step = 'idle' | 'setup' | 'backup-codes';

export default function KeamananPage() {
  const { success, error } = useToast();
  const { user, token, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [submitting, setSubmitting] = useState(false);

  const [setupData, setSetupData] = useState<MfaSetupResult | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await mfaApi.getStatus();
      setMfaEnabled(status.enabled);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat status MFA');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleStartSetup = async () => {
    try {
      setSubmitting(true);
      const data = await mfaApi.setup();
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memulai setup MFA');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const result = await mfaApi.enable(confirmCode.trim());
      setBackupCodes(result.backupCodes);
      setStep('backup-codes');
      setMfaEnabled(true);
      setConfirmCode('');
      // Keep the locally-stored user in sync so MfaGateProvider's redirect
      // check (which reads user.mfaEnabled) doesn't keep sending an
      // MFA-enforced-role user back here after they've just finished setup.
      if (user && token) login(token, { ...user, mfaEnabled: true });
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Kode tidak valid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishSetup = () => {
    setStep('idle');
    setSetupData(null);
    setBackupCodes([]);
    success('MFA berhasil diaktifkan');
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await mfaApi.disable(disablePassword);
      setMfaEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      if (user && token) login(token, { ...user, mfaEnabled: false });
      success('MFA telah dinonaktifkan');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Password salah');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n'));
    success('Kode cadangan disalin ke clipboard');
  };

  return (
    <DashboardLayout>
      <main className="content keamanan-page">
      <div className="keamanan-panel">
        <h1>Keamanan Akun</h1>
        <p className="keamanan-subtitle">
          Kelola verifikasi dua langkah (MFA) untuk akun Anda. Sangat disarankan untuk akun dengan akses admin/owner.
        </p>

        {!loading && !mfaEnabled && user && MFA_ENFORCED_ROLES.includes(user.role) && (
          <div className="keamanan-mandatory-notice">
            Peran Anda ({user.role}) wajib mengaktifkan MFA. Halaman lain tidak bisa diakses sampai Anda menyelesaikan
            setup di bawah ini.
          </div>
        )}

        {loading ? (
          <div className="keamanan-card">Memuat...</div>
        ) : step === 'setup' && setupData ? (
          <div className="keamanan-card">
            <h2>Pindai Kode QR</h2>
            <p>Gunakan aplikasi autentikator (Google Authenticator, Authy, dll) untuk memindai kode ini.</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URI QR code, not a static asset */}
            <img src={setupData.qrCodeDataUrl} alt="QR Code MFA" className="keamanan-qr" />
            <p className="keamanan-manual">
              Atau masukkan manual: <code>{setupData.secret}</code>
            </p>

            <form onSubmit={handleConfirmSetup} className="keamanan-form">
              <label htmlFor="confirmCode">Masukkan kode 6 digit untuk konfirmasi</label>
              <input
                id="confirmCode"
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
              />
              <div className="keamanan-actions">
                <button type="button" className="btn-outline" onClick={() => setStep('idle')} disabled={submitting}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Memverifikasi...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        ) : step === 'backup-codes' ? (
          <div className="keamanan-card">
            <h2>Simpan Kode Cadangan Anda</h2>
            <p>
              Kode ini hanya ditampilkan <strong>satu kali</strong>. Simpan di tempat aman — setiap kode hanya bisa dipakai
              sekali, untuk masuk jika Anda kehilangan akses ke aplikasi autentikator.
            </p>
            <div className="keamanan-backup-codes">
              {backupCodes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>
            <div className="keamanan-actions">
              <button type="button" className="btn-outline" onClick={copyBackupCodes}>
                Salin Semua
              </button>
              <button type="button" className="btn-primary" onClick={handleFinishSetup}>
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <div className="keamanan-card">
            <div className="keamanan-status-row">
              <div>
                <h2>Verifikasi Dua Langkah (MFA)</h2>
                <p className={mfaEnabled ? 'keamanan-status-on' : 'keamanan-status-off'}>
                  {mfaEnabled ? 'Aktif' : 'Belum aktif'}
                </p>
              </div>
              {mfaEnabled ? (
                <button type="button" className="btn-danger" onClick={() => setShowDisableForm((v) => !v)}>
                  Nonaktifkan
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={handleStartSetup} disabled={submitting}>
                  {submitting ? 'Memulai...' : 'Aktifkan MFA'}
                </button>
              )}
            </div>

            {showDisableForm && (
              <form onSubmit={handleDisable} className="keamanan-form keamanan-disable-form">
                <label htmlFor="disablePassword">Masukkan password Anda untuk menonaktifkan MFA</label>
                <input
                  id="disablePassword"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                />
                <div className="keamanan-actions">
                  <button type="button" className="btn-outline" onClick={() => setShowDisableForm(false)} disabled={submitting}>
                    Batal
                  </button>
                  <button type="submit" className="btn-danger" disabled={submitting}>
                    {submitting ? 'Memproses...' : 'Nonaktifkan MFA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
      </main>
    </DashboardLayout>
  );
}
