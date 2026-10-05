'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { satusehatApi, type SatusehatConfig, type SatusehatConfigPayload } from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { kfaApi, type KfaCatalogStatus } from '@/lib/master-data';

const EMPTY: SatusehatConfigPayload = {
  organizationId: '',
  clientId: '',
  clientSecret: '',
  environment: 'sandbox',
  poliLocationId: '',
};

export default function SatusehatConfigPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SatusehatConfig | null>(null);
  const [form, setForm] = useState<SatusehatConfigPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const { user } = useAuth();
  const [kfaStatus, setKfaStatus] = useState<KfaCatalogStatus | null>(null);
  const [kfaSyncing, setKfaSyncing] = useState(false);

  useEffect(() => {
    kfaApi
      .catalogStatus()
      .then(setKfaStatus)
      .catch(() => setKfaStatus(null));
  }, []);

  async function handleKfaSync(full: boolean) {
    setKfaSyncing(true);
    try {
      setKfaStatus(await kfaApi.syncCatalog(full));
      showToast('Sinkron katalog KFA dimulai di latar belakang', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memulai sinkron KFA', 'error');
    } finally {
      setKfaSyncing(false);
    }
  }

  useEffect(() => {
    satusehatApi
      .getConfig()
      .then((c) => {
        setConfig(c);
        setForm({
          organizationId: c.organizationId ?? '',
          clientId: c.clientId ?? '',
          clientSecret: '',
          environment: c.environment,
          poliLocationId: c.poliLocationId ?? '',
        });
      })
      .catch(() => setConfig(null));
  }, []);

  function update<K extends keyof SatusehatConfigPayload>(key: K, value: SatusehatConfigPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const saved = await satusehatApi.saveConfig({
        ...form,
        clientSecret: form.clientSecret?.trim() || undefined,
        poliLocationId: form.poliLocationId?.trim() || undefined,
      });
      setConfig(saved);
      setForm((f) => ({ ...f, clientSecret: '' }));
      showToast('Konfigurasi SATUSEHAT disimpan', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await satusehatApi.testConnection();
      setTestResult({
        ok: true,
        message: `Koneksi ke SATUSEHAT berhasil. Token berlaku s/d ${formatDateTime(res.tokenExpiresAt)}.`,
      });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Koneksi gagal' });
    } finally {
      setTesting(false);
    }
  }

  const secretKept = !!config?.hasClientSecret;

  return (
    <SatusehatShell
      title="Konfigurasi SATUSEHAT"
      subtitle="Kredensial dari portal SATUSEHAT Platform (menu Credentials) untuk klinik ini"
      requireWrite
    >
      <div className="ss-card">
        {config?.source === 'env' && (
          <div className="ss-notice" style={{ marginBottom: 16 }}>
            Memakai Kode Akses API dari env server — {config.envEnvironment === 'production' ? 'Production' : 'Sandbox'},
            Organization ID <span className="ss-mono">{config.envOrganizationId}</span>. Form di bawah hanya perlu diisi
            bila klinik ini memakai kredensial sendiri.
          </div>
        )}
        {config?.source === 'clinic' && (
          <div className="ss-notice" style={{ marginBottom: 16 }}>
            Terkonfigurasi — {config.environment === 'production' ? 'Production' : 'Sandbox'}, Organization ID{' '}
            <span className="ss-mono">{config.organizationId}</span>.
          </div>
        )}

        <form className="ss-form" onSubmit={handleSave}>
          <label>
            Environment
            <select
              className="ss-input"
              value={form.environment}
              onChange={(e) => update('environment', e.target.value as SatusehatConfigPayload['environment'])}
            >
              <option value="sandbox">Sandbox (uji coba)</option>
              <option value="production">Production</option>
            </select>
            <small>Uji dulu di Sandbox sampai semua langkah berhasil, baru pindah ke Production.</small>
          </label>
          <label>
            Organization ID
            <input
              className="ss-input"
              required
              value={form.organizationId}
              onChange={(e) => update('organizationId', e.target.value)}
              placeholder="mis. 100025702"
            />
            <small>
              Cari kode fasilitas Anda di <Link href="/satusehat/sarana">Master Sarana (MSI)</Link>.
            </small>
          </label>
          <label>
            Client ID
            <input
              className="ss-input"
              required
              autoComplete="off"
              value={form.clientId}
              onChange={(e) => update('clientId', e.target.value)}
            />
          </label>
          <label>
            Client Secret
            <input
              className="ss-input"
              type="password"
              required={!secretKept}
              autoComplete="new-password"
              placeholder={secretKept ? '•••••••• (tersimpan — kosongkan bila tidak diganti)' : ''}
              value={form.clientSecret ?? ''}
              onChange={(e) => update('clientSecret', e.target.value)}
            />
            <small>Disimpan terenkripsi di server dan tidak pernah ditampilkan kembali.</small>
          </label>
          <label>
            Location ID Poli (opsional)
            <input
              className="ss-input"
              value={form.poliLocationId ?? ''}
              onChange={(e) => update('poliLocationId', e.target.value)}
              placeholder="UUID Location di SATUSEHAT"
            />
            <small>
              Dipakai bila kunjungan tidak memiliki ruangan. Ruangan yang terdaftar di aplikasi akan dibuatkan Location
              otomatis.
            </small>
          </label>
          <div className="ss-actions">
            <button type="submit" className="ss-btn primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" className="ss-btn" onClick={handleTest} disabled={testing || !config?.configured}>
              {testing ? 'Menguji...' : 'Test koneksi'}
            </button>
          </div>
          {testResult && <div className={`ss-notice ${testResult.ok ? '' : 'warn'}`}>{testResult.message}</div>}
          {config?.tokenValidUntil && !testResult && (
            <p className="ss-muted">Token aktif s/d {formatDateTime(config.tokenValidUntil)}</p>
          )}
        </form>
      </div>

      <div className="ss-card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px' }}>Katalog Obat KFA</h3>
        {kfaStatus ? (
          <p className="ss-muted">
            {kfaStatus.products > 0
              ? `${kfaStatus.products.toLocaleString('id-ID')} obat tersimpan di server — pencarian obat di resep memakai data lokal.`
              : 'Belum ada salinan lokal — pencarian obat langsung ke API KFA SATUSEHAT.'}
            {kfaStatus.lastSyncedAt && ` Sinkron terakhir ${formatDateTime(kfaStatus.lastSyncedAt)}.`}
            {kfaStatus.running && ' Sinkron sedang berjalan…'}
          </p>
        ) : (
          <p className="ss-muted">Status katalog KFA tidak tersedia.</p>
        )}
        {user?.role === 'super_admin' && (
          <div className="ss-actions">
            <button type="button" className="ss-btn" onClick={() => handleKfaSync(false)} disabled={kfaSyncing}>
              Sinkron perubahan
            </button>
            <button type="button" className="ss-btn" onClick={() => handleKfaSync(true)} disabled={kfaSyncing}>
              Sinkron penuh
            </button>
          </div>
        )}
      </div>
    </SatusehatShell>
  );
}
