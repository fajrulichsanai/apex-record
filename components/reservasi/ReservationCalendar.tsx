'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import calendarjs from '@calendarjs/ce';
import type Schedule from '@calendarjs/ce/dist/types/schedule/index';
import type Calendar from '@calendarjs/ce/dist/types/calendar/index';
import '@calendarjs/ce/dist/style.css';
import { reservationsApi, ReservationItem, ReservationStatus } from '@/lib/reservations';
import { ApiError } from '@/lib/api-client';

type ViewMode = 'day' | 'week' | 'month';

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: '#F5A623',
  confirmed: '#7B5CFA',
  completed: '#2DCB8A',
  cancelled: '#FF4D4F',
};

const DAY_MS = 24 * 60 * 60 * 1000;

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

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

const VIEW_LABEL: Record<ViewMode, string> = { day: 'Harian', week: 'Mingguan', month: 'Bulanan' };
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface Props {
  onSelectReservation?: (reservation: ReservationItem) => void;
}

export default function ReservationCalendar({ onSelectReservation }: Props) {
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => toISO(new Date()));
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scheduleRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const scheduleInstance = useRef<Schedule.Instance | null>(null);
  const calendarInstance = useRef<Calendar.Instance | null>(null);
  const onSelectRef = useRef(onSelectReservation);
  useEffect(() => {
    onSelectRef.current = onSelectReservation;
  }, [onSelectReservation]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const ref = fromISO(currentDate);
      const dateFrom =
        view === 'day' ? currentDate : view === 'week' ? toISO(startOfWeek(ref)) : toISO(new Date(ref.getFullYear(), ref.getMonth(), 1));
      const res = await reservationsApi.list({ dateFrom, limit: 100 });
      setReservations(res.data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat reservasi');
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  useEffect(() => {
    load();
  }, [load]);

  const ref = fromISO(currentDate);
  const rangeEnd =
    view === 'day'
      ? currentDate
      : view === 'week'
        ? toISO(new Date(startOfWeek(ref).getTime() + 6 * DAY_MS))
        : toISO(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
  const rangeStart = view === 'day' ? currentDate : view === 'week' ? toISO(startOfWeek(ref)) : toISO(new Date(ref.getFullYear(), ref.getMonth(), 1));

  const visible = reservations.filter((r) => {
    const d = r.reservationDate.slice(0, 10);
    return d >= rangeStart && d <= rangeEnd;
  });

  const scheduleEvents = visible.map((r) => {
    const start = (r.jamSlot || '09:00').slice(0, 5);
    return {
      guid: String(r.id),
      title: `${r.patientName}${r.practitioner?.name ? ' · ' + r.practitioner.name : ''}`,
      date: r.reservationDate.slice(0, 10),
      start,
      end: addMinutes(start, 30),
      color: STATUS_COLOR[r.status],
      readonly: true,
      reservationId: r.id,
    };
  });

  const calendarEvents = visible.map((r) => ({ date: r.reservationDate.slice(0, 10), reservationId: r.id }));

  // Init/update the day/week schedule instance
  useEffect(() => {
    if (!scheduleRef.current) return;
    if (!scheduleInstance.current) {
      scheduleInstance.current = calendarjs.Schedule(scheduleRef.current, {
        type: view === 'month' ? 'week' : view,
        value: currentDate,
        data: scheduleEvents,
        grid: 30,
        ondblclick: (_self: Schedule.Instance, ev: Schedule.Event) => {
          const found = reservations.find((r) => String(r.id) === String(ev.reservationId));
          if (found) onSelectRef.current?.(found);
        },
      });
    } else {
      scheduleInstance.current.type = view === 'month' ? 'week' : view;
      scheduleInstance.current.value = currentDate;
      scheduleInstance.current.setData(scheduleEvents);
      scheduleInstance.current.render();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate, reservations]);

  // Init/update the month calendar instance
  useEffect(() => {
    if (!calendarRef.current) return;
    if (!calendarInstance.current) {
      calendarInstance.current = calendarjs.Calendar(calendarRef.current, {
        type: 'inline',
        grid: true,
        value: currentDate,
        data: calendarEvents,
        onchange: (_self: Calendar.Instance, value: string | number) => {
          setCurrentDate(String(value).slice(0, 10));
          setView('day');
        },
      });
    } else {
      const instance = calendarInstance.current as Calendar.Instance & { data?: unknown[]; render?: () => void };
      instance.setValue?.(currentDate);
      instance.data = calendarEvents;
      instance.render?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, reservations]);

  const navigate = (dir: 1 | -1) => {
    const d = fromISO(currentDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(toISO(d));
  };

  const rangeLabel =
    view === 'day'
      ? `${ref.getDate()} ${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`
      : view === 'week'
        ? `${fromISO(rangeStart).getDate()} - ${fromISO(rangeEnd).getDate()} ${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`
        : `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`;

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
          {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
            <button key={v} className={`filter-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="reservation-calendar-status">Memuat…</div>}
      {loadError && <div className="reservation-calendar-status error">{loadError}</div>}

      <div className="reservation-calendar-body">
        <div ref={scheduleRef} style={{ display: view === 'month' ? 'none' : 'block' }} />
        <div ref={calendarRef} style={{ display: view === 'month' ? 'block' : 'none' }} />
      </div>
    </div>
  );
}
