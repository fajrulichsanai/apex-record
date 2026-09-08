'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiActivity } from 'react-icons/fi';

interface VisitTrendChartProps {
  data: { date: string; count: number }[];
  loading?: boolean;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function VisitTrendChart({ data, loading }: VisitTrendChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({ ...d, label: formatShortDate(d.date) }));

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-icon indigo">
          <FiActivity />
        </div>
        <div className="chart-panel-heading">
          <div className="chart-panel-title">Tren Kunjungan</div>
          <div className="chart-panel-sub">30 hari terakhir</div>
        </div>
      </div>
      <div className="chart-panel-body">
        {loading ? null : total === 0 ? (
          <div className="chart-empty">
            <div className="chart-empty-icon">
              <FiActivity />
            </div>
            <div className="chart-empty-text">Belum ada kunjungan pada periode ini</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b62e0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5b62e0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                formatter={(value) => [`${Number(value)} kunjungan`, '']}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Kunjungan"
                stroke="#5b62e0"
                strokeWidth={2.5}
                fill="url(#visitTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
