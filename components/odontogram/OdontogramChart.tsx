'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { odontogramApi, type OdontogramData, type ToothCondition, type UpsertToothConditionPayload } from '@/lib/odontogram';
import { useToast } from '@/lib/toast-context';
import ToothBox from './ToothBox';
import ToothDetailModal from './ToothDetailModal';
import BridgeManager from './BridgeManager';
import { UPPER_ROW, LOWER_ROW } from './odontogramData';

interface OdontogramChartProps {
  patientId: number;
}

function rowIndexOf(tooth: number): { row: 'upper' | 'lower'; index: number } | null {
  let idx = UPPER_ROW.indexOf(tooth);
  if (idx !== -1) return { row: 'upper', index: idx };
  idx = LOWER_ROW.indexOf(tooth);
  if (idx !== -1) return { row: 'lower', index: idx };
  return null;
}

export default function OdontogramChart({ patientId }: OdontogramChartProps) {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<OdontogramData>({ teeth: [], bridges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await odontogramApi.get(patientId);
      setData(result);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat odontogram');
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
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan kondisi gigi');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = (teeth: number[], rowName: 'upper' | 'lower') => {
    const bridgesInRow = data.bridges
      .map((b) => {
        const from = rowIndexOf(b.fromTooth);
        const to = rowIndexOf(b.toTooth);
        if (!from || !to || from.row !== rowName || to.row !== rowName) return null;
        const start = Math.min(from.index, to.index);
        const end = Math.max(from.index, to.index);
        return { ...b, start, end };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    return (
      <div className="odt-row" style={{ gridTemplateColumns: `repeat(${teeth.length}, 1fr)` }}>
        {teeth.map((tooth, i) => (
          <div key={tooth} className="odt-tooth-cell" style={{ gridColumn: i + 1, gridRow: 1 }}>
            <ToothBox toothNumber={tooth} condition={conditionOf(tooth)} onClick={() => setSelectedTooth(tooth)} />
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
    );
  };

  if (loading) {
    return <div className="rm-loading">Memuat odontogram…</div>;
  }

  return (
    <div className="odt-chart">
      <div className="odt-legend">
        <span className="odt-legend-item"><span className="odt-swatch" style={{ background: '#FF4D4F' }} /> Karies</span>
        <span className="odt-legend-item"><span className="odt-swatch" style={{ background: '#4F7EF8' }} /> Tumpatan</span>
        <span className="odt-legend-item"><span className="odt-swatch odt-swatch-x">✕</span> Hilang/Dicabut</span>
        <span className="odt-legend-item"><span className="odt-badge-sample" style={{ background: '#8B5E34' }}>SA</span> Sisa Akar</span>
        <span className="odt-legend-item"><span className="odt-badge-sample" style={{ background: '#1A2340' }}>RCT</span> Perawatan Saluran Akar</span>
        <span className="odt-legend-item"><span className="odt-badge-sample" style={{ background: '#4F7EF8' }}>MHK</span> Mahkota</span>
        <span className="odt-legend-item"><span className="odt-badge-sample" style={{ background: '#F5A623' }}>IMP</span> Impaksi</span>
      </div>

      <div className="odt-arch">
        <div className="odt-arch-label">Rahang Atas</div>
        <div className="odt-row-scroll">{renderRow(UPPER_ROW, 'upper')}</div>
      </div>

      <div className="odt-arch">
        <div className="odt-row-scroll">{renderRow(LOWER_ROW, 'lower')}</div>
        <div className="odt-arch-label">Rahang Bawah</div>
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
