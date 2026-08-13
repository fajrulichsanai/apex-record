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
  daysUntilExpiry: number | null;
  refresh: () => Promise<void>;
}

const WARNING_WINDOW_DAYS = 7;

const SubscriptionGateContext = createContext<SubscriptionGateState | undefined>(undefined);

function computeDaysLeft(sub: ClinicSubscription | null): number | null {
  if (!sub) return null;
  const today = new Date(new Date().toDateString());
  const endDate = new Date(`${sub.endDate}T00:00:00`);
  return Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeExpired(sub: ClinicSubscription | null): boolean {
  if (!sub) return true;
  if (sub.status !== 'active') return true;
  const daysLeft = computeDaysLeft(sub);
  return daysLeft !== null && daysLeft < 0;
}

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [subscription, setSubscription] = useState<ClinicSubscription | null>(null);
  const [checked, setChecked] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupReason, setPopupReason] = useState<'initial' | 'mutation' | 'warning'>('initial');

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

  // Once per mount: show the already-expired popup, or — if the subscription
  // is still active but within WARNING_WINDOW_DAYS of endDate — a lighter
  // heads-up popup ("langganan akan habis dalam N hari").
  useEffect(() => {
    if (!gated || !checked) return;
    if (computeExpired(subscription)) {
      setPopupReason('initial');
      setPopupOpen(true);
      return;
    }
    const daysLeft = computeDaysLeft(subscription);
    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= WARNING_WINDOW_DAYS) {
      setPopupReason('warning');
      setPopupOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, checked]);

  useEffect(() => {
    setOnSubscriptionExpired(() => {
      setPopupReason('mutation');
      setPopupOpen(true);
      refresh();
    });
    return () => setOnSubscriptionExpired(null);
  }, [refresh]);

  const isExpired = gated && checked && computeExpired(subscription);
  const daysUntilExpiry = checked ? computeDaysLeft(subscription) : null;

  return (
    <SubscriptionGateContext.Provider value={{ subscription, isExpired, daysUntilExpiry, refresh }}>
      {children}
      {gated && (
        <RenewSubscriptionPopup
          isOpen={popupOpen}
          reason={popupReason}
          daysUntilExpiry={daysUntilExpiry}
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
