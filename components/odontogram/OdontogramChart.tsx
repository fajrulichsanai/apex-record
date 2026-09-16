'use client';

import { ToothData } from '@/lib/odontogram';
import ToothCell from './ToothCell';
import { ODONTOGRAM_ROWS } from './odontogram-data';

interface OdontogramChartProps {
  teeth: Record<string, ToothData>;
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function OdontogramChart({ teeth, selected, onSelect }: OdontogramChartProps) {
  return (
    <div className="odontogram-chart">
      {ODONTOGRAM_ROWS.map((row, i) => (
        <div className="odontogram-row-group" key={i}>
          <div className="odontogram-quadrant-labels">
            <span>{row.leftLabel}</span>
            <span>{row.rightLabel}</span>
          </div>
          <div className="odontogram-row">
            {[...row.left, ...row.right].map((id) => (
              <ToothCell
                key={id}
                id={id}
                data={teeth[id] || {}}
                selected={selected === id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
