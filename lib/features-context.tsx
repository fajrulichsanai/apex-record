'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { featuresApi } from './features';
import { canAccessFeature, type FeatureKey } from './permissions';
import { isDemoMode } from './demo/demo-mode';

interface FeaturesState {
  /** Fitur efektif dari server; null selama belum dimuat (pakai bawaan role) */
  features: Set<string> | null;
  custom: { key: string; name: string }[];
  /** Integrasi SATUSEHAT belum diaktifkan untuk faskes ini (diatur super admin) */
  satusehatPending: boolean;
  /** Daftar fitur dari server sudah dimuat (atau gagal dimuat) */
  ready: boolean;
  /** Boleh mengakses fitur standar (FeatureKey) atau fitur custom ("custom:…")? */
  can: (key: FeatureKey | `custom:${string}`) => boolean;
  reload: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesState | undefined>(undefined);

/**
 * Fitur yang aktif untuk user: bawaan role, dikurangi yang dimatikan super
 * admin untuk klinik, lalu pengaturan owner untuk user ini (GET /features/me).
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<Set<string> | null>(null);
  const [custom, setCustom] = useState<{ key: string; name: string }[]>([]);
  const [satusehatPending, setSatusehatPending] = useState(false);
  // Pengguna yang daftar fiturnya sudah selesai dimuat (sukses maupun gagal)
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const userKey = user ? `${user.id}:${user.role}:${user.clinicId ?? ''}` : '';

  const reload = useCallback(async () => {
    if (!userKey || isDemoMode()) {
      setFeatures(null);
      setCustom([]);
      setSatusehatPending(false);
      setLoadedKey(userKey);
      return;
    }
    try {
      const res = await featuresApi.me();
      setFeatures(new Set(res.features));
      setCustom(res.custom);
      setSatusehatPending(res.integrations?.satusehat === false);
    } catch {
      // Server belum mendukung / gagal: tetap pakai bawaan role
      setFeatures(null);
      setCustom([]);
      setSatusehatPending(false);
    } finally {
      setLoadedKey(userKey);
    }
  }, [userKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const role = user?.role;
  // Belum siap selama sesi masih dibaca atau daftar fitur pengguna ini belum datang
  const ready = !authLoading && loadedKey === userKey;
  const can = useCallback(
    (key: FeatureKey | `custom:${string}`) => {
      if (features) return features.has(key);
      return key.startsWith('custom:') ? false : canAccessFeature(role, key as FeatureKey);
    },
    [features, role],
  );

  const value = useMemo(
    () => ({ features, custom, satusehatPending, ready, can, reload }),
    [features, custom, satusehatPending, ready, can, reload],
  );
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeaturesState {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures harus dipakai di dalam FeaturesProvider');
  return ctx;
}
