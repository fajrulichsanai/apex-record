'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { useAuth } from '@/lib/auth-context';
import { onboardingApi, type OnboardingStatus } from '@/lib/onboarding';
import './onboarding-banner.css';

export default function OnboardingBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user?.role !== 'owner') return;
    let cancelled = false;
    onboardingApi
      .getStatus()
      .then((res) => {
        if (!cancelled) setStatus(res);
      })
      .catch(() => {
        // Diam-diam gagal — banner ini cuma pengingat opsional, bukan blocker.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (user?.role !== 'owner' || !status || status.allComplete || dismissed) return null;

  const items = [
    { label: 'Info Klinik', done: status.infoKlinik.complete },
    { label: 'Tarif Layanan', done: status.tarif.complete },
    { label: 'Undang Dokter', done: status.dokter.complete },
  ];

  return (
    <div className="onboarding-banner">
      <div className="onboarding-banner-text">
        <p className="onboarding-banner-title">Selesaikan pengaturan klinik Anda</p>
        <div className="onboarding-banner-checklist">
          {items.map((item) => (
            <span key={item.label} className={`onboarding-banner-item ${item.done ? 'done' : ''}`}>
              {item.done ? <FiCheck /> : <span className="onboarding-banner-dot" />}
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <div className="onboarding-banner-actions">
        <button type="button" className="onboarding-banner-cta" onClick={() => router.push('/onboarding')}>
          Lanjutkan <FiArrowRight />
        </button>
        <button type="button" className="onboarding-banner-dismiss" onClick={() => setDismissed(true)}>
          Nanti saja
        </button>
      </div>
    </div>
  );
}
