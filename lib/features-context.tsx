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
  const { user } = useAuth();
  const [features, setFeatures] = useState<Set<string> | null>(null);
  const [custom, setCustom] = useState<{ key: string; name: string }[]>([]);
  const userKey = user ? `${user.id}:${user.role}:${user.clinicId ?? ''}` : '';

  const reload = useCallback(async () => {
    if (!userKey || isDemoMode()) {
      setFeatures(null);
      setCustom([]);
      return;
    }
    try {
      const res = await featuresApi.me();
      setFeatures(new Set(res.features));
      setCustom(res.custom);
    } catch {
      // Server belum mendukung / gagal: tetap pakai bawaan role
      setFeatures(null);
      setCustom([]);
    }
  }, [userKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const role = user?.role;
  const can = useCallback(
    (key: FeatureKey | `custom:${string}`) => {
      if (features) return features.has(key);
      return key.startsWith('custom:') ? false : canAccessFeature(role, key as FeatureKey);
    },
    [features, role],
  );

  const value = useMemo(() => ({ features, custom, can, reload }), [features, custom, can, reload]);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): FeaturesState {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures harus dipakai di dalam FeaturesProvider');
  return ctx;
}
