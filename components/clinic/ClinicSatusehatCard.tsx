'use client';

import { useEffect, useState } from 'react';
import { featuresApi, type ClinicSatusehat } from '@/lib/features';
import '@/components/features/features.css';

/**
 * Owner: status SATUSEHAT kliniknya (hanya-baca). SATUSEHAT diaktifkan oleh
 * admin ApexRecord per faskes setelah akses SATUSEHAT disetujui.
 */
export default function ClinicSatusehatCard() {
  const [data, setData] = useState<ClinicSatusehat | null>(null);

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

  if (!data) return null;

  const state = data.active ? 'on' : 'off';
  const label = data.active ? 'Aktif' : 'Belum aktif';
  const desc = data.active
    ? 'Kunjungan dan data pelayanan klinik ini dilaporkan ke SATUSEHAT Kemenkes.'
    : data.globalEnabled
      ? 'SATUSEHAT belum diaktifkan untuk klinik ini. Hubungi admin ApexRecord bila klinik Anda sudah siap.'
      : 'Integrasi SATUSEHAT masih dalam proses pengajuan akses. Admin ApexRecord akan mengaktifkannya untuk klinik Anda setelah akses disetujui.';

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
            <span className="ft-setting-desc">{desc}</span>
            <span className={`ft-setting-state ${state}`}>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
