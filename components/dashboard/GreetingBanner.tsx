'use client';

import { useAuth } from '@/lib/auth-context';
import './greeting-banner.css';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'SUPER ADMIN',
  owner: 'OWNER',
  admin: 'ADMIN',
  dokter: 'DOKTER',
  pending: 'PENDING',
};

function getGreeting(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function GreetingBanner() {
  const { user } = useAuth();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const greeting = getGreeting(today.getHours());
  const displayName = user?.name || 'Pengguna';
  const roleLabel = user?.role ? ROLE_LABEL[user.role] || user.role.toUpperCase() : '';

  return (
    <div className="greeting-banner">
      <p className="greeting-title">{greeting}, {displayName} 👋</p>
      {roleLabel && <div className="owner-badge">{roleLabel}</div>}
    </div>
  );
}
