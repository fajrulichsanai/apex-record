'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import './impersonation-banner.css';

const EXPIRES_KEY = 'impersonation_expires_at';

export default function ImpersonationBanner() {
  const { impersonating, user, exitImpersonation } = useAuth();
  const router = useRouter();
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  // Sesi "Login sebagai" berakhir otomatis setelah 30 menit; tampilkan sisa waktunya.
  useEffect(() => {
    if (!impersonating) return;
    const tick = () => {
      let expiresAt: string | null = null;
      try {
        expiresAt = sessionStorage.getItem(EXPIRES_KEY);
      } catch {
        expiresAt = null;
      }
      setMinutesLeft(expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000)) : null);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [impersonating]);

  if (!impersonating) return null;

  const handleExit = async () => {
    try {
      sessionStorage.removeItem(EXPIRES_KEY);
    } catch {
      // ignore
    }
    await exitImpersonation();
    router.push('/super-admin/dashboard');
  };

  return (
    <div className="impersonation-banner" role="status">
      <span>
        Anda sedang login sebagai <strong>{user?.name || user?.email}</strong> ({user?.role})
        {minutesLeft !== null && ` · berakhir dalam ${minutesLeft} menit`}
      </span>
      <button type="button" onClick={handleExit}>
        Kembali ke Super Admin
      </button>
    </div>
  );
}
