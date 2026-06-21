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
import { FiActivity, FiCheckCircle, FiUserCheck, FiXCircle } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini';

const HARIAN_KUNJUNGAN = [
  { tanggal: '16 Jun', selesai: 12, batal: 1, menunggu: 2 },
  { tanggal: '17 Jun', selesai: 9, batal: 0, menunggu: 3 },
  { tanggal: '18 Jun', selesai: 14, batal: 2, menunggu: 1 },
  { tanggal: '19 Jun', selesai: 11, batal: 1, menunggu: 4 },
  { tanggal: '20 Jun', selesai: 16, batal: 1, menunggu: 2 },
  { tanggal: '21 Jun', selesai: 13, batal: 0, menunggu: 5 },
];

const STATUS_BREAKDOWN = [
  { name: 'Selesai', value: 75, color: '#2DCB8A' },
  { name: 'Menunggu', value: 17, color: '#F5A623' },
  { name: 'Dibatalkan', value: 5, color: '#FF4D4F' },
];

const DOKTER_KUNJUNGAN = [
  { dokter: 'drg. Rina Susanti', jumlah: 38 },
  { dokter: 'drg. Anton Wijaya', jumlah: 29 },
  { dokter: 'drg. Maya Putri', jumlah: 21 },
  { dokter: 'drg. Dedi Hartono', jumlah: 15 },
];

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
};

export default function LaporanKunjunganPage() {
  const [range, setRange] = useState<RangeOption>('7hari');

  const totalKunjungan = useMemo(
    () => HARIAN_KUNJUNGAN.reduce((sum, d) => sum + d.selesai + d.batal + d.menunggu, 0),
    []
  );
  const totalSelesai = useMemo(() => HARIAN_KUNJUNGAN.reduce((sum, d) => sum + d.selesai, 0), []);
  const totalBatal = useMemo(() => HARIAN_KUNJUNGAN.reduce((sum, d) => sum + d.batal, 0), []);
  const rataRata = (totalKunjungan / HARIAN_KUNJUNGAN.length).toFixed(1);

  return (
    <DashboardLayout>
      <main className="content laporan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Laporan Kunjungan</h1>
            </div>
            <p className="page-subtitle">Ringkasan dan tren kunjungan pasien klinik</p>
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
          <div className="stat-card total">
            <div className="stat-icon">
              <FiActivity />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalKunjungan}</div>
              <div className="stat-label">Total Kunjungan</div>
            </div>
          </div>
          <div className="stat-card lunas">
            <div className="stat-icon">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalSelesai}</div>
              <div className="stat-label">Kunjungan Selesai</div>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FiXCircle />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalBatal}</div>
              <div className="stat-label">Dibatalkan</div>
            </div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon">
              <FiUserCheck />
            </div>
            <div className="stat-info">
              <div className="stat-value">{rataRata}</div>
              <div className="stat-label">Rata-rata / Hari</div>
            </div>
          </div>
        </div>

        <div className="chart-grid">
          <div className="panel chart-panel wide">
            <div className="panel-header">
              <h2>Tren Kunjungan Harian</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={HARIAN_KUNJUNGAN}>
                  <defs>
                    <linearGradient id="selesaiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4F7EF8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4F7EF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E8ECF4" vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="selesai"
                    name="Selesai"
                    stroke="#4F7EF8"
                    fill="url(#selesaiGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header">
              <h2>Status Kunjungan</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={STATUS_BREAKDOWN}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {STATUS_BREAKDOWN.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel wide">
            <div className="panel-header">
              <h2>Kunjungan per Dokter</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={DOKTER_KUNJUNGAN} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="#E8ECF4" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="dokter"
                    tick={{ fontSize: 12, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Jumlah Kunjungan" fill="#7B5CFA" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
