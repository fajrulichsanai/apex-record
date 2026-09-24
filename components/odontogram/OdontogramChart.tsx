'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { odontogramApi, type OdontogramData, type ToothCondition, type UpsertToothConditionPayload } from '@/lib/odontogram';
import { useToast } from '@/lib/toast-context';
import ToothBox from './ToothBox';
import ToothDetailModal from './ToothDetailModal';
import BridgeManager from './BridgeManager';
import { UPPER_ROW, LOWER_ROW, QUADRANT_ROWS, PERMANENT_TEETH, DECIDUOUS_TEETH, calculateDentalIndex } from './odontogramData';

interface OdontogramChartProps {
  patientId: number;
  /** Fired with the full teeth list right after a tooth is saved, so a parent SOAP note can fold findings into Objective. */
  onToothSaved?: (teeth: ToothCondition[]) => void;
}

const LEGEND_ITEMS: { swatch?: string; symbol?: string; label: string }[] = [
  { swatch: '#17160F', label: 'Karies' },
  { swatch: '#3E8E36', label: 'Komposit' },
  { swatch: '#EC4899', label: 'GIC' },
  { symbol: '✕', label: 'Missing' },
  { symbol: '#', label: 'CFR (Fraktur mahkota)' },
  { symbol: '✓', label: 'RRX (Sisa akar)' },
  { symbol: '▽', label: 'RCT (Perawatan saluran akar)' },
];

function rowIndexOf(tooth: number): { row: 'upper' | 'lower'; index: number } | null {
  let idx = UPPER_ROW.indexOf(tooth);
  if (idx !== -1) return { row: 'upper', index: idx };
  idx = LOWER_ROW.indexOf(tooth);
  if (idx !== -1) return { row: 'lower', index: idx };
  return null;
}

