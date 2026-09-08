'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FiUsers } from 'react-icons/fi';

interface PatientMixChartProps {
  data: { new: number; returning: number } | null;
  loading?: boolean;
}

const COLORS = { new: '#5b62e0', returning: '#1fbf7a' };

export default function PatientMixChart({ data, loading }: PatientMixChartProps) {
  const total = (data?.new ?? 0) + (data?.returning ?? 0);
  const chartData = data
    ? [
        { name: 'Pasien Baru', value: data.new, color: COLORS.new },
        { name: 'Pasien Lama', value: data.returning, color: COLORS.returning },
      ]
    : [];

  return (
    <div className="chart-panel">
      <div className="chart-panel-header">
        <div className="chart-panel-icon blue">
          <FiUsers />
        </div>
        <div className="chart-panel-heading">
          <div className="chart-panel-title">Komposisi Pasien</div>
          <div className="chart-panel-sub">Baru vs lama · 30 hari terakhir</div>
        </div>
      </div>
      <div className="chart-panel-body">
        {loading ? null : total === 0 ? (
          <div className="chart-empty">
            <div className="chart-empty-icon">
              <FiUsers />
            </div>
            <div className="chart-empty-text">Belum ada kunjungan pasien pada periode ini</div>
          </div>
        ) : (
          <div className="donut-panel-body">
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${Number(value)} pasien`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <div className="donut-center-value">{total}</div>
                <div className="donut-center-label">total pasien</div>
              </div>
            </div>
            <div className="donut-legend">
              {chartData.map((entry) => (
                <div className="donut-legend-item" key={entry.name}>
                  <span className="donut-legend-dot" style={{ background: entry.color }} />
                  <div className="donut-legend-text">
                    <div className="donut-legend-label">{entry.name}</div>
                    <div className="donut-legend-value">
                      {entry.value}
                      {total > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
                          ({Math.round((entry.value / total) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
