'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FiAlertCircle, FiCheck, FiLoader } from 'react-icons/fi';
import {
  onboardingApi as satusehatOnboardingApi,
  satusehatApi,
  type ConnectResult,
  type OnboardingStatus as SatusehatStatus,
  type SatusehatConfig,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

const errText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'Gagal');

/** Status SATUSEHAT dianggap tersambung bila semua prasyarat sudah terdaftar */
export function satusehatConnected(s: SatusehatStatus | null) {
  if (!s?.auth.source) return false;
  const orgs = s.organizations.filter((o) => o.active);
  const locs = s.locations.filter((l) => l.active);
  return (
    orgs.length > 0 &&
    orgs.every((o) => o.satusehatId) &&
    locs.length > 0 &&
    locs.every((l) => l.satusehatId) &&
    s.practitioners.every((p) => p.satusehatId)
  );
}

/**
 * Langkah onboarding "Hubungkan SATUSEHAT": kredensial (Kode Akses API) bila
 * belum ada, lalu satu klik mendaftarkan organisasi, ruang poli, dan NIK nakes
 * memakai data Info Klinik — tanpa mengisi ulang alamat.
 */
export default function SatusehatStep({ onChanged }: { onChanged: (connected: boolean) => void }) {
  const { success, error: showError } = useToast();
  const [config, setConfig] = useState<SatusehatConfig | null>(null);
  const [status, setStatus] = useState<SatusehatStatus | null>(null);
  const [result, setResult] = useState<ConnectResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [cred, setCred] = useState({ organizationId: '', clientId: '', clientSecret: '', environment: 'sandbox' as 'sandbox' | 'production' });
  const [nik, setNik] = useState<Record<number, string>>({});

  const reload = useCallback(async () => {
    const [c, s] = await Promise.all([satusehatApi.getConfig(), satusehatOnboardingApi.status()]);
    setConfig(c);
    setStatus(s);
    onChanged(satusehatConnected(s));
    return s;
  }, [onChanged]);

  useEffect(() => {
    reload().catch((err) => showError(errText(err)));
  }, [reload, showError]);

  async function saveCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await satusehatApi.saveConfig({
        organizationId: cred.organizationId.trim(),
        clientId: cred.clientId.trim(),
        clientSecret: cred.clientSecret.trim(),
        environment: cred.environment,
      });
      setCred((c) => ({ ...c, clientSecret: '' }));
      success('Kode Akses API disimpan');
      await reload();
    } catch (err) {
      showError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    try {
      const r = await satusehatOnboardingApi.connect();
      setResult(r);
      if (r.connected) success('Klinik terhubung ke SATUSEHAT');
      await reload();
    } catch (err) {
      showError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function fixNik(id: number) {
    setBusy(true);
    try {
      const r = await satusehatOnboardingApi.fixPractitioner(id, nik[id]);
      success(`${r.name} terhubung ke SATUSEHAT`);
      setNik((n) => ({ ...n, [id]: '' }));
      await reload();
    } catch (err) {
      showError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!config || !status) return <p className="onboarding-step-desc">Memuat...</p>;

  const connected = satusehatConnected(status);
  const pendingPrac = status.practitioners.filter((p) => !p.satusehatId);

  return (
    <div className="onboarding-step-body">
      <h2>Hubungkan SATUSEHAT</h2>
      <p className="onboarding-step-desc">
        Wajib bagi fasyankes (Kemenkes). Data Info Klinik dipakai langsung — cukup Kode Akses API dari SATUSEHAT
        Platform, lalu klik Hubungkan.
      </p>

      {!config.configured ? (
        <form className="onboarding-form-grid" onSubmit={saveCredentials} aria-label="Kode Akses API SATUSEHAT">
          <label>
            Organization ID
            <input
              required
              value={cred.organizationId}
              onChange={(e) => setCred((c) => ({ ...c, organizationId: e.target.value }))}
              placeholder="mis. 100012345"
            />
          </label>
          <label>
            Environment
            <select
              value={cred.environment}
              onChange={(e) => setCred((c) => ({ ...c, environment: e.target.value as 'sandbox' | 'production' }))}
            >
              <option value="sandbox">Sandbox (uji coba)</option>
              <option value="production">Production</option>
            </select>
          </label>
          <label>
            Client ID
            <input required value={cred.clientId} onChange={(e) => setCred((c) => ({ ...c, clientId: e.target.value }))} />
          </label>
          <label>
            Client Secret
            <input
              required
              type="password"
              autoComplete="off"
              value={cred.clientSecret}
              onChange={(e) => setCred((c) => ({ ...c, clientSecret: e.target.value }))}
            />
          </label>
          <p className="onboarding-hint span-2">
            Ambil di SATUSEHAT Platform → Kode Akses API. Client Secret disimpan terenkripsi dan tidak pernah
            ditampilkan lagi.
          </p>
          <div className="onboarding-actions span-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan Kode Akses'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="ss-connect-summary">
            <span>
              Organization ID <strong>{config.source === 'env' ? config.envOrganizationId : config.organizationId}</strong>
            </span>
            <span>
              {(config.source === 'env' ? config.envEnvironment : config.environment) === 'production' ? 'Production' : 'Sandbox'}
            </span>
            {status.profile.verifiedName && <span>{status.profile.verifiedName}</span>}
          </div>

          {(result?.steps.length ?? 0) > 0 && (
            <ul className="ss-connect-steps" aria-label="Hasil koneksi SATUSEHAT">
              {result!.steps.map((s) => (
                <li key={s.key} className={s.status}>
                  {s.status === 'success' ? <FiCheck /> : <FiAlertCircle />}
                  <div>
                    <strong>{s.label}</strong>
                    {s.message && <span>{s.message}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pendingPrac.length > 0 && (connected || result) && (
            <div className="ss-connect-nik">
              <strong>NIK tenaga kesehatan</strong>
              <p className="onboarding-hint">Isi NIK sesuai KTP agar dokter/perawat terhubung ke SATUSEHAT.</p>
              {pendingPrac.map((p) => (
                <div key={p.id} className="ss-connect-nik-row">
                  <span>
                    {p.name}
                    {p.nikMasked && <small> · NIK {p.nikMasked}</small>}
                  </span>
                  <input
                    inputMode="numeric"
                    maxLength={16}
                    aria-label={`NIK ${p.name}`}
                    placeholder={p.nikMasked ? 'NIK baru (opsional)' : 'NIK 16 digit'}
                    value={nik[p.id] ?? ''}
                    onChange={(e) => setNik((n) => ({ ...n, [p.id]: e.target.value.replace(/\D/g, '') }))}
                  />
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy || (nik[p.id] ? nik[p.id].length !== 16 : !p.nikMasked)}
                    onClick={() => fixNik(p.id)}
                  >
                    {nik[p.id] ? 'Simpan & cocokkan' : 'Cocokkan ulang'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {connected ? (
            <p className="ss-connect-ok">
              <FiCheck /> Klinik sudah terhubung. Data kunjungan dikirim otomatis ke SATUSEHAT.
            </p>
          ) : null}

          <div className="onboarding-actions">
            <Link href="/satusehat/onboarding" className="btn-outline">
              Pengaturan lanjutan
            </Link>
            <button type="button" className="btn-primary" onClick={connect} disabled={busy}>
              {busy ? (
                <>
                  <FiLoader className="spin" /> Menghubungkan...
                </>
              ) : connected ? (
                'Periksa ulang'
              ) : (
                'Hubungkan SATUSEHAT'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
