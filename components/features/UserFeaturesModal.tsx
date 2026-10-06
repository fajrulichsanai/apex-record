'use client';

import { useEffect, useState } from 'react';
import FeatureToggleList from '@/components/features/FeatureToggleList';
import { featuresApi, type UserFeatures } from '@/lib/features';
import { useToast } from '@/lib/toast-context';
import { useEscapeKey } from '@/lib/a11y';

/**
 * Owner: nyalakan/matikan fitur untuk satu user. Hanya fitur yang tersedia
 * di klinik (diatur super admin) yang muncul di sini.
 */
export default function UserFeaturesModal({
  user,
  onClose,
}: {
  user: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [data, setData] = useState<UserFeatures | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  useEscapeKey(onClose, !!user);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    featuresApi
      .userFeatures(user.id)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'Gagal memuat fitur'));
    return () => {
      alive = false;
      setData(null);
      setError(null);
    };
  }, [user]);

  async function change(key: string, enabled: boolean | null) {
    if (!user) return;
    setBusyKey(key);
    try {
      setData(await featuresApi.setUserFeature(user.id, key, enabled));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setBusyKey(null);
    }
  }

  if (!user) return null;

  return (
    <div
      className="ft-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ft-modal" role="dialog" aria-modal="true" aria-label="Atur fitur user">
        <div className="ft-modal-header">
          <div>
            <div className="ft-modal-title">Atur Fitur</div>
            <div className="ft-modal-sub">{user?.name}</div>
          </div>
          <button type="button" className="ft-modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="ft-modal-body">
          {error ? (
            <p className="ft-empty">{error}</p>
          ) : !data ? (
            <p className="ft-empty">Memuat…</p>
          ) : (
            <>
              <FeatureToggleList
                title="Fitur"
                hint="Matikan untuk menyembunyikan menu & fitur dari user ini. Nyalakan untuk memberi akses di luar bawaan perannya."
                items={data.standard}
                busyKey={busyKey}
                onChange={change}
              />
              <FeatureToggleList
                title="Fitur khusus klinik"
                hint="Fitur custom yang diaktifkan untuk klinik ini — hanya muncul untuk user yang dinyalakan."
                items={data.custom}
                busyKey={busyKey}
                onChange={change}
                emptyText="Belum ada fitur khusus untuk klinik ini."
              />
            </>
          )}
        </div>
        <div className="ft-modal-footer">
          <button type="button" className="ft-modal-done" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
