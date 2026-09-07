'use client';

import { Fragment, useMemo } from 'react';
import { FinancialReportProResponse } from '@/lib/reports';

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface VisitHeatmapProps {
  data: FinancialReportProResponse['visitHeatmap'];
}

export default function VisitHeatmap({ data }: VisitHeatmapProps) {
  const { grid, max, busiest } = useMemo(() => {
    const map = new Map<string, number>();
    let maxCount = 0;
    let busiestEntry: { dayOfWeek: number; hour: number; count: number } | null = null;

    for (const row of data) {
      map.set(`${row.dayOfWeek}-${row.hour}`, row.count);
      if (row.count > maxCount) maxCount = row.count;
      if (!busiestEntry || row.count > busiestEntry.count) busiestEntry = row;
    }

    return { grid: map, max: maxCount, busiest: busiestEntry };
  }, [data]);

  return (
    <div className="panel chart-panel wide">
      <div className="panel-header">
        <h2>Heatmap Jam Kunjungan</h2>
        {busiest && busiest.count > 0 && (
          <span className="heatmap-busiest">
            Jam tersibuk: {DAY_LABELS[busiest.dayOfWeek - 1]} pukul {String(busiest.hour).padStart(2, '0')}.00 ({busiest.count} kunjungan)
          </span>
        )}
      </div>
      {data.length === 0 || max === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Belum ada kunjungan pada periode ini</div>
        </div>
      ) : (
        <div className="heatmap-scroll">
          <div className="heatmap-grid" style={{ gridTemplateColumns: `44px repeat(24, 1fr)` }}>
            <div className="heatmap-corner" />
            {HOURS.map((h) => (
              <div key={h} className="heatmap-hour-label">{h}</div>
            ))}
            {DAY_LABELS.map((label, dayIdx) => {
              const dow = dayIdx + 1;
              return (
                <Fragment key={dow}>
                  <div className="heatmap-day-label">{label}</div>
                  {HOURS.map((h) => {
                    const count = grid.get(`${dow}-${h}`) ?? 0;
                    const intensity = max > 0 ? count / max : 0;
                    return (
                      <div
                        key={`${dow}-${h}`}
                        className="heatmap-cell"
                        style={{
                          background: count === 0 ? undefined : `rgba(79, 126, 248, ${0.12 + intensity * 0.78})`,
                        }}
                        title={`${label} ${String(h).padStart(2, '0')}.00 — ${count} kunjungan`}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
