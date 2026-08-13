'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { setOnSubscriptionExpired } from './api-client';
import { clinicSubscriptionApi } from './subscription';
import type { ClinicSubscription } from '@/types/subscription';
import RenewSubscriptionPopup from '@/components/subscription/RenewSubscriptionPopup';

interface SubscriptionGateState {
  subscription: ClinicSubscription | null;
  isExpired: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionGateContext = createContext<SubscriptionGateState | undefined>(undefined);

function computeExpired(sub: ClinicSubscription | null): boolean {
  if (!sub) return true;
  if (sub.status !== 'active') return true;
  return new Date(sub.endDate) < new Date(new Date().toDateString());
}

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [subscription, setSubscription] = useState<ClinicSubscription | null>(null);
  const [checked, setChecked] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupReason, setPopupReason] = useState<'initial' | 'mutation'>('initial');

  const gated = !loading && !!user && user.role !== 'super_admin' && !!user.clinicId;

  const refresh = useCallback(async () => {
    if (!gated) return;
    try {
      const current = await clinicSubscriptionApi.getCurrent();
      setSubscription(current);
    } catch {
      // Network/API errors here shouldn't block the app from rendering;
      // the mutation-side guard (SUBSCRIPTION_EXPIRED interception) still applies.
    } finally {
      setChecked(true);
    }
  }, [gated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gated || !checked) return;
    if (computeExpired(subscription)) {
      setPopupReason('initial');
      setPopupOpen(true);
    }
  }, [gated, checked, subscription]);

  useEffect(() => {
    setOnSubscriptionExpired(() => {
      setPopupReason('mutation');
      setPopupOpen(true);
      refresh();
    });
    return () => setOnSubscriptionExpired(null);
  }, [refresh]);

  const isExpired = gated && checked && computeExpired(subscription);

  return (
    <SubscriptionGateContext.Provider value={{ subscription, isExpired, refresh }}>
      {children}
      {gated && (
        <RenewSubscriptionPopup
          isOpen={popupOpen}
          reason={popupReason}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </SubscriptionGateContext.Provider>
  );
}

export function useSubscriptionGate() {
  const ctx = useContext(SubscriptionGateContext);
  if (!ctx) {
    throw new Error('useSubscriptionGate must be used within a SubscriptionGateProvider');
  }
  return ctx;
}
