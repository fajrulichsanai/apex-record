'use client';

const SCALE = Array.from({ length: 11 }, (_, i) => i);

function scaleColor(n: number) {
  // Green → red severity scale in the app palette (white text on each).
  if (n === 0) return '#3E8E36';
  if (n <= 3) return '#6A8F2A';
  if (n <= 6) return '#B07A12';
  if (n <= 8) return '#C8581F';
  return '#C1381F';
}

interface PainScalePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Numeric 0 (no pain) - 10 (worst pain) tap picker, color-graded green to red. */
export default function PainScalePicker({ value, onChange, disabled }: PainScalePickerProps) {
  return (
    <div className="pain-scale-picker">
      {SCALE.map((n) => {
        const selected = value === String(n);
        return (
          <button
            key={n}
            type="button"
            className={`pain-scale-btn${selected ? ' active' : ''}`}
            style={selected ? { background: scaleColor(n), borderColor: scaleColor(n) } : undefined}
            onClick={() => onChange(selected ? '' : String(n))}
            disabled={disabled}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
