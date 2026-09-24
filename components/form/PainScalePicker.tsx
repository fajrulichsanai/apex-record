'use client';

const SCALE = Array.from({ length: 11 }, (_, i) => i);

function scaleColor(n: number) {
  if (n === 0) return '#2DCB8A';
  if (n <= 3) return '#8BC34A';
  if (n <= 6) return '#F5A623';
  if (n <= 8) return '#FF7A45';
  return '#FF4D4F';
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
