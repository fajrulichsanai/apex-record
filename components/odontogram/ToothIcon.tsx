'use client';

import { ToothData } from '@/lib/odontogram';
import { isAnteriorTooth, isDeciduousTooth, quadrantSide } from './odontogram-data';

const CONDITION_FILL: Record<string, string> = {
  karies: '#1A2340',
  komposit: '#2DCB8A',
  gic: '#EC4899',
};

function fillFor(condition?: string | null) {
  return (condition && CONDITION_FILL[condition]) || '#FFFFFF';
}

interface ToothIconProps {
  id: string;
  data: ToothData;
  selected?: boolean;
  size?: number;
}

/**
 * Gigi anterior (caninus + insisivus) digambar terbagi 4 segitiga oleh diagonal kotak.
 * Gigi posterior (premolar + molar) digambar dengan kotak oklusal di tengah dikelilingi trapesium.
 */
export default function ToothIcon({ id, data, selected, size = 34 }: ToothIconProps) {
  const anterior = isAnteriorTooth(id);
  const deciduous = isDeciduousTooth(id);
  const side = quadrantSide(id);
  const isUpper = side === 'upper-right' || side === 'upper-left';
  const mesialIsRight = side === 'upper-right' || side === 'lower-right';

  const { buccal, palatal, mesial, distal, occlusal } = data.surfaces || {};

  const topCondition = isUpper ? buccal : palatal;
  const bottomCondition = isUpper ? palatal : buccal;
  const leftCondition = mesialIsRight ? distal : mesial;
  const rightCondition = mesialIsRight ? mesial : distal;

  const stroke = selected ? '#4F7EF8' : '#4A5568';
  const strokeWidth = selected ? 1.6 : 1;
  const baseFill = deciduous ? '#FEF3C7' : '#FFFFFF';
  const missing = data.statusBelow === 'MISSING';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="tooth-icon"
      role="img"
      aria-label={`Gigi ${id}`}
    >
      <rect x="0.5" y="0.5" width="39" height="39" fill={baseFill} />

      {anterior ? (
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
          <rect x="12" y="12" width="16" height="16" fill={fillFor(occlusal)} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}

      <rect x="0.5" y="0.5" width="39" height="39" fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {data.statusBelow === 'CFR' && (
        <text x="20" y="26" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1A2340">
          #
        </text>
      )}
      {data.statusBelow === 'RRX' && (
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
