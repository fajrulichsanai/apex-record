'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

interface CurrentLink {
  ownerName: string | null;
  linkedSince: string | null;
  billingMode: 'owner' | 'self' | 'stopped';
}

const BILLING: Record<CurrentLink['billingMode'], string> = {
  owner: 'Langganan dibayar oleh owner multiklinik.',
  self: 'Klinik ini membayar langganannya sendiri dengan harga cabang Multi Klinik.',
  stopped: 'Owner multiklinik tidak lagi menanggung langganan klinik ini.',
};

/** Penanda "terhubung ke multiklinik" di Info Klinik (PRD Multi-Klinik P1). */
export default function BranchLinkNotice() {
  const { user } = useAuth();
  const [link, setLink] = useState<CurrentLink | null>(null);
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    apiClient
      .get<CurrentLink | null>('/clinic-links/current')
      .then((data) => {
        if (active) setLink(data && typeof data === 'object' && 'billingMode' in data ? data : null);
      })
      .catch(() => {
        /* supplementary notice */
      });
    return () => {
      active = false;
    };
  }, [isOwner]);

  if (!link) return null;
  const since = link.linkedSince
    ? new Date(link.linkedSince).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '12px 14px',
        margin: '0 0 16px',
        borderRadius: 14,
        border: '1px solid var(--accent)',
        background: 'var(--accent-soft)',
        color: 'var(--text-dark)',
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1.2 }}>🔗</span>
      <span>
        Klinik ini adalah cabang dari akun Multi-Klinik <strong>{link.ownerName ?? '—'}</strong>
        {since ? ` sejak ${since}` : ''}. {BILLING[link.billingMode]} Owner multiklinik dapat melihat laporan dan
        mengatur klinik ini; setiap aksinya tercatat di Log Aktivitas.
      </span>
    </div>
  );
}
