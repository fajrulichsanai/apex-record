'use client';

import { ToothCondition } from '@/lib/odontogram';
import { getToothLayout, SURFACE_FIELD, SURFACE_COLORS, teksBadgeColor } from './odontogramData';

interface ToothBoxProps {
  toothNumber: number;
  condition?: ToothCondition;
  onClick: () => void;
}

export default function ToothBox({ toothNumber, condition, onClick }: ToothBoxProps) {
  const layout = getToothLayout(toothNumber);
  const teksAtas = condition?.teksAtas;
  const teksBawah = condition?.teksBawah;
  const rct = condition?.rct;

  const surfaceStyle = (key: keyof typeof SURFACE_FIELD) => {
    const value = condition?.[SURFACE_FIELD[key]];
    return value ? { background: SURFACE_COLORS[value] } : undefined;
  };

  if (teksBawah === 'MISSING') {
    return (
      <button type="button" className="tooth-box tooth-missing" onClick={onClick} title={`Gigi ${toothNumber} — Hilang/Dicabut`}>
        <span className="material-symbols-rounded">close</span>
        <span className="tooth-number">{toothNumber}</span>
      </button>
    );
  }

  return (
    <button type="button" className="tooth-box" onClick={onClick} title={`Gigi ${toothNumber}`}>
      {teksAtas && (
        <span className="tooth-teks" style={{ color: teksBadgeColor(teksAtas) }}>
          {teksAtas}
        </span>
      )}

      <div className="tooth-grid">
        <span className="t-cell t-top" style={surfaceStyle(layout.top)} />
        <span className="t-cell t-left" style={surfaceStyle(layout.left)} />
        <span className="t-cell t-center" style={surfaceStyle('occlusal')} />
        <span className="t-cell t-right" style={surfaceStyle(layout.right)} />
        <span className="t-cell t-bottom" style={surfaceStyle(layout.bottom)} />
      </div>

      <span className="tooth-number">{toothNumber}</span>

      {teksBawah && (
        <span className="tooth-teks" style={{ color: teksBadgeColor(teksBawah) }}>
          {teksBawah}
        </span>
      )}

      {rct && (
        <span className="tooth-badge tooth-badge-rct" title="Root Canal Treatment">
          RCT
        </span>
      )}
    </button>
  );
}
