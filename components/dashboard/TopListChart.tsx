'use client';

import { FiStar } from 'react-icons/fi';

interface TopListItem {
  label: string;
  value: number;
}

interface TopListChartProps {
  title: string;
  subtitle?: string;
  items: TopListItem[];
  valueFormatter?: (value: number) => string;
  loading?: boolean;
}

export default function TopListChart({ title, subtitle, items, valueFormatter, loading }: TopListChartProps) {
  const maxValue = Math.max(1, ...items.map((i) => i.value));
  const format = valueFormatter ?? ((v: number) => String(v));

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-icon indigo">
          <FiStar />
        </div>
        <div className="chart-panel-heading">
          <div className="chart-panel-title">{title}</div>
          {subtitle && <div className="chart-panel-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="chart-panel-body">
        {loading ? null : items.length === 0 ? (
          <div className="chart-empty">
            <div className="chart-empty-icon">
              <FiStar />
            </div>
            <div className="chart-empty-text">Belum ada data pada periode ini</div>
          </div>
        ) : (
          <div className="ranked-list">
            {items.map((item, idx) => (
              <div className="ranked-item" key={`${item.label}-${idx}`}>
                <span className="ranked-rank">{idx + 1}</span>
                <div className="ranked-body">
                  <div className="ranked-top-row">
                    <span className="ranked-label">{item.label}</span>
                    <span className="ranked-value">{format(item.value)}</span>
                  </div>
                  <div className="ranked-bar-track">
                    <div
                      className="ranked-bar-fill"
                      style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
