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
import { FiActivity, FiCheckCircle, FiDownload, FiUserCheck, FiXCircle } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import { reportsApi, VisitReportResponse } from '@/lib/reports';
import { useToast } from '@/lib/toast-context';
import { exportToExcel } from '@/lib/export-excel';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini';

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
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

const STATUS_LABELS: Record<string, string> = {
  arrived: 'Datang',
  in_progress: 'Berjalan',
  finished: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function LaporanKunjunganPage() {
  const { loading: authLoading } = useAuth();
  const [range, setRange] = useState<RangeOption>('7hari');
  const [report, setReport] = useState<VisitReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { error: showError } = useToast();

  useEffect(() => {
    async function loadReport() {
      const { dateFrom, dateTo } = getDateRange(range);
      setLoading(true);

      try {
        const res = await reportsApi.getVisits({ dateFrom, dateTo, limit: 1 });
        setReport(res);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Gagal memuat laporan kunjungan');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const harianKunjungan = useMemo(
    () => (report?.byDay ?? []).map((d) => ({ tanggal: formatTanggal(d.date), jumlah: d.count })),
    [report],
  );

  const statusBreakdown = useMemo(() => {
    if (!report) return [];
    return [
      { name: 'Selesai', value: report.summary.finished, color: '#2DCB8A' },
      { name: 'Berjalan', value: report.summary.inProgress, color: '#F5A623' },
      { name: 'Dibatalkan', value: report.summary.cancelled, color: '#FF4D4F' },
    ];
  }, [report]);

  const dokterKunjungan = useMemo(
    () => (report?.byDoctor ?? []).map((d) => ({ dokter: d.practitionerName, jumlah: d.count })),
    [report],
  );

  async function handleExport() {
    if (!report) return;
    setExporting(true);
    try {
      const { dateFrom, dateTo } = getDateRange(range);
      const full = await reportsApi.getVisits({
        dateFrom,
        dateTo,
        limit: Math.max(report.summary.total, 1),
      });

      exportToExcel(
        [
          {
            name: 'Ringkasan',
            rows: [
              { Metrik: 'Total Kunjungan', Nilai: full.summary.total },
              { Metrik: 'Selesai', Nilai: full.summary.finished },
              { Metrik: 'Berjalan', Nilai: full.summary.inProgress },
              { Metrik: 'Dibatalkan', Nilai: full.summary.cancelled },
              { Metrik: 'Rata-rata Durasi (menit)', Nilai: full.summary.avgDurationMinutes ?? '-' },
            ],
          },
          {
            name: 'Kunjungan Harian',
            rows: full.byDay.map((d) => ({ Tanggal: d.date, Jumlah: d.count })),
          },
          {
            name: 'Per Dokter',
            rows: full.byDoctor.map((d) => ({ Dokter: d.practitionerName, Jumlah: d.count })),
          },
          {
            name: 'Detail Kunjungan',
            rows: full.encounters.map((e) => ({
              Tanggal: e.date,
              Pasien: e.patientName ?? '-',
              Dokter: e.practitionerName ?? '-',
              Status: STATUS_LABELS[e.status] ?? e.status,
              'Durasi (menit)': e.durationMinutes ?? '-',
            })),
          },
        ],
        `laporan-kunjungan_${dateFrom}_${dateTo}`,
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengekspor laporan kunjungan');
    } finally {
      setExporting(false);
    }
  }

  const totalKunjungan = report?.summary.total ?? 0;
  const totalSelesai = report?.summary.finished ?? 0;
  const totalBatal = report?.summary.cancelled ?? 0;
  const rataRata = harianKunjungan.length > 0 ? (totalKunjungan / harianKunjungan.length).toFixed(1) : '0.0';

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

  return (
    <DashboardLayout>
      <FeatureGuard feature="laporan-kunjungan">
      <main className="content laporan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Laporan Kunjungan</h1>
            </div>
            <p className="page-subtitle">Ringkasan dan tren kunjungan pasien klinik</p>
          </div>
          <div className="header-actions">
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
            <button
              type="button"
              className="btn-outline"
              onClick={handleExport}
              disabled={loading || exporting || !report}
            >
              <FiDownload />
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <FiActivity />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : totalKunjungan}</div>
              <div className="stat-label">Total Kunjungan</div>
            </div>
          </div>
          <div className="stat-card lunas">
            <div className="stat-icon">
              <FiCheckCircle />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : totalSelesai}</div>
              <div className="stat-label">Kunjungan Selesai</div>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <FiXCircle />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : totalBatal}</div>
              <div className="stat-label">Dibatalkan</div>
            </div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon">
              <FiUserCheck />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : rataRata}</div>
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
                <AreaChart data={harianKunjungan}>
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
                    dataKey="jumlah"
                    name="Kunjungan"
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
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-header">
              <h2>Kunjungan per Dokter</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dokterKunjungan} layout="vertical" margin={{ left: 10 }}>
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
      </FeatureGuard>
    </DashboardLayout>
  );
}
