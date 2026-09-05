'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reservationsApi, ReservationItem, ReservationStatus } from '@/lib/reservations';
import { ApiError } from '@/lib/api-client';

type ViewMode = 'week' | 'month';

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: '#F5A623',
  confirmed: '#7B5CFA',
  completed: '#2DCB8A',
  cancelled: '#FF4D4F',
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Menunggu Konfirmasi',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const VIEW_LABEL: Record<ViewMode, string> = { week: 'Mingguan', month: 'Bulanan' };
const MAX_MONTH_CELL_ITEMS = 3;

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday;
}

function reservationLabel(r: ReservationItem) {
  const parts = [r.patientName];
  if (r.practitioner?.name) parts.push(`dr. ${r.practitioner.name}`);
  return parts.join(' · ');
}

interface Props {
  onSelectReservation?: (reservation: ReservationItem) => void;
  onSelectDate?: (dateIso: string) => void;
}

export default function ReservationCalendar({ onSelectReservation, onSelectDate }: Props) {
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => toISO(new Date()));
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const ref = fromISO(currentDate);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const anchor = fromISO(currentDate);
    if (view === 'week') {
      const start = startOfWeek(anchor);
      return { rangeStart: toISO(start), rangeEnd: toISO(new Date(start.getTime() + 6 * DAY_MS)) };
    }
    return {
      rangeStart: toISO(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),
      rangeEnd: toISO(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)),
    };
  }, [view, currentDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await reservationsApi.list({ dateFrom: rangeStart, dateTo: rangeEnd, limit: 200 });
      setReservations(res.data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat reservasi');
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, ReservationItem[]>();
    for (const r of reservations) {
      const d = r.reservationDate.slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.jamSlot || '').localeCompare(b.jamSlot || ''));
    }
    return map;
  }, [reservations]);

  const navigate = (dir: 1 | -1) => {
    const d = fromISO(currentDate);
    if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(toISO(d));
  };

  const rangeLabel =
    view === 'week'
      ? `${fromISO(rangeStart).getDate()} - ${fromISO(rangeEnd).getDate()} ${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`
      : `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`;

  const weekDays = useMemo(() => {
    const start = fromISO(rangeStart);
    return Array.from({ length: 7 }, (_, i) => toISO(new Date(start.getTime() + i * DAY_MS)));
  }, [rangeStart]);

  const monthCells = useMemo(() => {
    const first = fromISO(rangeStart);
    const leadingBlanks = (first.getDay() + 6) % 7; // Monday-first offset
    const daysInMonth = fromISO(rangeEnd).getDate();
    const cells: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toISO(new Date(first.getFullYear(), first.getMonth(), day)));
    }
    return cells;
  }, [rangeStart, rangeEnd]);

  const todayIso = toISO(new Date());

  return (
    <div className="reservation-calendar">
      <div className="reservation-calendar-toolbar">
        <div className="reservation-calendar-nav">
          <button className="btn-row-action" onClick={() => navigate(-1)} aria-label="Sebelumnya">
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <button className="btn-row-action" onClick={() => setCurrentDate(toISO(new Date()))}>
            Hari Ini
          </button>
          <button className="btn-row-action" onClick={() => navigate(1)} aria-label="Berikutnya">
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
          <span className="reservation-calendar-label">{rangeLabel}</span>
        </div>
        <div className="filter-tabs">
          {(['week', 'month'] as ViewMode[]).map((v) => (
            <button key={v} className={`filter-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="reservation-calendar-legend">
        {(Object.keys(STATUS_LABEL) as ReservationStatus[]).map((s) => (
          <span key={s} className="reservation-calendar-legend-item">
            <span className="reservation-calendar-legend-dot" style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {loading && <div className="reservation-calendar-status">Memuat…</div>}
      {loadError && <div className="reservation-calendar-status error">{loadError}</div>}

      {view === 'week' ? (
        <div className="res-week-grid">
          {weekDays.map((dateIso) => {
            const dayReservations = byDate.get(dateIso) || [];
            const d = fromISO(dateIso);
            return (
              <div key={dateIso} className={`res-week-day ${dateIso === todayIso ? 'is-today' : ''}`}>
                <button
                  type="button"
                  className="res-week-day-header"
                  onClick={() => onSelectDate?.(dateIso)}
                >
                  <span className="res-week-day-name">{DAY_LABELS[(d.getDay() + 6) % 7]}</span>
                  <span className="res-week-day-num">{d.getDate()}</span>
                  {dayReservations.length > 0 && (
                    <span className="res-day-count">{dayReservations.length}</span>
                  )}
                </button>
                <div className="res-week-day-list">
                  {dayReservations.length === 0 ? (
                    <div className="res-week-day-empty">Tidak ada reservasi</div>
                  ) : (
                    dayReservations.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="res-chip"
                        style={{ borderLeftColor: STATUS_COLOR[r.status] }}
                        onClick={() => onSelectReservation?.(r)}
                      >
                        <div className="res-chip-time">{(r.jamSlot || '-').slice(0, 5)}</div>
                        <div className="res-chip-title">{reservationLabel(r)}</div>
                        {r.notes && <div className="res-chip-notes">{r.notes}</div>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="res-month">
          <div className="res-month-weekdays">
            {DAY_LABELS.map((label) => (
              <div key={label} className="res-month-weekday">{label}</div>
            ))}
          </div>
          <div className="res-month-grid">
            {monthCells.map((dateIso, i) => {
              if (!dateIso) return <div key={`blank-${i}`} className="res-month-cell is-blank" />;
              const dayReservations = byDate.get(dateIso) || [];
              const extra = dayReservations.length - MAX_MONTH_CELL_ITEMS;
              return (
                <div key={dateIso} className={`res-month-cell ${dateIso === todayIso ? 'is-today' : ''}`}>
                  <button type="button" className="res-month-cell-header" onClick={() => onSelectDate?.(dateIso)}>
                    <span className="res-month-cell-num">{fromISO(dateIso).getDate()}</span>
                    {dayReservations.length > 0 && (
                      <span className="res-day-count">{dayReservations.length}</span>
                    )}
                  </button>
                  <div className="res-month-cell-items">
                    {dayReservations.slice(0, MAX_MONTH_CELL_ITEMS).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="res-month-item"
                        style={{ borderLeftColor: STATUS_COLOR[r.status] }}
                        onClick={() => onSelectReservation?.(r)}
                        title={reservationLabel(r)}
                      >
                        {(r.jamSlot || '-').slice(0, 5)} {r.patientName}
                      </button>
                    ))}
                    {extra > 0 && (
                      <button type="button" className="res-month-more" onClick={() => onSelectDate?.(dateIso)}>
                        +{extra} lainnya
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
