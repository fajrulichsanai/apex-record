'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEscapeKey } from '@/lib/a11y';

/**
 * Komponen tampilan bersama panel Super Admin (PRD Super Admin UM-02): satu
 * gaya untuk header, tabel, label status, paginasi, modal, tab, dan keadaan
 * kosong/memuat. Gayanya ada di app/styles/super-admin.css.
 */

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  count,
  subtitle,
  actions,
  breadcrumb,
  badge,
}: {
  title: ReactNode;
  count?: number;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: Crumb[];
  badge?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-title-block">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="sa-breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((c, i) => (
              <span key={`${c.label}-${i}`}>
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                {i < breadcrumb.length - 1 && <span className="sa-breadcrumb-sep">›</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="page-title">
          <h1>{title}</h1>
          {count !== undefined && <span className="badge-count">{count}</span>}
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="sa-actions">{actions}</div>}
    </div>
  );
}

export type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'neutral';

export function StatusBadge({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`tag tag-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`sa-notice sa-notice-${tone}`}>{children}</div>;
}

export function Pager({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>
        Sebelumnya
      </button>
      <span>
        Halaman {page} dari {totalPages}
        {total !== undefined ? ` · ${total} data` : ''}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}>
        Berikutnya
      </button>
    </div>
  );
}

/** Baris tabel saat memuat (kerangka) atau kosong. Kembalikan null bila ada data. */
export function TableState({
  loading,
  empty,
  colSpan,
  message = 'Belum ada data.',
  rows = 4,
}: {
  loading: boolean;
  empty: boolean;
  colSpan: number;
  message?: ReactNode;
  rows?: number;
}) {
  if (loading) {
    return (
      <>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i} className="sa-skeleton-row" aria-hidden="true">
            {Array.from({ length: colSpan }, (__, j) => (
              <td key={j}>
                <span className="sa-skeleton" />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }
  if (empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="empty-row">
          {message}
        </td>
      </tr>
    );
  }
  return null;
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="sa-skeleton-block" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="sa-skeleton" />
      ))}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  busy = false,
  wide = false,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  wide?: boolean;
}) {
  useEscapeKey(() => !busy && onClose(), true);
  return (
    <div className="sa-modal-overlay" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className={`sa-modal${wide ? ' sa-modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-modal-header">
          <h2 id="sa-modal-title">{title}</h2>
          <button type="button" className="sa-modal-close" aria-label="Tutup" onClick={onClose} disabled={busy}>
            &times;
          </button>
        </div>
        <div className="sa-modal-body">{children}</div>
        {footer && <div className="sa-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  hrefFor,
}: {
  tabs: TabItem[];
  active: string;
  onChange?: (key: string) => void;
  hrefFor?: (key: string) => string;
}) {
  return (
    <div className="sa-tabs" role="tablist">
      {tabs.map((t) => {
        const content = (
          <>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="sa-tab-count">{t.count}</span>}
          </>
        );
        return hrefFor ? (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            role="tab"
            aria-selected={active === t.key}
            className={`sa-tab${active === t.key ? ' active' : ''}`}
            scroll={false}
          >
            {content}
          </Link>
        ) : (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={`sa-tab${active === t.key ? ' active' : ''}`}
            onClick={() => onChange?.(t.key)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="stat-card stat-card-link">
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Batang proporsi untuk Laporan; lebar dinamis dari nilainya. */
export function PeriodBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="period-bar-wrap">
      <div className="period-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
