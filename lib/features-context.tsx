'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import { featuresApi } from './features';
import { canAccessFeature, type FeatureKey } from './permissions';
import { isDemoMode } from './demo/demo-mode';

interface FeaturesState {
  /** Fitur efektif dari server; null selama belum dimuat (pakai bawaan role) */
  features: Set<string> | null;
  can: (key: FeatureKey) => boolean;
  reload: () => Promise<void>;
}

const FeaturesContext = createContext<FeaturesState | undefined>(undefined);

/**
 * Fitur yang aktif untuk user: bawaan role, dikurangi yang dimatikan super
 * admin untuk klinik, lalu pengaturan owner untuk user ini (GET /features/me).
 */
export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Set<string> | null>(null);
  const userKey = user ? `${user.id}:${user.role}:${user.clinicId ?? ''}` : '';

  const reload = useCallback(async () => {
    if (!userKey || isDemoMode()) {
      setFeatures(null);
      return;
    }
    try {
      const res = await featuresApi.me();
      setFeatures(new Set(res.features));
    } catch {
      // Server belum mendukung / gagal: tetap pakai bawaan role
      setFeatures(null);
    }
  }, [userKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const role = user?.role;
  const can = useCallback(
    (key: FeatureKey) => {
      if (features) return features.has(key);
      // SATUSEHAT juga bergantung pada saklar platform yang hanya diketahui
      // server — jangan tampilkan sebelum server mengonfirmasi (kecuali demo)
      if (key === 'satusehat' && !isDemoMode()) return false;
      return canAccessFeature(role, key);
    },
    [features, role],
  );

  const value = useMemo(() => ({ features, can, reload }), [features, can, reload]);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeaturesState {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures harus dipakai di dalam FeaturesProvider');
  return ctx;
}