export default function OdontogramChart({ patientId, onToothSaved }: OdontogramChartProps) {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<OdontogramData>({ teeth: [], bridges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const load = useCallback(async (): Promise<OdontogramData | null> => {
    try {
      setLoading(true);
      const result = await odontogramApi.get(patientId);
      setData(result);
      return result;
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat odontogram');
      return null;
    } finally {
      setLoading(false);
    }
  }, [patientId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const conditionOf = (tooth: number): ToothCondition | undefined => data.teeth.find((t) => t.toothNumber === tooth);

  const handleSaveTooth = async (payload: UpsertToothConditionPayload) => {
    if (selectedTooth === null) return;
    setSubmitting(true);
    try {
      await odontogramApi.upsertTooth(patientId, selectedTooth, payload);
      success(`Kondisi gigi ${selectedTooth} berhasil disimpan`);
      setSelectedTooth(null);
      const refreshed = await load();
      if (refreshed) onToothSaved?.(refreshed.teeth);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan kondisi gigi');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRowGroup = (row: (typeof QUADRANT_ROWS)[number], key: number) => {
    const teeth = [...row.left, ...row.right];
    const bridgesInRow = row.bridgeRow
      ? data.bridges
          .map((b) => {
            const from = rowIndexOf(b.fromTooth);
            const to = rowIndexOf(b.toTooth);
            if (!from || !to || from.row !== row.bridgeRow || to.row !== row.bridgeRow) return null;
            const start = Math.min(from.index, to.index);
            const end = Math.max(from.index, to.index);
            return { ...b, start, end };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null)
      : [];

    return (
      <div className="odontogram-row-group" key={key}>
        <div className="odontogram-quadrant-labels">
          <span>{row.leftLabel}</span>
          <span>{row.rightLabel}</span>
        </div>
        <div className="odontogram-row" style={{ gridTemplateColumns: `repeat(${teeth.length}, 1fr)` }}>
          {teeth.map((tooth, i) => (
            <div key={tooth} className="odontogram-row-cell" style={{ gridColumn: i + 1, gridRow: 1 }}>
              <ToothBox
                toothNumber={tooth}
                condition={conditionOf(tooth)}
                isSelected={selectedTooth === tooth}
                onClick={() => setSelectedTooth(tooth)}
              />
            </div>
          ))}
          {bridgesInRow.map((b) => (
            <div
              key={b.id}
              className="odt-bridge-bar"
              style={{ gridColumn: `${b.start + 1} / ${b.end + 2}`, gridRow: 2 }}
              title={`${b.label}: ${b.fromTooth}–${b.toTooth}`}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="rm-loading">Memuat odontogram…</div>;
  }

  const dmft = calculateDentalIndex(PERMANENT_TEETH, conditionOf);
  const deft = calculateDentalIndex(DECIDUOUS_TEETH, conditionOf);

  return (
    <div className="odt-chart">
      <div className="odontogram-toolbar">
        <button type="button" className="icon-btn" title="Legenda" onClick={() => setShowLegend((v) => !v)}>
          <span className="material-symbols-rounded">help_outline</span>
        </button>
        <button type="button" className="icon-btn" title="Muat ulang" onClick={load}>
          <span className="material-symbols-rounded">refresh</span>
        </button>
      </div>

      {showLegend && (
        <div className="odontogram-legend">
          {LEGEND_ITEMS.map((item) => (
            <div className="odontogram-legend-item" key={item.label}>
              {item.swatch ? (
                <span className="odontogram-legend-swatch" style={{ background: item.swatch }} />
              ) : (
                <span className="odontogram-legend-symbol">{item.symbol}</span>
              )}
              {item.label}
            </div>
          ))}
        </div>
      )}

      <div className="odontogram-chart">{QUADRANT_ROWS.map((row, i) => renderRowGroup(row, i))}</div>

      <div className="odontogram-index-grid">
        <div className="odontogram-index-card" style={{ '--index-color': '#1D5FAE' } as React.CSSProperties}>
          <div className="odontogram-index-heading">
            <div>
              <div className="odontogram-index-title">DMFT</div>
              <div className="odontogram-index-subtitle">Gigi Permanen</div>
            </div>
            <div className="odontogram-index-total">
              <span>Total</span> {dmft.total}
            </div>
          </div>
          <div className="odontogram-index-divider" />
          <div className="odontogram-index-stats">
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{dmft.decayed}</div>
              <div className="odontogram-index-stat-label">D</div>
              <div className="odontogram-index-stat-desc">Decayed</div>
            </div>
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{dmft.missingOrExtracted}</div>
              <div className="odontogram-index-stat-label">M</div>
              <div className="odontogram-index-stat-desc">Missing</div>
            </div>
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{dmft.filled}</div>
              <div className="odontogram-index-stat-label">F</div>
              <div className="odontogram-index-stat-desc">Filled</div>
            </div>
          </div>
        </div>

        <div className="odontogram-index-card" style={{ '--index-color': '#3E8E36' } as React.CSSProperties}>
          <div className="odontogram-index-heading">
            <div>
              <div className="odontogram-index-title">deft</div>
              <div className="odontogram-index-subtitle">Gigi Susu</div>
            </div>
            <div className="odontogram-index-total">
              <span>Total</span> {deft.total}
            </div>
          </div>
          <div className="odontogram-index-divider" />
          <div className="odontogram-index-stats">
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{deft.decayed}</div>
              <div className="odontogram-index-stat-label">d</div>
              <div className="odontogram-index-stat-desc">Decayed</div>
            </div>
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{deft.missingOrExtracted}</div>
              <div className="odontogram-index-stat-label">e</div>
              <div className="odontogram-index-stat-desc">Extracted</div>
            </div>
            <div className="odontogram-index-stat">
              <div className="odontogram-index-stat-value">{deft.filled}</div>
              <div className="odontogram-index-stat-label">f</div>
              <div className="odontogram-index-stat-desc">Filled</div>
            </div>
          </div>
        </div>
      </div>

      <BridgeManager patientId={patientId} bridges={data.bridges} onChange={load} />

      {selectedTooth !== null && (
        <ToothDetailModal
          toothNumber={selectedTooth}
          condition={conditionOf(selectedTooth)}
          submitting={submitting}
          onSave={handleSaveTooth}
          onClose={() => setSelectedTooth(null)}
        />
      )}
    </div>
  );
}
