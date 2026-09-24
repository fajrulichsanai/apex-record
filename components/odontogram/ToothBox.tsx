'use client';

import { ToothCondition } from '@/lib/odontogram';
import ToothIcon from './ToothIcon';
import { getToothLayout } from './odontogramData';

interface ToothBoxProps {
  toothNumber: number;
  condition?: ToothCondition;
  isSelected?: boolean;
  onClick: () => void;
}

export default function ToothBox({ toothNumber, condition, isSelected, onClick }: ToothBoxProps) {
  const layout = getToothLayout(toothNumber);
  const teksAtas = (condition?.teksAtas || '').trim();

  const numberLabel = <div className={`tooth-number${isSelected ? ' selected' : ''}`}>{toothNumber}</div>;
  const tagLabel = teksAtas ? <div className="tooth-tag">{teksAtas}</div> : null;

  return (
    <button
      type="button"
      className={`tooth-cell${isSelected ? ' selected' : ''}`}
      onClick={onClick}
      title={`Gigi ${toothNumber}`}
    >
      {layout.isUpper ? (
        <div className="tooth-slot tooth-slot-top">
          {tagLabel}
          {numberLabel}
        </div>
      ) : (
        <div className="tooth-slot tooth-slot-top" />
      )}

      <ToothIcon toothNumber={toothNumber} condition={condition} selected={isSelected} />

      <div className="tooth-rct-slot">
        {condition?.rct && (
          <svg width="16" height="12" viewBox="0 0 16 12" aria-label="RCT">
            <path d="M8,12 L0,0 L16,0 Z" fill="#FFFFFF" stroke="#17160F" strokeWidth="1" />
          </svg>
        )}
      </div>

      {!layout.isUpper ? (
        <div className="tooth-slot tooth-slot-bottom">
          {numberLabel}
          {tagLabel}
        </div>
      ) : (
        <div className="tooth-slot tooth-slot-bottom" />
      )}
    </button>
  );
}
