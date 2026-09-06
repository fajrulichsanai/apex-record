'use client';

import { useRef } from 'react';

export interface PainPoint {
  x: number;
  y: number;
}

interface BodyPainMapProps {
  points: PainPoint[];
  onChange: (points: PainPoint[]) => void;
  disabled?: boolean;
}

const VIEW_W = 200;
const VIEW_H = 420;

/** Front-view body outline the doctor taps to mark where a patient hurts; tap a marker to remove it. */
export default function BodyPainMap({ points, onChange, disabled }: BodyPainMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    onChange([...points, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]);
  };

  const removePoint = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(points.filter((_, i) => i !== idx));
  };

  return (
    <div className="pain-map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={`pain-map-svg${disabled ? ' disabled' : ''}`}
        onClick={handleClick}
      >
        <circle className="pain-map-body" cx="100" cy="35" r="28" />
        <rect className="pain-map-body" x="90" y="60" width="20" height="14" />
        <path className="pain-map-body" d="M 60 74 Q 100 68 140 74 L 148 190 Q 100 205 52 190 Z" />
        <path className="pain-map-body" d="M 60 78 L 30 90 L 20 190 L 32 195 L 48 100 Z" />
        <path className="pain-map-body" d="M 140 78 L 170 90 L 180 190 L 168 195 L 152 100 Z" />
        <path className="pain-map-body" d="M 55 188 L 145 188 L 138 230 L 62 230 Z" />
        <path className="pain-map-body" d="M 62 228 L 92 228 L 88 400 L 70 400 Z" />
        <path className="pain-map-body" d="M 108 228 L 138 228 L 130 400 L 112 400 Z" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="7" className="pain-map-point" onClick={(e) => removePoint(i, e)} />
        ))}
      </svg>
      {!disabled && (
        <p className="pain-map-hint">Tap gambar untuk menandai lokasi nyeri, tap tanda untuk menghapus</p>
      )}
    </div>
  );
}
