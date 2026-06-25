'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/lib/auth-context';
import { reportsApi, FinancialReportResponse, PaymentMethod } from '@/lib/reports';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini';

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
};

const METODE_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
  insurance: 'Asuransi',
  bpjs: 'BPJS',
};

const METODE_COLORS: Record<PaymentMethod, string> = {
  cash: '#4F7EF8',
  transfer: '#2DCB8A',
  insurance: '#F5A623',
  bpjs: '#38C9C0',
};

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(range: RangeOption): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const dateTo = toIsoDate(today);

  if (range === 'bulanini') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(firstOfMonth), dateTo };
  }

  const days = range === '7hari' ? 6 : 29;
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - days);
  return { dateFrom: toIsoDate(dateFrom), dateTo };
}

function formatTanggal(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function LaporanKeuanganPage() {
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<RangeOption>('7hari');
  const [report, setReport] = useState<FinancialReportResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.role === 'owner';

  if (authLoading) {
    return (
      <DashboardLayout>
        <main className="content laporan-page">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            Memuat...
          </div>
        </main>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    async function loadReport() {
      if (!isOwner) {
        setLoading(false);
        return;
      }

      const { dateFrom, dateTo } = getDateRange(range);
      setLoading(true);
      setError(null);

      try {
        const res = await reportsApi.getFinancial({ dateFrom, dateTo });
        setReport(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan keuangan');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [range, isOwner]);

  const pendapatanHarian = useMemo(
    () => (report?.byDay ?? []).map((d) => ({ tanggal: formatTanggal(d.date), pendapatan: d.revenue })),
    [report],
  );

  const metodeBreakdown = useMemo(
    () =>
      (report?.byPaymentMethod ?? []).map((m) => ({
        name: METODE_LABELS[m.method] ?? m.method,
        value: m.amount,
        color: METODE_COLORS[m.method] ?? '#999999',
      })),
    [report],
  );

  const pendapatanDokter = useMemo(
    () => (report?.byDoctor ?? []).map((d) => ({ dokter: d.practitionerName, total: d.revenue })),
    [report],
  );

  const totalPendapatan = report?.summary.totalBilling ?? 0;
  const rataRataHarian = pendapatanHarian.length > 0 ? totalPendapatan / pendapatanHarian.length : 0;
  const belumLunas = report?.summary.totalOutstanding ?? 0;
  const totalLunas = report?.summary.totalPaid ?? 0;

  if (!isOwner) {
    return (
      <DashboardLayout>
        <main className="content laporan-page">
          <div className="laporan-error">Laporan keuangan hanya dapat diakses oleh Owner.</div>
        </main>
      </DashboardLayout>
    );
  }

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

        {error && <div className="laporan-error">{error}</div>}

        <div className="stat-grid">
          <div className="stat-card income">
            <div className="stat-icon">
              <FiDollarSign />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : formatRupiah(totalPendapatan)}</div>
              <div className="stat-label">Total Pendapatan</div>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : formatRupiah(Math.round(rataRataHarian))}</div>
              <div className="stat-label">Rata-rata / Hari</div>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FiClock />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : formatRupiah(belumLunas)}</div>
              <div className="stat-label">Belum Lunas</div>
            </div>
          </div>
          <div className="stat-card lunas">
            <div className="stat-icon">
              <FiCreditCard />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : formatRupiah(totalLunas)}</div>
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
                <AreaChart data={pendapatanHarian}>
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
                    data={metodeBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {metodeBreakdown.map((entry) => (
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
              <h2>Pendapatan per Dokter</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pendapatanDokter} layout="vertical" margin={{ left: 20 }}>
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
                    dataKey="dokter"
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
