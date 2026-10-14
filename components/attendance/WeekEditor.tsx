'use client';

import { DAY_NAMES, type DayMode, type DaySchedule } from '@/lib/attendance';

/** Urutan tampilan Senin → Minggu; data tetap berindeks 0 = Minggu */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function emptyWeek(): DaySchedule[] {
  return DAY_NAMES.map((_, i): DaySchedule => (i === 0 ? { mode: 'off', start: null, end: null } : { mode: 'work', start: '08:00', end: '16:00' }));
}

/** Pesan kesalahan pertama, atau null bila jadwal valid */
export function weekError(week: DaySchedule[]): string | null {
  for (const i of DISPLAY_ORDER) {
    const d = week[i];
    if (d.mode !== 'work') continue;
    if (!d.start || !d.end) return `Isi jam mulai dan selesai untuk ${DAY_NAMES[i]}`;
    if (d.end <= d.start) return `Jam selesai harus setelah jam mulai (${DAY_NAMES[i]})`;
  }
  return null;
}

export default function WeekEditor({
  idPrefix,
  week,
  onChange,
  disabled,
}: {
  idPrefix: string;
  week: DaySchedule[];
  onChange: (week: DaySchedule[]) => void;
  disabled?: boolean;
}) {
  const update = (i: number, patch: Partial<DaySchedule>) =>
    onChange(week.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <div className="ab-week">
      {DISPLAY_ORDER.map((i) => {
        const d = week[i];
        return (
          <div key={i} className="ab-week-row">
            <strong>{DAY_NAMES[i]}</strong>
            <select
              id={`${idPrefix}-mode-${i}`}
              aria-label={`Jenis jadwal ${DAY_NAMES[i]}`}
              className="ab-select"
              value={d.mode}
              disabled={disabled}
              onChange={(e) => {
                const mode = e.target.value as DayMode;
                update(
                  i,
                  mode === 'work'
                    ? { mode, start: d.start ?? '08:00', end: d.end ?? '16:00' }
                    : { mode, start: null, end: null },
                );
              }}
            >
              <option value="work">Kerja</option>
              <option value="off">Libur</option>
              <option value="flexible">Fleksibel</option>
            </select>
            {d.mode === 'work' ? (
              <div className="times">
                <input
                  id={`${idPrefix}-start-${i}`}
                  aria-label={`Jam mulai ${DAY_NAMES[i]}`}
                  type="time"
                  className="ab-input"
                  value={d.start ?? ''}
                  disabled={disabled}
                  onChange={(e) => update(i, { start: e.target.value })}
                />
                <span>–</span>
                <input
                  id={`${idPrefix}-end-${i}`}
                  aria-label={`Jam selesai ${DAY_NAMES[i]}`}
                  type="time"
                  className="ab-input"
                  value={d.end ?? ''}
                  disabled={disabled}
                  onChange={(e) => update(i, { end: e.target.value })}
                />
              </div>
            ) : (
              <span className="ab-muted">
                {d.mode === 'flexible' ? 'Tanpa jam tetap, tidak dihitung terlambat' : 'Tidak ada jadwal'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
