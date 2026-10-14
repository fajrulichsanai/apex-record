'use client';

import { deviceFlag, locationFlag, STATUS_META, type AttendanceDay, type DayStatus } from '@/lib/attendance';

export function StatusPill({ status }: { status: DayStatus }) {
  const meta = STATUS_META[status];
  return <span className={`ab-pill ${meta.tone}`}>{meta.label}</span>;
}

/** Tanda yang perlu dilihat owner: lokasi, perangkat, terlambat, koreksi */
export function DayFlags({ day, withMinutes = true }: { day: AttendanceDay; withMinutes?: boolean }) {
  const flags: { key: string; label: string; tone: string }[] = [];
  const seen = new Set<string>();
  for (const [kind, side] of [
    ['Masuk', day.clockIn],
    ['Pulang', day.clockOut],
  ] as const) {
    for (const flag of [locationFlag(side), deviceFlag(side)]) {
      if (!flag || seen.has(flag.label)) continue;
      seen.add(flag.label);
      flags.push({ key: `${kind}-${flag.label}`, label: `${kind}: ${flag.label}`, tone: flag.tone });
    }
  }
  if (withMinutes && day.lateMinutes > 0) {
    flags.push({ key: 'late', label: `Terlambat ${day.lateMinutes} m`, tone: 'warn' });
  }
  if (withMinutes && day.earlyMinutes > 0) {
    flags.push({ key: 'early', label: `Pulang cepat ${day.earlyMinutes} m`, tone: 'warn' });
  }
  if (day.correction) {
    flags.push({
      key: 'corr',
      label: `Dikoreksi${day.correction.byName ? ` oleh ${day.correction.byName}` : ''}`,
      tone: 'info',
    });
  }
  if (flags.length === 0) return null;
  return (
    <div className="ab-flags">
      {flags.map((f) => (
        <span key={f.key} className={`ab-pill ${f.tone}`} title={f.key === 'corr' ? (day.correction?.reason ?? '') : undefined}>
          {f.label}
        </span>
      ))}
    </div>
  );
}
