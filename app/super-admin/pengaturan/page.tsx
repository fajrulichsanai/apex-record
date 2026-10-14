'use client';

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { featuresApi, type PlatformSettings } from '@/lib/features';
import { useToast } from '@/lib/toast-context';
import '../../styles/super-admin.css';
import '@/components/features/features.css';

/** Super admin: saklar tingkat platform (berlaku untuk semua klinik). */
export default function PengaturanPlatformPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    featuresApi
      .platformSettings()
      .then((res) => alive && setSettings(res))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan'));
    return () => {
      alive = false;
    };
  }, []);

  async function toggleSatusehat() {
    if (!settings) return;
    const next = !settings.satusehatEnabled;
    const message = next
      ? 'Nyalakan SATUSEHAT untuk semua klinik? Klinik yang tidak mematikannya akan mulai melihat menu SATUSEHAT dan mengirim data kunjungan.'
      : 'Matikan SATUSEHAT untuk semua klinik? Menu SATUSEHAT hilang dan tidak ada data yang dikirim ke SATUSEHAT.';
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      setSettings(await featuresApi.setPlatformSatusehat(next));
      showToast(next ? 'SATUSEHAT dinyalakan untuk platform' : 'SATUSEHAT dimatikan untuk platform', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Pengaturan Platform</h1>
            </div>
            <p className="page-subtitle">Saklar yang berlaku untuk seluruh klinik di ApexRecord.</p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="card">
          <h3>SATUSEHAT</h3>
          {!settings ? (
            !error && <p className="ft-empty">Memuat…</p>
          ) : (
            <div className="ft-setting">
              <div className="ft-setting-info">
                <span className="ft-setting-title">SATUSEHAT siap dipakai</span>
                <span className="ft-setting-desc">
                  Selama mati, menu SATUSEHAT tidak tampil di klinik mana pun dan tidak ada data yang dikirim ke
                  SATUSEHAT. Setelah dinyalakan, tiap owner klinik tetap bisa mematikan SATUSEHAT untuk kliniknya
                  sendiri, dan Anda bisa mengaturnya per klinik di detail klinik.
                </span>
                <span className={`ft-setting-state ${settings.satusehatEnabled ? 'on' : 'off'}`}>
                  {settings.satusehatEnabled ? 'Nyala' : 'Mati'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.satusehatEnabled}
                aria-label={`SATUSEHAT siap dipakai: ${settings.satusehatEnabled ? 'nyala' : 'mati'}`}
                className={`ft-switch ${settings.satusehatEnabled ? 'on' : ''}`}
                disabled={busy}
                onClick={toggleSatusehat}
              >
                <span />
              </button>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
