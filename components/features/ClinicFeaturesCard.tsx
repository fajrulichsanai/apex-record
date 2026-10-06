'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FeatureToggleList from '@/components/features/FeatureToggleList';
import { featuresApi, type ClinicFeatures } from '@/lib/features';
import { useToast } from '@/lib/toast-context';

/** Super admin: fitur yang tersedia untuk satu klinik (termasuk fitur custom). */
export default function ClinicFeaturesCard({ clinicId }: { clinicId: number }) {
  const { showToast } = useToast();
  const [data, setData] = useState<ClinicFeatures | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    featuresApi
      .clinicFeatures(clinicId)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'Gagal memuat fitur'));
    return () => {
      alive = false;
    };
  }, [clinicId]);

  async function change(key: string, enabled: boolean | null) {
    setBusyKey(key);
    try {
      setData(await featuresApi.setClinicFeature(clinicId, key, enabled));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="card">
      <h3>Fitur Klinik</h3>
      <p style={{ fontSize: 13, color: 'var(--text-sub)', margin: '0 0 12px' }}>
        Fitur yang dimatikan di sini hilang untuk semua user klinik ini. Owner klinik bisa mengatur lagi per user dari
        fitur yang menyala.
      </p>
      {error ? (
        <p className="ft-empty">{error}</p>
      ) : !data ? (
        <p className="ft-empty">Memuat…</p>
      ) : (
        <>
          <FeatureToggleList title="Fitur standar" items={data.standard} busyKey={busyKey} onChange={change} />
          <FeatureToggleList
            title="Fitur custom"
            hint="Nyalakan untuk klinik ini; owner lalu memilih user mana yang mendapatkannya."
            items={data.custom}
            busyKey={busyKey}
            onChange={change}
            emptyText="Belum ada fitur custom."
          />
          <p style={{ fontSize: 12.5, margin: '10px 0 0' }}>
            <Link href="/super-admin/features">Kelola daftar fitur custom →</Link>
          </p>
        </>
      )}
    </div>
  );
}
