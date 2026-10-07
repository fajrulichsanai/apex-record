'use client';

import { useEffect, useState } from 'react';
import {
  clinicalRecordsApi,
  formatDate,
  labelOf,
  observationValueText,
  type ClinicalObservation,
  type ClinicalRecordOptions,
  type PatientCondition,
} from '@/lib/clinical-records';
import './ClinicalRecordsPanel.css';

const obsDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Ringkasan (baca saja) di rekam medis pasien: daftar masalah dan riwayat
 * observasi per jenis. Pengisian dilakukan di rekam medis kunjungan.
 */
export default function PatientClinicalSummary({ patientId }: { patientId: number }) {
  const [options, setOptions] = useState<ClinicalRecordOptions | null>(null);
  const [conditions, setConditions] = useState<PatientCondition[]>([]);
  const [observations, setObservations] = useState<ClinicalObservation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([clinicalRecordsApi.options(), clinicalRecordsApi.forPatient(patientId)])
      .then(([opts, data]) => {
        if (!alive) return;
        setOptions(opts);
        setConditions(data.conditions);
        setObservations(data.observations);
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'Gagal memuat'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [patientId]);

  if (loading) return <div className="rm-loading">Memuat kondisi & observasi…</div>;
  if (error || !options) return <div className="rm-loading error">{error || 'Gagal memuat'}</div>;

  const abated = (c: PatientCondition) => options.abatedStatuses.includes(c.clinicalStatus);
  const ordered = [...conditions.filter((c) => !abated(c)), ...conditions.filter(abated)];
  const byType = new Map<string, ClinicalObservation[]>();
  for (const o of observations) byType.set(o.observationKey, [...(byType.get(o.observationKey) ?? []), o]);

  return (
    <div className="cr-panel">
      <section className="cr-card" aria-labelledby="crs-cond">
        <div className="cr-card-head">
          <div>
            <h3 id="crs-cond">Daftar Masalah Pasien</h3>
            <p>Diisi dan diperbarui dari rekam medis kunjungan (menu Kondisi & Observasi).</p>
          </div>
        </div>
        {ordered.length === 0 ? (
          <p className="cr-empty">Belum ada kondisi tercatat.</p>
        ) : (
          <ul className="cr-list">
            {ordered.map((c) => (
              <li key={c.id} className={`cr-item ${abated(c) ? 'past' : ''}`}>
                <div className="cr-item-main">
                  <div className="cr-item-title">
                    <span className="cr-code">{c.code}</span>
                    <strong>{c.nameId ?? c.display}</strong>
                  </div>
                  <div className="cr-tags">
                    <span className={`cr-tag status-${c.clinicalStatus}`}>
                      {labelOf(options.clinicalStatuses, c.clinicalStatus)}
                    </span>
                    {c.severity && <span className="cr-tag">{labelOf(options.severities, c.severity)}</span>}
                    {c.onsetDate && <span className="cr-muted cr-small">Sejak {formatDate(c.onsetDate)}</span>}
                    {c.abatementDate && <span className="cr-muted cr-small">Sembuh {formatDate(c.abatementDate)}</span>}
                  </div>
                  {c.note && <div className="cr-note">{c.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cr-card" aria-labelledby="crs-obs">
        <div className="cr-card-head">
          <div>
            <h3 id="crs-obs">Riwayat Observasi</h3>
            <p>Nilai terbaru di atas.</p>
          </div>
        </div>
        {byType.size === 0 ? (
          <p className="cr-empty">Belum ada observasi tambahan.</p>
        ) : (
          <ul className="cr-list">
            {[...byType.entries()].map(([key, rows]) => {
              const type = options.observations.find((t) => t.key === key);
              return (
                <li key={key} className="cr-item">
                  <div className="cr-item-main">
                    <div className="cr-item-title">
                      <strong>{type?.label ?? key}</strong>
                      <span className="cr-value">{observationValueText(type, rows[0])}</span>
                      <span className="cr-muted cr-small">{obsDate(rows[0].effectiveAt)}</span>
                    </div>
                    {rows.length > 1 && (
                      <div className="cr-muted cr-small">
                        Sebelumnya:{' '}
                        {rows
                          .slice(1, 6)
                          .map((o) => `${observationValueText(type, o)} (${obsDate(o.effectiveAt)})`)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
