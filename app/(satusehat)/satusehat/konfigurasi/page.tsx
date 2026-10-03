'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import { satusehatApi, type SatusehatConfigPayload, type SatusehatSummary } from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

export default function SatusehatConfigPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<SatusehatSummary['config'] | null>(null);
  const [form, setForm] = useState<SatusehatConfigPayload>({
    satusehatOrgId: '',
    satusehatClientId: '',
    satusehatClientSecret: '',
    satusehatEnvironment: 'sandbox',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    satusehatApi
      .getSummary()
      .then((s) => {
        setConfig(s.config);
        setForm((f) => ({
          ...f,
          satusehatOrgId: s.config.organizationId ?? '',
          satusehatEnvironment: s.config.environment,
        }));
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
      await satusehatApi.saveConfig(form);
      showToast('Konfigurasi SATUSEHAT disimpan', 'success');
      setForm((f) => ({ ...f, satusehatClientSecret: '' }));
      setConfig({
        configured: true,
        environment: form.satusehatEnvironment,
        organizationId: form.satusehatOrgId,
        hasClientId: true,
        tokenValidUntil: null,
      });
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
        message: `${res.message}. Token berlaku s/d ${formatDateTime(res.tokenExpiresAt)}.`,
      });
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Koneksi gagal' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <SatusehatShell
      title="Konfigurasi SATUSEHAT"
      subtitle="Kredensial dari portal SATUSEHAT Platform (menu Credentials) untuk klinik ini"
      requireWrite
    >
      <div className="ss-card">
        {config?.configured && (
          <div className="ss-notice" style={{ marginBottom: 16 }}>
            Sudah terkonfigurasi ({config.environment === 'production' ? 'Production' : 'Sandbox'}, Organization ID{' '}
            <span className="ss-mono">{config.organizationId}</span>). Isi ulang semua kolom untuk mengganti kredensial.
          </div>
        )}

        <form className="ss-form" onSubmit={handleSave}>
          <label>
            Environment
            <select
              className="ss-input"
              value={form.satusehatEnvironment}
              onChange={(e) => update('satusehatEnvironment', e.target.value as SatusehatConfigPayload['satusehatEnvironment'])}
            >
              <option value="sandbox">Sandbox (uji coba)</option>
              <option value="production">Production</option>
            </select>
          </label>
          <label>
            Organization ID
            <input
              className="ss-input"
              required
              value={form.satusehatOrgId}
              onChange={(e) => update('satusehatOrgId', e.target.value)}
              placeholder="mis. 100011961"
            />
            <small>
              Kode fasilitas bisa dicari di <Link href="/satusehat/sarana">Master Sarana (MSI)</Link>.
            </small>
          </label>
          <label>
            Client ID
            <input
              className="ss-input"
              required
              autoComplete="off"
              value={form.satusehatClientId}
              onChange={(e) => update('satusehatClientId', e.target.value)}
            />
          </label>
          <label>
            Client Secret
            <input
              className="ss-input"
              type="password"
              required
              autoComplete="new-password"
              value={form.satusehatClientSecret}
              onChange={(e) => update('satusehatClientSecret', e.target.value)}
            />
            <small>Disimpan terenkripsi di server dan tidak pernah ditampilkan kembali.</small>
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
        </form>
      </div>
    </SatusehatShell>
  );
}
