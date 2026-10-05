'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { SatusehatShell, formatDateTime } from '@/components/satusehat/SatusehatShell';
import {
  onboardingApi,
  type OnboardingBatchResult,
  type OnboardingItem,
  type OnboardingStatus,
} from '@/lib/satusehat';
import { useToast } from '@/lib/toast-context';

type StepKey = 'auth' | 'verify' | 'structure' | 'locations' | 'practitioners' | 'patients';

function Step({
  no,
  title,
  done,
  doc,
  children,
}: {
  no: number;
  title: string;
  done: boolean;
  doc: string;
  children: ReactNode;
}) {
  return (
    <section className="ss-card ss-step">
      <div className="ss-step-head">
        <span className={`ss-step-no ${done ? 'done' : ''}`}>{done ? '✓' : no}</span>
        <h3>{title}</h3>
        <a className="ss-step-doc" href={doc} target="_blank" rel="noopener noreferrer">
          Dokumentasi
        </a>
      </div>
      <div className="ss-step-body">{children}</div>
    </section>
  );
}

function ItemTable({ items, empty }: { items: OnboardingItem[]; empty: string }) {
  if (!items.length) return <p className="ss-muted">{empty}</p>;
  return (
    <div className="ss-table-wrap">
      <table className="ss-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>ID SATUSEHAT</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td className="ss-mono">{i.satusehatId ?? '—'}</td>
              <td>
                <span className={`ss-badge ${i.satusehatId ? 'synced' : 'pending'}`}>
                  {i.satusehatId ? 'Terdaftar' : i.note ?? 'Belum'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchErrors({ result }: { result: OnboardingBatchResult | undefined }) {
  if (!result) return null;
  const failed = result.results.filter((r) => r.error);
  return (
    <div className={`ss-notice ${failed.length ? 'warn' : ''}`}>
      {result.succeeded} dari {result.processed} berhasil
      {result.skippedWithoutNik ? `, ${result.skippedWithoutNik} pasien tanpa NIK dilewati` : ''}.
      {failed.length > 0 && (
        <ul className="ss-step-errors">
          {failed.slice(0, 10).map((f) => (
            <li key={f.id}>
              <strong>{f.name}</strong>: {f.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const DOC = 'https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue';

/**
 * Persiapan sebelum mengirim data layanan, sesuai urutan katalog ReST API
 * SATUSEHAT: Autentikasi → Prerequisites (Organization, Location,
 * Practitioner, Patient) → Interoperabilitas.
 */
export default function SatusehatPersiapanPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [batch, setBatch] = useState<Partial<Record<StepKey, OnboardingBatchResult>>>({});
  const [error, setError] = useState<Partial<Record<StepKey, string>>>({});

  const reload = useCallback(async () => {
    try {
      setStatus(await onboardingApi.status());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat status persiapan', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    onboardingApi
      .status()
      .then(setStatus)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Gagal memuat status persiapan', 'error'));
  }, [showToast]);

  async function run(key: StepKey, fn: () => Promise<unknown>, okMessage: string) {
    setBusy(key);
    setError((e) => ({ ...e, [key]: undefined }));
    try {
      const res = await fn();
      if (res && typeof res === 'object' && 'results' in res) {
        setBatch((b) => ({ ...b, [key]: res as OnboardingBatchResult }));
      }
      showToast(okMessage, 'success');
      await reload();
    } catch (err) {
      setError((e) => ({ ...e, [key]: err instanceof Error ? err.message : 'Gagal' }));
    } finally {
      setBusy(null);
    }
  }

  const s = status;
  const configured = !!s?.auth.configured;
  const orgDone = !!(s?.organization.name && s.organization.poliOrgId);
  const locDone = !!s && s.locations.length > 0 && s.locations.every((l) => l.satusehatId || l.note);
  const pracDone = !!s && s.practitioners.length > 0 && s.practitioners.every((p) => p.satusehatId);
  const patientDone = !!s && s.patients.total > 0 && s.patients.linked === s.patients.total;
  const errorOf = (k: StepKey) => error[k] && <div className="ss-notice warn">{error[k]}</div>;

  return (
    <SatusehatShell
      title="Persiapan SATUSEHAT"
      subtitle="Lengkapi prasyarat ini berurutan sebelum data layanan (kunjungan, diagnosis, resep, dst.) dikirim"
      requireWrite
    >
      {!s ? (
        <div className="ss-card ss-empty">Memuat...</div>
      ) : (
        <div className="ss-steps">
          <Step no={1} title="Autentikasi" done={configured && !!s.auth.tokenValidUntil} doc={`${DOC}/authentication/apis/token/`}>
            {configured ? (
              <p>
                Kredensial tersimpan ({s.auth.environment === 'production' ? 'Production' : 'Sandbox'}).
                {s.auth.tokenValidUntil && ` Token aktif s/d ${formatDateTime(s.auth.tokenValidUntil)}.`}
              </p>
            ) : (
              <div className="ss-notice warn">
                Kredensial belum disimpan. <Link href="/satusehat/konfigurasi">Isi Konfigurasi →</Link>
              </div>
            )}
            {errorOf('auth')}
            <button
              type="button"
              className="ss-btn primary"
              disabled={!configured || busy !== null}
              onClick={() => run('auth', onboardingApi.auth, 'Autentikasi berhasil')}
            >
              {busy === 'auth' ? 'Menguji...' : 'Uji autentikasi'}
            </button>
          </Step>

          <Step no={2} title="Organization" done={orgDone} doc={`${DOC}/onboardings/apis/organization/`}>
            <dl className="ss-dl">
              <dt>Organisasi induk</dt>
              <dd>
                <span className="ss-mono">{s.organization.id ?? '—'}</span>
                {s.organization.name ? ` — ${s.organization.name}` : ' (belum diverifikasi)'}
              </dd>
              <dt>Pelayanan Kesehatan</dt>
              <dd className="ss-mono">{s.organization.suborgId ?? '—'}</dd>
              <dt>Poli Rawat Jalan</dt>
              <dd className="ss-mono">{s.organization.poliOrgId ?? '—'}</dd>
              <dt>Apotek</dt>
              <dd className="ss-mono">{s.organization.pharmacyOrgId ?? '—'}</dd>
            </dl>
            {errorOf('verify')}
            {errorOf('structure')}
            <div className="ss-actions">
              <button
                type="button"
                className="ss-btn"
                disabled={!configured || busy !== null}
                onClick={() => run('verify', onboardingApi.verifyOrganization, 'Organization induk terverifikasi')}
              >
                {busy === 'verify' ? 'Memeriksa...' : 'Verifikasi organisasi induk'}
              </button>
              <button
                type="button"
                className="ss-btn primary"
                disabled={!configured || busy !== null}
                onClick={() => run('structure', onboardingApi.buildOrganization, 'Struktur organisasi dibuat')}
              >
                {busy === 'structure'
                  ? 'Membuat...'
                  : s.organization.poliOrgId
                    ? 'Perbarui struktur organisasi'
                    : 'Buat struktur organisasi'}
              </button>
            </div>
          </Step>

          <Step no={3} title="Location (ruangan)" done={locDone} doc={`${DOC}/onboardings/apis/location/`}>
            <ItemTable items={s.locations} empty="Belum ada ruangan. Tambahkan ruangan di Pengaturan." />
            <BatchErrors result={batch.locations} />
            {errorOf('locations')}
            <button
              type="button"
              className="ss-btn primary"
              disabled={!s.organization.poliOrgId || busy !== null}
              onClick={() => run('locations', onboardingApi.locations, 'Ruangan didaftarkan')}
            >
              {busy === 'locations' ? 'Mendaftarkan...' : 'Daftarkan ruangan ke SATUSEHAT'}
            </button>
            {!s.organization.poliOrgId && <p className="ss-muted">Selesaikan langkah 2 terlebih dahulu.</p>}
          </Step>

          <Step no={4} title="Practitioner (tenaga kesehatan)" done={pracDone} doc={`${DOC}/onboardings/apis/practitioner/`}>
            <ItemTable items={s.practitioners} empty="Belum ada data dokter/tenaga kesehatan." />
            <BatchErrors result={batch.practitioners} />
            {errorOf('practitioners')}
            <button
              type="button"
              className="ss-btn primary"
              disabled={!configured || busy !== null}
              onClick={() => run('practitioners', onboardingApi.practitioners, 'Pencocokan tenaga kesehatan selesai')}
            >
              {busy === 'practitioners' ? 'Mencocokkan...' : 'Cocokkan NIK tenaga kesehatan'}
            </button>
          </Step>

          <Step no={5} title="Patient (pasien)" done={patientDone} doc={`${DOC}/onboardings/apis/patient/`}>
            <p>
              {s.patients.linked} dari {s.patients.total} pasien sudah memiliki ID SATUSEHAT. Pasien baru juga
              dicocokkan otomatis saat kunjungannya dikirim.
            </p>
            <BatchErrors result={batch.patients} />
            {errorOf('patients')}
            <button
              type="button"
              className="ss-btn primary"
              disabled={!configured || busy !== null || patientDone}
              onClick={() => run('patients', onboardingApi.patients, 'Pencocokan pasien selesai')}
            >
              {busy === 'patients' ? 'Mencocokkan...' : 'Cocokkan 50 pasien berikutnya'}
            </button>
          </Step>

          <div className="ss-notice">
            Setelah langkah di atas selesai, data layanan dikirim otomatis saat status kunjungan berubah, atau manual
            dari <Link href="/satusehat/data">Data &amp; Status Sync</Link>.
          </div>
        </div>
      )}
    </SatusehatShell>
  );
}
