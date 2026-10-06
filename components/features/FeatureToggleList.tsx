'use client';

import type { FeatureToggle } from '@/lib/features';
import './features.css';

/**
 * Daftar fitur dengan sakelar nyala/mati. "Bawaan" = belum diatur, mengikuti
 * aturan default (role untuk user, semua nyala untuk klinik).
 */
export default function FeatureToggleList({
  title,
  hint,
  items,
  busyKey,
  onChange,
  emptyText,
}: {
  title: string;
  hint?: string;
  items: FeatureToggle[];
  busyKey: string | null;
  onChange: (key: string, enabled: boolean | null) => void;
  emptyText?: string;
}) {
  return (
    <section className="ft-section">
      <div className="ft-head">
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
      </div>
      {items.length === 0 ? (
        <p className="ft-empty">{emptyText ?? 'Tidak ada fitur.'}</p>
      ) : (
        <ul className="ft-list">
          {items.map((f) => (
            <li key={f.key} className={f.enabled ? 'on' : 'off'}>
              <div className="ft-info">
                <span className="ft-label">{f.label}</span>
                {f.description && <span className="ft-desc">{f.description}</span>}
                <span className={`ft-state ${f.isDefault ? 'default' : 'custom'}`}>
                  {f.isDefault ? 'Bawaan' : 'Diatur'}
                  {f.roleDefault !== undefined && !f.isDefault && ` · bawaan role: ${f.roleDefault ? 'nyala' : 'mati'}`}
                </span>
              </div>
              <div className="ft-actions">
                {!f.isDefault && (
                  <button
                    type="button"
                    className="ft-reset"
                    disabled={busyKey !== null}
                    onClick={() => onChange(f.key, null)}
                    title="Kembalikan ke bawaan"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.enabled}
                  aria-label={`${f.label}: ${f.enabled ? 'nyala' : 'mati'}`}
                  className={`ft-switch ${f.enabled ? 'on' : ''}`}
                  disabled={busyKey !== null}
                  onClick={() => onChange(f.key, !f.enabled)}
                >
                  <span />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
