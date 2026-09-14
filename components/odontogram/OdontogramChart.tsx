'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { odontogramApi, type OdontogramData, type ToothCondition, type UpsertToothConditionPayload } from '@/lib/odontogram';
import { useToast } from '@/lib/toast-context';
import ToothBox from './ToothBox';
import ToothDetailModal from './ToothDetailModal';
import BridgeManager from './BridgeManager';
import { UPPER_ROW, LOWER_ROW, UPPER_ROW_DECIDUOUS, LOWER_ROW_DECIDUOUS, PERMANENT_TEETH, DECIDUOUS_TEETH, calculateDentalIndex } from './odontogramData';

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

  const renderRow = (teeth: number[], rowName: 'upper' | 'lower' | null) => {
    const bridgesInRow = rowName
      ? data.bridges
          .map((b) => {
            const from = rowIndexOf(b.fromTooth);
            const to = rowIndexOf(b.toTooth);
            if (!from || !to || from.row !== rowName || to.row !== rowName) return null;
            const start = Math.min(from.index, to.index);
            const end = Math.max(from.index, to.index);
            return { ...b, start, end };
          })
          .filter((b): b is NonNullable<typeof b> => b !== null)
      : [];

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

  const dmft = calculateDentalIndex(PERMANENT_TEETH, conditionOf);
  const deft = calculateDentalIndex(DECIDUOUS_TEETH, conditionOf);

  return (
    <div className="odt-chart">
      <div className="odt-legend">
        <span className="odt-legend-item"><span className="odt-swatch" style={{ background: '#1A1A1A' }} /> Karies</span>
        <span className="odt-legend-item"><span className="odt-swatch" style={{ background: '#10B981' }} /> Komposit</span>
        <span className="odt-legend-item"><span className="odt-swatch" style={{ background: '#EC4899' }} /> GIC</span>
        <span className="odt-legend-item"><span className="odt-swatch odt-swatch-x">✕</span> Hilang/Dicabut (MISSING)</span>
        <span className="odt-legend-item"><span className="odt-badge-sample" style={{ background: '#1A2340' }}>RCT</span> Perawatan Saluran Akar</span>
        <span className="odt-legend-item"><span className="odt-teks-sample" style={{ color: '#34A853' }}>SOU</span> Sound (sehat)</span>
        <span className="odt-legend-item"><span className="odt-teks-sample" style={{ color: '#EA4335' }}>CFR/RRX</span> Fraktur/Sisa Akar</span>
        <span className="odt-legend-item"><span className="odt-teks-sample" style={{ color: '#FBBC04' }}>ANO/NON</span> Anomali/Non-vital</span>
      </div>

      <div className="odt-summary">
        <div className="odt-summary-group">
          <span className="odt-summary-title">DMFT (Gigi Permanen)</span>
          <div className="odt-summary-values">
            <span>D: {dmft.decayed}</span>
            <span>M: {dmft.missingOrExtracted}</span>
            <span>F: {dmft.filled}</span>
            <strong>DMFT: {dmft.total}</strong>
          </div>
        </div>
        <div className="odt-summary-group">
          <span className="odt-summary-title">deft (Gigi Susu)</span>
          <div className="odt-summary-values">
            <span>d: {deft.decayed}</span>
            <span>e: {deft.missingOrExtracted}</span>
            <span>f: {deft.filled}</span>
            <strong>deft: {deft.total}</strong>
          </div>
        </div>
      </div>

      <div className="odt-arch">
        <div className="odt-arch-label">Rahang Atas — Permanen</div>
        <div className="odt-row-scroll">{renderRow(UPPER_ROW, 'upper')}</div>
      </div>

      <div className="odt-arch odt-arch-deciduous">
        <div className="odt-arch-label">Rahang Atas — Susu</div>
        <div className="odt-row-scroll">{renderRow(UPPER_ROW_DECIDUOUS, null)}</div>
      </div>

      <div className="odt-arch odt-arch-deciduous">
        <div className="odt-row-scroll">{renderRow(LOWER_ROW_DECIDUOUS, null)}</div>
        <div className="odt-arch-label">Rahang Bawah — Susu</div>
      </div>

      <div className="odt-arch">
        <div className="odt-row-scroll">{renderRow(LOWER_ROW, 'lower')}</div>
        <div className="odt-arch-label">Rahang Bawah — Permanen</div>
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
