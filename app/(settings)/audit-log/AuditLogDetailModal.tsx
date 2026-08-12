'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { auditLogApi, AuditLogEntry } from '@/lib/audit-log';

interface Props {
  id: number;
  onClose: () => void;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
}

function formatValue(v: unknown) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function diffRows(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  return keys
    .map((key) => ({ key, before: before?.[key], after: after?.[key] }))
    .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after));
}

export default function AuditLogDetailModal({ id, onClose }: Props) {
  const [entry, setEntry] = useState<AuditLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    auditLogApi
      .get(id)
      .then((res) => {
        if (!cancelled) setEntry(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Gagal memuat detail log');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const rows = entry ? diffRows(entry.beforeValue, entry.afterValue) : [];

  return (
    <div className="audit-modal-overlay" onClick={onClose} role="presentation">
      <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="audit-modal-header">
          <h2>Detail Log Aktivitas</h2>
          <button type="button" className="audit-modal-close" onClick={onClose} aria-label="Tutup">
            &times;
          </button>
        </div>

        {loading && <div className="audit-modal-body">Memuat...</div>}
        {error && <div className="audit-modal-body alert-error">{error}</div>}

        {entry && !loading && (
          <div className="audit-modal-body">
            <div className="audit-detail-grid">
              <div>
                <span className="detail-label">Waktu</span>
                <span className="detail-value">{formatTimestamp(entry.createdAt)}</span>
              </div>
              <div>
                <span className="detail-label">Pengguna</span>
                <span className="detail-value">
                  {entry.actorName} <span className="detail-sub">({entry.actorRole})</span>
                </span>
              </div>
              <div>
                <span className="detail-label">Aksi</span>
                <span className="detail-value">{entry.actionType}</span>
              </div>
              <div>
                <span className="detail-label">Status</span>
                <span className="detail-value">{entry.status === 'FAILED' ? `Gagal — ${entry.failureReason || '-'}` : 'Berhasil'}</span>
              </div>
              <div>
                <span className="detail-label">Entitas</span>
                <span className="detail-value">
                  {entry.entityType} {entry.entityLabel ? `— ${entry.entityLabel}` : ''}{' '}
                  {entry.entityId ? `(ID: ${entry.entityId})` : ''}
                </span>
              </div>
              <div>
                <span className="detail-label">IP / Perangkat</span>
                <span className="detail-value">
                  {entry.ipAddress || '-'} <span className="detail-sub">{entry.userAgent || ''}</span>
                </span>
              </div>
            </div>

            {(entry.beforeValue || entry.afterValue) && (
              <div className="audit-diff-section">
                <h3>Perubahan Data</h3>
                {rows.length === 0 ? (
                  <p className="detail-sub">Tidak ada field yang berubah.</p>
                ) : (
                  <table className="diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Sebelum</th>
                        <th>Sesudah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td className="diff-field">{row.key}</td>
                          <td className="diff-before">{formatValue(row.before)}</td>
                          <td className="diff-after">{formatValue(row.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
