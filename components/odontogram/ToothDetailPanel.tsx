'use client';

import { SurfaceCondition, ToothData, ToothStatusBelow } from '@/lib/odontogram';
import ToothIcon from './ToothIcon';
import { TOOTH_NAMES } from './odontogram-data';

interface ToothDetailPanelProps {
  toothId: string;
  data: ToothData;
  onSurfaceChange: (surface: keyof NonNullable<ToothData['surfaces']>, value: SurfaceCondition) => void;
  onStatusBelowChange: (value: ToothStatusBelow) => void;
  onRCTChange: (value: boolean) => void;
  onClose: () => void;
}

const SURFACE_FIELDS: { key: keyof NonNullable<ToothData['surfaces']>; label: string }[] = [
  { key: 'mesial', label: 'Mesial' },
  { key: 'distal', label: 'Distal' },
  { key: 'buccal', label: 'Bukal / Labial' },
  { key: 'palatal', label: 'Palatal / Lingual' },
  { key: 'occlusal', label: 'Oklusal / Insisal' },
];

const CONDITION_OPTIONS: { value: SurfaceCondition; label: string; swatch: string }[] = [
  { value: null, label: 'Sehat', swatch: '#FFFFFF' },
  { value: 'karies', label: 'Karies', swatch: '#1A2340' },
  { value: 'komposit', label: 'Komposit', swatch: '#2DCB8A' },
  { value: 'gic', label: 'GIC', swatch: '#EC4899' },
];

const STATUS_OPTIONS: { value: ToothStatusBelow; label: string }[] = [
  { value: null, label: 'Normal' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'CFR', label: 'CFR (Crown Fracture)' },
  { value: 'RRX', label: 'RRX (Root Extraction)' },
];

export default function ToothDetailPanel({
  toothId,
  data,
  onSurfaceChange,
  onStatusBelowChange,
  onRCTChange,
  onClose,
}: ToothDetailPanelProps) {
  return (
    <div className="tooth-detail-panel">
      <div className="tooth-detail-header">
        <div>
          <div className="tooth-detail-title">Gigi {toothId}</div>
          <div className="tooth-detail-sub">{TOOTH_NAMES[toothId] || '—'}</div>
        </div>
        <button type="button" className="tooth-detail-close" onClick={onClose}>
          <span className="material-symbols-rounded">close</span>
        </button>
      </div>

      <div className="tooth-detail-preview">
        <ToothIcon id={toothId} data={data} size={72} />
      </div>

      <div className="tooth-detail-section">
        <div className="tooth-detail-section-title">Kondisi Permukaan</div>
        {SURFACE_FIELDS.map(({ key, label }) => {
          const current = data.surfaces?.[key] ?? null;
          return (
            <div className="tooth-surface-row" key={key}>
              <span className="tooth-surface-label">{label}</span>
              <div className="tooth-surface-options">
                {CONDITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`tooth-surface-chip ${current === opt.value ? 'active' : ''}`}
                    onClick={() => onSurfaceChange(key, opt.value)}
                  >
                    <span className="tooth-surface-swatch" style={{ background: opt.swatch }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="tooth-detail-section">
        <div className="tooth-detail-section-title">Status Gigi</div>
        <div className="tooth-status-options">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={`tooth-status-chip ${(data.statusBelow ?? null) === opt.value ? 'active' : ''}`}
              onClick={() => onStatusBelowChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tooth-detail-section">
        <label className="tooth-rct-toggle">
          <input
            type="checkbox"
            checked={!!data.isRCT}
            onChange={(e) => onRCTChange(e.target.checked)}
          />
          RCT (Root Canal Treatment)
        </label>
      </div>
    </div>
  );
}
