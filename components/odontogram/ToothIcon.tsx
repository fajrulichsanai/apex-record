'use client';

import { ToothCondition } from '@/lib/odontogram';
import { getToothLayout, SURFACE_FIELD, SURFACE_COLORS } from './odontogramData';

interface ToothIconProps {
  toothNumber: number;
  condition?: ToothCondition;
  selected?: boolean;
  size?: number;
}

function fillFor(condition?: string): string {
  return (condition && SURFACE_COLORS[condition]) || '#FFFFFF';
}

/**
 * Gigi anterior (caninus + insisivus) digambar terbagi 4 segitiga oleh
 * diagonal kotak. Gigi posterior (premolar + molar) digambar dengan kotak
 * oklusal di tengah dikelilingi trapesium — kaidah gambar odontogram standar.
 */
export default function ToothIcon({ toothNumber, condition, selected, size = 34 }: ToothIconProps) {
  const layout = getToothLayout(toothNumber);

  const topCondition = condition?.[SURFACE_FIELD[layout.top]];
  const bottomCondition = condition?.[SURFACE_FIELD[layout.bottom]];
  const leftCondition = condition?.[SURFACE_FIELD[layout.left]];
  const rightCondition = condition?.[SURFACE_FIELD[layout.right]];
  const occlusalCondition = condition?.surfaceOcclusal;

  const stroke = selected ? '#4F7EF8' : '#4A5568';
  const strokeWidth = selected ? 1.6 : 1;
  const baseFill = layout.isDeciduous ? '#FEF3C7' : '#FFFFFF';
  const missing = condition?.teksBawah === 'MISSING';

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="tooth-icon" role="img" aria-label={`Gigi ${toothNumber}`}>
      <rect x="0.5" y="0.5" width="39" height="39" fill={baseFill} />

      {layout.isAnterior ? (
        <>
          <path d="M0,0 L40,0 L20,20 Z" fill={fillFor(topCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M0,40 L40,40 L20,20 Z" fill={fillFor(bottomCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M0,0 L0,40 L20,20 Z" fill={fillFor(leftCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M40,0 L40,40 L20,20 Z" fill={fillFor(rightCondition)} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      ) : (
        <>
          <path d="M0,0 L40,0 L28,12 L12,12 Z" fill={fillFor(topCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M0,40 L40,40 L28,28 L12,28 Z" fill={fillFor(bottomCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M0,0 L12,12 L12,28 L0,40 Z" fill={fillFor(leftCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M40,0 L28,12 L28,28 L40,40 Z" fill={fillFor(rightCondition)} stroke={stroke} strokeWidth={strokeWidth} />
          <rect x="12" y="12" width="16" height="16" fill={fillFor(occlusalCondition)} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}

      <rect x="0.5" y="0.5" width="39" height="39" fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {condition?.teksBawah === 'CFR' && (
        <text x="20" y="26" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1A2340">
          #
        </text>
      )}
      {condition?.teksBawah === 'RRX' && (
        <path
          d="M8,24 L16,32 L32,12"
          fill="none"
          stroke="#1A2340"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {missing && (
        <>
          <line x1="2" y1="2" x2="38" y2="38" stroke="#1A2340" strokeWidth="3" />
          <line x1="38" y1="2" x2="2" y2="38" stroke="#1A2340" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
