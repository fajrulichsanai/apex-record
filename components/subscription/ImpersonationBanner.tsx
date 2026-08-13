'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import './impersonation-banner.css';

export default function ImpersonationBanner() {
  const { impersonating, user, exitImpersonation } = useAuth();
  const router = useRouter();

  if (!impersonating) return null;

  const handleExit = () => {
    exitImpersonation();
    router.push('/super-admin/dashboard');
  };

  return (
    <div className="impersonation-banner">
      <span>
        Anda sedang login sebagai <strong>{user?.name || user?.email}</strong> ({user?.role})
      </span>
      <button type="button" onClick={handleExit}>
        Kembali ke Super Admin
      </button>
    </div>
  );
}
