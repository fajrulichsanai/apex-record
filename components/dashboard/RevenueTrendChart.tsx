'use client';

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiTrendingUp } from 'react-icons/fi';

interface RevenueTrendChartProps {
  data: { date: string; revenue: number; collected: number }[];
  loading?: boolean;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatRupiahCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return `${value}`;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function RevenueTrendChart({ data, loading }: RevenueTrendChartProps) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const chartData = data.map((d) => ({ ...d, label: formatShortDate(d.date) }));

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-icon green">
          <FiTrendingUp />
        </div>
        <div className="chart-panel-heading">
          <div className="chart-panel-title">Tren Pendapatan</div>
          <div className="chart-panel-sub">30 hari terakhir</div>
        </div>
      </div>
      <div className="chart-panel-body">
        {loading ? null : total === 0 ? (
          <div className="chart-empty">
            <div className="chart-empty-icon">
              <FiTrendingUp />
            </div>
            <div className="chart-empty-text">Belum ada pendapatan pada periode ini</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1fbf7a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#1fbf7a" stopOpacity={0} />
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
                width={40}
                tickFormatter={formatRupiahCompact}
              />
              <Tooltip formatter={(value) => formatRupiah(Number(value))} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Pendapatan"
                stroke="#1fbf7a"
                strokeWidth={2.5}
                fill="url(#revenueTrendFill)"
              />
              <Line
                type="monotone"
                dataKey="collected"
                name="Terkumpul"
                stroke="#0a9be0"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
