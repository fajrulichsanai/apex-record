'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiCreditCard, FiDollarSign, FiClock, FiTrendingUp } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini';

const PENDAPATAN_HARIAN = [
  { tanggal: '16 Jun', pendapatan: 1450000 },
  { tanggal: '17 Jun', pendapatan: 980000 },
  { tanggal: '18 Jun', pendapatan: 1720000 },
  { tanggal: '19 Jun', pendapatan: 1340000 },
  { tanggal: '20 Jun', pendapatan: 2150000 },
  { tanggal: '21 Jun', pendapatan: 1860000 },
];

const METODE_BREAKDOWN = [
  { name: 'Tunai', value: 3200000, color: '#4F7EF8' },
  { name: 'Transfer Bank', value: 2100000, color: '#2DCB8A' },
  { name: 'Kartu Debit/Kredit', value: 1500000, color: '#F5A623' },
  { name: 'QRIS', value: 1700000, color: '#38C9C0' },
];

const PENDAPATAN_TINDAKAN = [
  { tindakan: 'PSA - Obturasi', total: 2100000 },
  { tindakan: 'Cabut Gigi', total: 1800000 },
  { tindakan: 'Tambal GIC', total: 1280000 },
  { tindakan: 'Pembersihan Karang Gigi', total: 1050000 },
  { tindakan: 'Konsultasi Awal', total: 760000 },
];

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
};

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function LaporanKeuanganPage() {
  const [range, setRange] = useState<RangeOption>('7hari');

  const totalPendapatan = useMemo(
    () => PENDAPATAN_HARIAN.reduce((sum, d) => sum + d.pendapatan, 0),
    []
  );
  const rataRataHarian = totalPendapatan / PENDAPATAN_HARIAN.length;
  const belumLunas = 460000;
  const totalTransaksi = METODE_BREAKDOWN.reduce((sum, m) => sum + m.value, 0);

  return (
    <DashboardLayout>
      <main className="content laporan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Laporan Keuangan</h1>
            </div>
            <p className="page-subtitle">Ringkasan pendapatan dan arus kas klinik</p>
          </div>
          <div className="range-tabs">
            {(Object.keys(RANGE_LABELS) as RangeOption[]).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`range-tab ${range === opt ? 'active' : ''}`}
                onClick={() => setRange(opt)}
              >
                {RANGE_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card income">
            <div className="stat-icon">
              <FiDollarSign />
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatRupiah(totalPendapatan)}</div>
              <div className="stat-label">Total Pendapatan</div>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatRupiah(Math.round(rataRataHarian))}</div>
              <div className="stat-label">Rata-rata / Hari</div>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FiClock />
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatRupiah(belumLunas)}</div>
              <div className="stat-label">Belum Lunas</div>
            </div>
          </div>
          <div className="stat-card lunas">
            <div className="stat-icon">
              <FiCreditCard />
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatRupiah(totalTransaksi)}</div>
              <div className="stat-label">Total Transaksi Lunas</div>
            </div>
          </div>
        </div>

        <div className="chart-grid">
          <div className="panel chart-panel wide">
            <div className="panel-header">
              <h2>Tren Pendapatan Harian</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={PENDAPATAN_HARIAN}>
                  <defs>
                    <linearGradient id="pendapatanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2DCB8A" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2DCB8A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8ECF4" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  <Area
                    type="monotone"
                    dataKey="pendapatan"
                    name="Pendapatan"
                    stroke="#2DCB8A"
                    fill="url(#pendapatanGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header">
              <h2>Pendapatan per Metode</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={METODE_BREAKDOWN}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {METODE_BREAKDOWN.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel wide">
            <div className="panel-header">
              <h2>Pendapatan per Tindakan</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={PENDAPATAN_TINDAKAN} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#E8ECF4" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="tindakan"
                    tick={{ fontSize: 12, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    width={170}
                  />
                  <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  <Bar dataKey="total" name="Total Pendapatan" fill="#4F7EF8" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
