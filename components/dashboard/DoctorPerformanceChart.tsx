'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiAward } from 'react-icons/fi';

interface DoctorPerformanceChartProps {
  mode: 'revenue' | 'count';
  data: { label: string; primary: number; secondary?: number }[];
  loading?: boolean;
}

function formatRupiahCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return `${value}`;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function DoctorPerformanceChart({ mode, data, loading }: DoctorPerformanceChartProps) {
  const chartData = data.map((d) => ({
    dokter: d.label,
    ...(mode === 'revenue'
      ? { Pendapatan: d.primary, 'Fee Dokter': d.secondary ?? 0 }
      : { Kunjungan: d.primary }),
  }));
  const height = Math.max(200, chartData.length * 52);

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-icon orange">
          <FiAward />
        </div>
        <div className="chart-panel-heading">
          <div className="chart-panel-title">Performa Dokter</div>
          <div className="chart-panel-sub">
            {mode === 'revenue' ? 'Berdasarkan pendapatan · 30 hari terakhir' : 'Berdasarkan jumlah kunjungan · 30 hari terakhir'}
          </div>
        </div>
      </div>
      <div className="chart-panel-body">
        {loading ? null : chartData.length === 0 ? (
          <div className="chart-empty">
            <div className="chart-empty-icon">
              <FiAward />
            </div>
            <div className="chart-empty-text">Belum ada data dokter pada periode ini</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                tickFormatter={mode === 'revenue' ? formatRupiahCompact : undefined}
              />
              <YAxis
                type="category"
                dataKey="dokter"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                formatter={(value) => (mode === 'revenue' ? formatRupiah(Number(value)) : `${Number(value)} kunjungan`)}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12.5 }}
                labelStyle={{ color: 'var(--text-main)' }}
                itemStyle={{ color: 'var(--text-sub)' }}
              />
              {mode === 'revenue' && <Legend wrapperStyle={{ color: 'var(--text-sub)', fontSize: 12.5 }} />}
              {mode === 'revenue' ? (
                <>
                  <Bar dataKey="Pendapatan" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={14} />
                  <Bar dataKey="Fee Dokter" fill="var(--orange)" radius={[0, 6, 6, 0]} barSize={14} />
                </>
              ) : (
                <Bar dataKey="Kunjungan" fill="var(--info)" radius={[0, 6, 6, 0]} barSize={16} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
