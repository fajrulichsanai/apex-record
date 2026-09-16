'use client';

import { ToothData } from '@/lib/odontogram';
import ToothIcon from './ToothIcon';
import { isUpperTooth } from './odontogram-data';

interface ToothCellProps {
  id: string;
  data: ToothData;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function ToothCell({ id, data, selected, onSelect }: ToothCellProps) {
  const upper = isUpperTooth(id);
  const statusAbove = (data.statusAbove || '').trim();

  const numberLabel = (
    <div className={`tooth-number ${selected ? 'selected' : ''}`}>{id}</div>
  );
  const tagLabel = statusAbove ? <div className="tooth-tag">{statusAbove}</div> : null;

  return (
    <button
      type="button"
      className={`tooth-cell ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(id)}
      title={id}
    >
      {upper ? (
        <div className="tooth-slot tooth-slot-top">
          {tagLabel}
          {numberLabel}
        </div>
      ) : (
        <div className="tooth-slot tooth-slot-top" />
      )}

      <ToothIcon id={id} data={data} selected={selected} />

      <div className="tooth-rct-slot">
        {data.isRCT && (
          <svg width="16" height="12" viewBox="0 0 16 12">
            <path d="M8,12 L0,0 L16,0 Z" fill="#FFFFFF" stroke="#1A2340" strokeWidth="1" />
          </svg>
        )}
      </div>

      {!upper ? (
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
