'use client';

import type { ReactNode } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import type { SyncState } from '@/lib/satusehat';
import { SYNC_STATE_LABELS } from '@/lib/satusehat';
import '@/app/styles/satusehat.css';

/** Kerangka halaman di bawah menu SATUSEHAT. */
export function SatusehatShell({
  title,
  subtitle,
  actions,
  requireWrite,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  requireWrite?: boolean;
  children: ReactNode;
}) {
  return (
    <DashboardLayout>
      <FeatureGuard feature="satusehat" requireWrite={requireWrite}>
        <main className="content ss-page">
          <div className="ss-header">
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {actions && <div className="ss-actions">{actions}</div>}
          </div>
          {children}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}

export function SyncBadge({ status }: { status: SyncState | 'success' }) {
  const label = status === 'success' ? 'Berhasil' : SYNC_STATE_LABELS[status];
  return <span className={`ss-badge ${status}`}>{label}</span>;
}

export function Pager({
  page,
  totalPages,
  total,
  loading,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  loading?: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1 && total === undefined) return null;
  return (
    <div className="ss-pager">
      <button type="button" className="ss-btn sm" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>
        ‹ Sebelumnya
      </button>
      <span>
        Hal {page} / {Math.max(totalPages, 1)}
        {total !== undefined && ` · ${total} data`}
      </span>
      <button
        type="button"
        className="ss-btn sm"
        disabled={loading || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya ›
      </button>
    </div>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
