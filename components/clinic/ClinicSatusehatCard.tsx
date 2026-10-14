'use client';

import { useEffect, useState } from 'react';
import { featuresApi, type ClinicSatusehat } from '@/lib/features';
import { useFeatures } from '@/lib/features-context';
import { useToast } from '@/lib/toast-context';
import '@/components/features/features.css';

/**
 * Owner: nyala/matikan SATUSEHAT untuk kliniknya. Tidak tampil selama super
 * admin belum membuka SATUSEHAT di tingkat platform.
 */
export default function ClinicSatusehatCard() {
  const { showToast } = useToast();
  const { reload } = useFeatures();
  const [data, setData] = useState<ClinicSatusehat | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    featuresApi
      .clinicSatusehat()
      .then((res) => alive && setData(res))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);

  if (!data?.globalEnabled) return null;

  async function toggle() {
    if (!data) return;
    const next = !data.enabled;
    if (
      !next &&
      !window.confirm(
        'Matikan SATUSEHAT untuk klinik ini? Kunjungan baru tidak akan dilaporkan ke SATUSEHAT sampai dinyalakan lagi. Data yang sudah terkirim tetap ada.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      setData(await featuresApi.setClinicSatusehat(next));
      await reload();
      showToast(next ? 'SATUSEHAT dinyalakan' : 'SATUSEHAT dimatikan', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
        SATUSEHAT
      </div>
      <div className="card-body">
        <div className="ft-setting">
          <div className="ft-setting-info">
            <span className="ft-setting-title">Kirim data ke SATUSEHAT</span>
            <span className="ft-setting-desc">
              Kunjungan dan data pelayanan dilaporkan ke SATUSEHAT Kemenkes. Matikan bila klinik belum siap memakai
              SATUSEHAT.
            </span>
            <span className={`ft-setting-state ${data.enabled ? 'on' : 'off'}`}>{data.enabled ? 'Nyala' : 'Mati'}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.enabled}
            aria-label={`SATUSEHAT: ${data.enabled ? 'nyala' : 'mati'}`}
            className={`ft-switch ${data.enabled ? 'on' : ''}`}
            disabled={busy}
            onClick={toggle}
          >
            <span />
          </button>
        </div>
      </div>
    </div>
  );
}
