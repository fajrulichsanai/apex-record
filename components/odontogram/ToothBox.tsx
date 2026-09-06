'use client';

import { ToothCondition } from '@/lib/odontogram';
import { getToothLayout, SURFACE_FIELD, SURFACE_COLORS, WHOLE_CONDITION_BADGE } from './odontogramData';

interface ToothBoxProps {
  toothNumber: number;
  condition?: ToothCondition;
  onClick: () => void;
}

export default function ToothBox({ toothNumber, condition, onClick }: ToothBoxProps) {
  const layout = getToothLayout(toothNumber);
  const whole = condition?.wholeCondition;

  const surfaceStyle = (key: keyof typeof SURFACE_FIELD) => {
    const value = condition?.[SURFACE_FIELD[key]];
    return value ? { background: SURFACE_COLORS[value] } : undefined;
  };

  if (whole === 'missing') {
    return (
      <button type="button" className="tooth-box tooth-missing" onClick={onClick} title={`Gigi ${toothNumber} — Hilang/Dicabut`}>
        <span className="material-symbols-rounded">close</span>
        <span className="tooth-number">{toothNumber}</span>
      </button>
    );
  }

  if (whole === 'to_be_extracted') {
    return (
      <button type="button" className="tooth-box tooth-extract" onClick={onClick} title={`Gigi ${toothNumber} — Indikasi Pencabutan`}>
        <span className="material-symbols-rounded">arrow_circle_down</span>
        <span className="tooth-number">{toothNumber}</span>
      </button>
    );
  }

  const badge = whole ? WHOLE_CONDITION_BADGE[whole] : undefined;

  return (
    <button
      type="button"
      className={`tooth-box${whole === 'crown' ? ' tooth-crown' : ''}${whole === 'unerupted' ? ' tooth-unerupted' : ''}`}
      onClick={onClick}
      title={`Gigi ${toothNumber}`}
    >
      <div className="tooth-grid">
        <span className="t-cell t-top" style={surfaceStyle(layout.top)} />
        <span className="t-cell t-left" style={surfaceStyle(layout.left)} />
        <span className="t-cell t-center" style={surfaceStyle('occlusal')} />
        <span className="t-cell t-right" style={surfaceStyle(layout.right)} />
        <span className="t-cell t-bottom" style={surfaceStyle(layout.bottom)} />
      </div>
      <span className="tooth-number">{toothNumber}</span>
      {badge && (
        <span className="tooth-badge" style={{ background: badge.color }}>
          {badge.label}
        </span>
      )}
    </button>
  );
}
