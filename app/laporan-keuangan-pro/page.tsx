'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  FiArrowLeft,
  FiAward,
  FiDownload,
  FiFileText,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import DiscountRankingTable from '@/components/laporan/DiscountRankingTable';
import StockReportSection from '@/components/laporan/StockReportSection';
import VisitHeatmap from '@/components/laporan/VisitHeatmap';
import { reportsApi, FinancialReportProResponse } from '@/lib/reports';
import { useToast } from '@/lib/toast-context';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini' | 'custom';

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
  custom: 'Rentang Kustom',
};

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(
  range: RangeOption,
  customFrom: string,
  customTo: string,
): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const dateTo = toIsoDate(today);

  if (range === 'custom') {
    return { dateFrom: customFrom || dateTo, dateTo: customTo || dateTo };
  }
  if (range === 'bulanini') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: toIsoDate(firstOfMonth), dateTo };
  }
  const days = range === '7hari' ? 6 : 29;
  const dateFrom = new Date(today);
  dateFrom.setDate(dateFrom.getDate() - days);
  return { dateFrom: toIsoDate(dateFrom), dateTo };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function formatMonth(key: string) {
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} '${year.slice(2)}`;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function LaporanKeuanganProPage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeOption>('bulanini');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [report, setReport] = useState<FinancialReportProResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingAccountant, setDownloadingAccountant] = useState(false);
  const [downloadingInvestor, setDownloadingInvestor] = useState(false);
  const { error: showError } = useToast();

  const { dateFrom, dateTo } = getDateRange(range, customFrom, customTo);

  useEffect(() => {
    async function loadReport() {
      if (range === 'custom' && (!customFrom || !customTo)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await reportsApi.getFinancialPro({ dateFrom, dateTo });
        setReport(res);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Gagal memuat laporan keuangan pro');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, dateFrom, dateTo]);

  const monthlyChartData = useMemo(
    () =>
      (report?.monthlyTrend ?? []).map((m) => ({
        bulan: formatMonth(m.month),
        Pendapatan: m.revenue,
        Pengeluaran: m.expense,
      })),
    [report],
  );

  const dokterProfitData = useMemo(
    () =>
      (report?.byDoctorProfit ?? []).map((d) => ({
        dokter: d.practitionerName,
        'Pendapatan Kotor': d.revenue,
        'Fee Dokter': d.doctorFeeShare,
        'Laba Bersih': d.labaBersih,
      })),
    [report],
  );

  async function handleDownloadAccountant() {
    setDownloadingAccountant(true);
    try {
      await reportsApi.downloadFinancialProPdf({ dateFrom, dateTo });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengunduh laporan PDF');
    } finally {
      setDownloadingAccountant(false);
    }
  }

  async function handleDownloadInvestor() {
    setDownloadingInvestor(true);
    try {
      await reportsApi.downloadInvestorReportPdf();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengunduh laporan investor');
    } finally {
      setDownloadingInvestor(false);
    }
  }

  return (
    <DashboardLayout>
      <FeatureGuard feature="laporan-keuangan-pro">
        <main className="content laporan-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <button type="button" className="btn-outline" onClick={() => router.push('/laporan-keuangan')} style={{ marginRight: 10 }}>
                  <FiArrowLeft />
                </button>
                <h1>Laporan Keuangan Pro</h1>
              </div>
              <p className="page-subtitle">Analitik lanjutan, laporan ke akuntan/investor, dan laporan stok — khusus Owner</p>
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
              {range === 'custom' && (
                <div className="custom-range">
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <span>–</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              )}
              <button
                type="button"
                className="btn-outline"
                onClick={handleDownloadAccountant}
                disabled={downloadingAccountant || loading}
                title="Ringkasan periode ini, siap print/kirim ke akuntan"
              >
                <FiDownload />
                {downloadingAccountant ? 'Menyiapkan...' : 'PDF Akuntan'}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={handleDownloadInvestor}
                disabled={downloadingInvestor}
                title="Ringkasan kinerja 12 bulan terakhir, siap dibagikan ke investor/bank"
              >
                <FiAward />
                {downloadingInvestor ? 'Menyiapkan...' : 'PDF Investor'}
              </button>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card total">
              <div className="stat-icon"><FiFileText /></div>
              <div className="stat-info">
                <div className="stat-value">{loading ? '...' : formatRupiah(report?.labaKotor ?? 0)}</div>
                <div className="stat-label">Laba Kotor (Pendapatan − Modal)</div>
              </div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="panel chart-panel wide">
              <div className="panel-header">
                <h2>Pendapatan vs Pengeluaran per Bulan (6 Bulan Terakhir)</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid stroke="#E8ECF4" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6B7A99' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                    <Legend />
                    <Bar dataKey="Pendapatan" fill="#2DCB8A" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar dataKey="Pengeluaran" fill="#FF7A59" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel chart-panel wide">
              <div className="panel-header">
                <h2>Revenue per Dokter (Kotor, Fee, Laba Bersih)</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={Math.max(260, dokterProfitData.length * 60)}>
                  <BarChart data={dokterProfitData} layout="vertical" margin={{ left: 10 }}>
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
                    <Legend />
                    <Bar dataKey="Pendapatan Kotor" fill="#4F7EF8" radius={[0, 6, 6, 0]} barSize={14} />
                    <Bar dataKey="Fee Dokter" fill="#F5A623" radius={[0, 6, 6, 0]} barSize={14} />
                    <Bar dataKey="Laba Bersih" fill="#2DCB8A" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {report && <VisitHeatmap data={report.visitHeatmap} />}
          </div>

          {report && <DiscountRankingTable data={report.discountRanking} />}
          {report && <StockReportSection data={report.stockReport} />}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
