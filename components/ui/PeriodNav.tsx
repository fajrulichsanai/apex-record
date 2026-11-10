'use client';

import { useMemo } from 'react';
import './PeriodNav.css';

/** Bulan berjalan di zona waktu klinik (WIB), format YYYY-MM. */
export function currentMonth(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/** Geser bulan: shiftMonth('2026-01', -1) → '2025-12'. */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** '2026-10' → 'Oktober 2026' */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

interface MonthNavProps {
  /** YYYY-MM; '' = semua bulan (hanya bila allowAll). */
  month: string;
  onChange: (month: string) => void;
  /** Tampilkan opsi "Semua bulan". */
  allowAll?: boolean;
  /** Berapa bulan ke belakang yang bisa dipilih (default 36). */
  monthsBack?: number;
}

/** Pilih bulan: panah ‹ ›, daftar bulan, dan pintasan "Bulan ini". */
export function MonthNav({ month, onChange, allowAll = false, monthsBack = 36 }: MonthNavProps) {
  const now = currentMonth();
  const options = useMemo(() => {
    const list = Array.from({ length: monthsBack }, (_, i) => shiftMonth(now, -i));
    if (month && !list.includes(month)) list.push(month);
    return list;
  }, [now, monthsBack, month]);
  const atNewest = !month || month >= now;
  return (
    <div className="pn-month">
      <button
        type="button"
        className="pn-nav"
        disabled={!month}
        onClick={() => month && onChange(shiftMonth(month, -1))}
        aria-label="Bulan sebelumnya"
        title="Bulan sebelumnya"
      >
        <span aria-hidden="true" className="material-symbols-rounded">chevron_left</span>
      </button>
      <select className="pn-select" value={month} onChange={(e) => onChange(e.target.value)} aria-label="Pilih bulan">
        {allowAll && <option value="">Semua bulan</option>}
        {options.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="pn-nav"
        disabled={atNewest}
        onClick={() => month && onChange(shiftMonth(month, 1))}
        aria-label="Bulan berikutnya"
        title="Bulan berikutnya"
      >
        <span aria-hidden="true" className="material-symbols-rounded">chevron_right</span>
      </button>
      {month !== now && (
        <button type="button" className="pn-today" onClick={() => onChange(now)}>
          Bulan ini
        </button>
      )}
    </div>
  );
}

interface DayChipsProps {
  days: { date: string; count: number }[];
  /** YYYY-MM-DD yang sedang dipilih, atau null. */
  selected: string | null;
  onSelect: (date: string | null) => void;
  label: string;
  noun: string;
}

/** Tanggal yang berisi data; klik untuk menyaring satu tanggal, klik lagi untuk melepas. */
export function DayChips({ days, selected, onSelect, label, noun }: DayChipsProps) {
  if (days.length === 0) return null;
  return (
    <div className="pn-days" role="group" aria-label={label}>
      <span className="pn-days-label">{label}:</span>
      {days.map((d) => {
        const on = selected === d.date;
        return (
          <button
            key={d.date}
            type="button"
            className={`pn-day${on ? ' on' : ''}`}
            aria-pressed={on}
            title={`${d.count} ${noun} · ${on ? 'klik untuk tampilkan semua tanggal' : 'klik untuk saring tanggal ini'}`}
            onClick={() => onSelect(on ? null : d.date)}
          >
            {Number(d.date.slice(8))}
            {d.count > 1 && <small aria-label={`${d.count} ${noun}`}>{d.count}</small>}
          </button>
        );
      })}
      {selected && (
        <button type="button" className="pn-clear" onClick={() => onSelect(null)}>
          Semua tanggal
        </button>
      )}
    </div>
  );
}

interface PagerProps {
  meta: { total: number; page: number; limit: number; totalPages: number };
  onPage: (page: number) => void;
  loading?: boolean;
  noun: string;
}

/** Keterangan "11–20 dari 24 …" + tombol halaman. */
export function Pager({ meta, onPage, loading = false, noun }: PagerProps) {
  if (meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="pn-pager">
      <span className="pn-range">
        {from}–{to} dari {meta.total} {noun}
      </span>
      {meta.totalPages > 1 && (
        <div className="pn-pager-btns">
          <button type="button" className="pn-btn" disabled={meta.page <= 1 || loading} onClick={() => onPage(meta.page - 1)}>
            Sebelumnya
          </button>
          <span className="pn-page">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            type="button"
            className="pn-btn"
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => onPage(meta.page + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
