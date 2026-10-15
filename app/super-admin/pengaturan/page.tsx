'use client';

import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { featuresApi, type PlatformSettings } from '@/lib/features';
import { useToast } from '@/lib/toast-context';
import '../../styles/super-admin.css';
import '@/components/features/features.css';
import { PageHeader } from '@/components/super-admin/ui';
import DurationDiscountsCard from '@/components/subscription/DurationDiscountsCard';

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

  async function toggleAutoPurge() {
    if (!settings) return;
    const next = !settings.autoPurgeEnabled;
    const message = next
      ? 'Nyalakan hapus otomatis? Data klinik yang masa unduhnya sudah lewat akan dihapus permanen setiap malam.'
      : 'Matikan hapus otomatis? Data hanya dihapus saat Anda menekan "Hapus sekarang".';
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      setSettings(await featuresApi.setPlatformAutoPurge(next));
      showToast(next ? 'Hapus otomatis dinyalakan' : 'Hapus otomatis dimatikan', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <PageHeader title="Pengaturan Platform" subtitle="Saklar dan harga yang berlaku untuk seluruh klinik di ApexRecord." />

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

        <div className="card">
          <h3>Data klinik yang berhenti berlangganan</h3>
          {!settings ? (
            !error && <p className="ft-empty">Memuat…</p>
          ) : (
            <div className="ft-setting">
              <div className="ft-setting-info">
                <span className="ft-setting-title">Hapus otomatis setelah masa unduh 15 hari</span>
                <span className="ft-setting-desc">
                  Klinik yang langganannya berakhir bisa mengunduh semua datanya selama 15 hari dan diberi tahu lewat email
                  (saat berhenti, H-7, H-1). Saat menyala, data dihapus otomatis sehari setelahnya. Saat mati, Anda
                  menghapusnya sendiri di menu Penghapusan Data.
                </span>
                <span className={`ft-setting-state ${settings.autoPurgeEnabled ? 'on' : 'off'}`}>
                  {settings.autoPurgeEnabled ? 'Nyala' : 'Mati'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!settings.autoPurgeEnabled}
                aria-label={`Hapus otomatis: ${settings.autoPurgeEnabled ? 'nyala' : 'mati'}`}
                className={`ft-switch ${settings.autoPurgeEnabled ? 'on' : ''}`}
                disabled={busy}
                onClick={toggleAutoPurge}
              >
                <span />
              </button>
            </div>
          )}
        </div>

        <DurationDiscountsCard />
      </div>
    </SuperAdminLayout>
  );
}
