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
import {
  FiAlertTriangle,
  FiAward,
  FiCreditCard,
  FiDollarSign,
  FiClock,
  FiDownload,
  FiFileText,
  FiInfo,
  FiRepeat,
  FiTarget,
  FiTrendingUp,
  FiTrendingDown,
  FiPercent,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import StatCard from '@/components/laporan/StatCard';
import TindakanTerlarisTable from '@/components/laporan/TindakanTerlarisTable';
import CategoryProfitabilityTable from '@/components/laporan/CategoryProfitabilityTable';
import VisitDetailTable from '@/components/laporan/VisitDetailTable';
import { canAccessFeature } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { reportsApi, FinancialReportResponse, PaymentMethod } from '@/lib/reports';
import { useToast } from '@/lib/toast-context';
import { exportToExcel } from '@/lib/export-excel';
import '../styles/laporan.css';

type RangeOption = '7hari' | '30hari' | 'bulanini' | 'custom';

const RANGE_LABELS: Record<RangeOption, string> = {
  '7hari': '7 Hari Terakhir',
  '30hari': '30 Hari Terakhir',
  bulanini: 'Bulan Ini',
  custom: 'Rentang Kustom',
};

const METODE_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer Bank',
  qris: 'QRIS',
  insurance: 'Asuransi',
  bpjs: 'BPJS',
};

const METODE_COLORS: Record<PaymentMethod, string> = {
  cash: '#4F7EF8',
  transfer: '#2DCB8A',
  qris: '#9B59F6',
  insurance: '#F5A623',
  bpjs: '#38C9C0',
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

function formatTanggal(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface Insight {
  text: string;
  tone: 'good' | 'warn' | 'neutral';
}

function buildFinancialInsights(report: FinancialReportResponse | null): Insight[] {
  if (!report) return [];
  const list: Insight[] = [];

  const { changePercent } = report.comparison;
  if (changePercent !== null) {
    if (changePercent > 0) {
      list.push({ text: `Pendapatan naik ${changePercent}% dibanding periode sebelumnya.`, tone: 'good' });
    } else if (changePercent < 0) {
      list.push({ text: `Pendapatan turun ${Math.abs(changePercent)}% dibanding periode sebelumnya.`, tone: 'warn' });
    } else {
      list.push({ text: 'Pendapatan stabil, sama seperti periode sebelumnya.', tone: 'neutral' });
    }
  }

  const { collectionRate, totalBilling, totalOutstanding } = report.summary;
  if (totalBilling > 0) {
    if (collectionRate >= 90) {
      list.push({ text: `Collection rate ${collectionRate}% — penagihan berjalan sangat baik.`, tone: 'good' });
    } else if (collectionRate < 70) {
      list.push({ text: `Collection rate baru ${collectionRate}% — banyak tagihan belum tertagih.`, tone: 'warn' });
    } else {
      list.push({ text: `Collection rate ${collectionRate}%, masih dalam batas wajar.`, tone: 'neutral' });
    }

    if (totalOutstanding > 0) {
      const outstandingPct = (totalOutstanding / totalBilling) * 100;
      if (outstandingPct >= 20) {
        list.push({
          text: `Piutang belum tertagih mencapai ${outstandingPct.toFixed(0)}% dari total tagihan (${formatRupiah(totalOutstanding)}) — perlu ditindaklanjuti.`,
          tone: 'warn',
        });
      }
    }
  }

  const { marginPersen, pengeluaran, pendapatanTotal } = report.ringkasan;
  if (pendapatanTotal > 0) {
    if (marginPersen >= 30) {
      list.push({ text: `Margin keuntungan ${marginPersen}% — kesehatan finansial klinik baik.`, tone: 'good' });
    } else if (marginPersen < 10) {
      list.push({ text: `Margin keuntungan tipis (${marginPersen}%) — perlu efisiensi biaya.`, tone: 'warn' });
    } else {
      list.push({ text: `Margin keuntungan ${marginPersen}%.`, tone: 'neutral' });
    }

    if (pengeluaran > 0) {
      const expenseRatio = (pengeluaran / pendapatanTotal) * 100;
      if (expenseRatio >= 30) {
        list.push({ text: `Pengeluaran operasional setara ${expenseRatio.toFixed(0)}% dari pendapatan — cukup besar.`, tone: 'warn' });
      }
    }
  }

  if (report.byDoctor.length > 0) {
    const totalRevenue = report.byDoctor.reduce((sum, d) => sum + d.revenue, 0);
    const top = [...report.byDoctor].sort((a, b) => b.revenue - a.revenue)[0];
    if (totalRevenue > 0) {
      const pct = (top.revenue / totalRevenue) * 100;
      list.push({ text: `${top.practitionerName} berkontribusi ${pct.toFixed(0)}% dari total pendapatan dokter.`, tone: 'neutral' });
    }
  }

  if (report.tindakanTerlaris.length > 0) {
    const topProfit = [...report.tindakanTerlaris].sort((a, b) => b.labaBersih - a.labaBersih)[0];
    if (topProfit.labaBersih > 0) {
      list.push({ text: `Tindakan paling menguntungkan: ${topProfit.namaTindakan} (${formatRupiah(topProfit.labaBersih)} laba bersih).`, tone: 'neutral' });
    }
  }

  if (report.byPaymentMethod.length > 0) {
    const totalMethod = report.byPaymentMethod.reduce((sum, m) => sum + m.amount, 0);
    const top = [...report.byPaymentMethod].sort((a, b) => b.amount - a.amount)[0];
    if (totalMethod > 0) {
      const pct = (top.amount / totalMethod) * 100;
      list.push({ text: `${pct.toFixed(0)}% transaksi melalui ${METODE_LABELS[top.method] ?? top.method}.`, tone: 'neutral' });
    }
  }

  if (report.summary.totalRefunded > 0) {
    list.push({ text: `Ada ${formatRupiah(report.summary.totalRefunded)} refund pada periode ini.`, tone: 'warn' });
  }

  const { pareto, retention, dso, ltv, marketing } = report.businessMetrics;
  if (pareto.patientCount >= 5) {
    if (pareto.top20PercentPatientShare >= 60) {
      list.push({
        text: `20% pasien teratas menyumbang ${pareto.top20PercentPatientShare}% pendapatan — konsentrasi tinggi, risiko jika pasien tsb berhenti.`,
        tone: 'warn',
      });
    } else {
      list.push({ text: `20% pasien teratas menyumbang ${pareto.top20PercentPatientShare}% pendapatan — cukup terdiversifikasi.`, tone: 'good' });
    }
  }

  if (retention.retentionRatePercent !== null) {
    if (retention.retentionRatePercent >= 50) {
      list.push({ text: `Retensi pasien ${retention.retentionRatePercent}% — pasien lama rutin kembali bertransaksi.`, tone: 'good' });
    } else {
      list.push({ text: `Retensi pasien baru ${retention.retentionRatePercent}% — perlu strategi agar pasien lama kembali.`, tone: 'warn' });
    }
  }

  if (dso.outstandingCount > 0 && dso.averageDays >= 30) {
    list.push({ text: `Rata-rata piutang belum tertagih sudah berumur ${dso.averageDays} hari — pertimbangkan penagihan lebih aktif.`, tone: 'warn' });
  }

  if (ltv.patientCount > 0) {
    list.push({ text: `Customer Lifetime Value rata-rata ${formatRupiah(ltv.averageLtv)} per pasien (${ltv.averageVisitsPerPatient}x kunjungan rata-rata).`, tone: 'neutral' });
  }

  if (marketing.cac !== null) {
    list.push({ text: `Biaya akuisisi pasien baru (CAC) rata-rata ${formatRupiah(marketing.cac)} per pasien baru dari ${marketing.newPatients} pasien baru.`, tone: 'neutral' });

    if (marketing.ltvCacRatio !== null) {
      if (marketing.ltvCacRatio >= 3) {
        list.push({ text: `Rasio LTV:CAC ${marketing.ltvCacRatio}x — akuisisi pasien sangat efisien dan sehat untuk pertumbuhan.`, tone: 'good' });
      } else if (marketing.ltvCacRatio < 1) {
        list.push({ text: `Rasio LTV:CAC hanya ${marketing.ltvCacRatio}x — biaya akuisisi pasien lebih besar dari nilai yang dihasilkan, perlu dievaluasi.`, tone: 'warn' });
      } else {
        list.push({ text: `Rasio LTV:CAC ${marketing.ltvCacRatio}x — masih dalam batas wajar, namun ada ruang untuk efisiensi iklan.`, tone: 'neutral' });
      }
    }
  }

  return list;
}

export default function LaporanKeuanganPage() {
  const { user, loading: authLoading } = useAuth();
  const [range, setRange] = useState<RangeOption>('bulanini');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [report, setReport] = useState<FinancialReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloadingInvestor, setDownloadingInvestor] = useState(false);
  const { error: showError } = useToast();

  const canView = canAccessFeature(user?.role, 'laporan-keuangan');
  const { dateFrom, dateTo } = getDateRange(range, customFrom, customTo);

  useEffect(() => {
    async function loadReport() {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (range === 'custom' && (!customFrom || !customTo)) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const res = await reportsApi.getFinancial({ dateFrom, dateTo });
        setReport(res);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Gagal memuat laporan keuangan');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, canView, dateFrom, dateTo]);

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
    () =>
      (report?.byDoctor ?? []).map((d) => ({
        dokter: d.practitionerName,
        pendapatanKotor: d.revenue,
        feeDokter: d.doctorFeeShare,
      })),
    [report],
  );

  const insights = useMemo(() => buildFinancialInsights(report), [report]);
  const comparisonPercent = report?.comparison.changePercent ?? null;

  function handleExport() {
    if (!report) return;
    setExporting(true);
    try {
      exportToExcel(
        [
          {
            name: 'Ringkasan',
            rows: [
              { Metrik: 'Total Pendapatan', Nilai: report.summary.totalBilling },
              { Metrik: 'Total Lunas', Nilai: report.summary.totalPaid },
              { Metrik: 'Belum Lunas', Nilai: report.summary.totalOutstanding },
              { Metrik: 'Collection Rate (%)', Nilai: report.summary.collectionRate },
              { Metrik: 'Total Refund', Nilai: report.summary.totalRefunded },
              { Metrik: 'Modal', Nilai: report.ringkasan.modal },
              { Metrik: 'Laba Bersih', Nilai: report.ringkasan.labaBersih },
              { Metrik: 'Pengeluaran', Nilai: report.ringkasan.pengeluaran },
              { Metrik: 'Margin Keuntungan (%)', Nilai: report.ringkasan.marginPersen },
              { Metrik: 'Pendapatan Periode Sebelumnya', Nilai: report.comparison.previousPendapatan },
              { Metrik: 'Perubahan vs Periode Sebelumnya (%)', Nilai: report.comparison.changePercent ?? '-' },
            ],
          },
          {
            name: 'Pendapatan Harian',
            rows: report.byDay.map((d) => ({ Tanggal: d.date, Pendapatan: d.revenue, Terkumpul: d.collected })),
          },
          {
            name: 'Per Metode Bayar',
            rows: report.byPaymentMethod.map((m) => ({
              Metode: METODE_LABELS[m.method] ?? m.method,
              Jumlah: m.amount,
            })),
          },
          {
            name: 'Per Dokter',
            rows: report.byDoctor.map((d) => ({
              Dokter: d.practitionerName,
              'Pendapatan Kotor': d.revenue,
              'Fee Dokter (Share)': d.doctorFeeShare,
            })),
          },
          {
            name: 'Tindakan Terlaris',
            rows: report.tindakanTerlaris.map((t) => ({
              Tindakan: t.namaTindakan,
              Modal: t.modal,
              'Harga Jual': t.hargaJual,
              Frekuensi: t.frekuensi,
              'Total Diskon': t.totalDiskon,
              'Laba Bersih': t.labaBersih,
            })),
          },
        ],
        `laporan-keuangan_${dateFrom}_${dateTo}`,
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengekspor laporan keuangan');
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadInvestorReport() {
    setDownloadingInvestor(true);
    try {
      await reportsApi.downloadInvestorReportPdf();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Gagal mengunduh laporan investor');
    } finally {
      setDownloadingInvestor(false);
    }
  }

  const totalPendapatan = report?.summary.totalBilling ?? 0;
  const rataRataHarian = pendapatanHarian.length > 0 ? totalPendapatan / pendapatanHarian.length : 0;
  const belumLunas = report?.summary.totalOutstanding ?? 0;
  const totalLunas = report?.summary.totalPaid ?? 0;

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
      <FeatureGuard feature="laporan-keuangan">
      <main className="content laporan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Laporan Keuangan</h1>
            </div>
            <p className="page-subtitle">Ringkasan pendapatan dan arus kas klinik</p>
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
              onClick={handleExport}
              disabled={loading || exporting || !report}
            >
              <FiDownload />
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={handleDownloadInvestorReport}
              disabled={downloadingInvestor}
              title="Ringkasan kinerja 12 bulan terakhir, siap dibagikan ke investor/bank"
            >
              <FiAward />
              {downloadingInvestor ? 'Menyiapkan...' : 'Laporan Investor (PDF)'}
            </button>
          </div>
        </div>

        {!loading && insights.length > 0 && (
          <div className="insight-panel">
            <div className="insight-panel-title">
              <FiZap />
              Insight Otomatis
            </div>
            <div className="insight-list">
              {insights.map((insight, i) => (
                <div key={i} className={`insight-item ${insight.tone}`}>
                  <span className="insight-icon">
                    {insight.tone === 'good' ? <FiTrendingUp /> : insight.tone === 'warn' ? <FiAlertTriangle /> : <FiInfo />}
                  </span>
                  {insight.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="stat-grid">
          <StatCard
            variant="income"
            icon={<FiFileText />}
            value={loading ? '...' : formatRupiah(totalPendapatan)}
            label="Total Ditagih"
          />
          <StatCard
            variant="lunas"
            icon={<FiCreditCard />}
            value={loading ? '...' : formatRupiah(totalLunas)}
            label="Total Diterima (Lunas)"
            trend={
              !loading && comparisonPercent !== null ? (
                <>
                  {comparisonPercent >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {comparisonPercent >= 0 ? '+' : ''}
                  {comparisonPercent}% vs sebelumnya
                </>
              ) : undefined
            }
          />
          <StatCard
            variant="pending"
            icon={<FiClock />}
            value={loading ? '...' : formatRupiah(belumLunas)}
            label="Belum Lunas (Piutang)"
          />
          <StatCard
            variant="expense"
            icon={<FiTrendingDown />}
            value={loading ? '...' : formatRupiah(report?.ringkasan.modal ?? 0)}
            label="Modal (HPP)"
          />
          <StatCard
            variant="expense"
            icon={<FiCreditCard />}
            value={loading ? '...' : formatRupiah(report?.ringkasan.pengeluaran ?? 0)}
            label="Pengeluaran Operasional"
          />
          <StatCard
            variant="margin"
            icon={<FiTrendingUp />}
            value={loading ? '...' : formatRupiah(report?.ringkasan.labaBersih ?? 0)}
            label="Laba Bersih"
          />
          <StatCard
            variant="total"
            icon={<FiPercent />}
            value={loading ? '...' : `${report?.ringkasan.marginPersen ?? 0}%`}
            label="Margin Keuntungan"
          />
          <StatCard
            variant="total"
            icon={<FiDollarSign />}
            value={loading ? '...' : formatRupiah(Math.round(rataRataHarian))}
            label="Rata-rata Pendapatan / Hari"
          />
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

          <div className="panel chart-panel">
            <div className="panel-header">
              <h2>Pendapatan per Dokter</h2>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pendapatanDokter} layout="vertical" margin={{ left: 10 }}>
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
                  <Bar dataKey="pendapatanKotor" name="Pendapatan Kotor" fill="#4F7EF8" radius={[0, 6, 6, 0]} barSize={16} />
                  <Bar dataKey="feeDokter" name="Fee Dokter (Share)" fill="#2DCB8A" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {report && (
          <div className="laporan-section">
            <div className="laporan-section-title">
              <h2>Analisis Bisnis Lanjutan</h2>
              <span>Unit economics &amp; kesehatan keuangan klinik</span>
            </div>
            <div className="stat-grid">
              <StatCard
                variant="income"
                icon={<FiUsers />}
                value={formatRupiah(report.businessMetrics.ltv.averageLtv)}
                label="Customer Lifetime Value (LTV)"
              />
              <StatCard
                variant="total"
                icon={<FiDollarSign />}
                value={formatRupiah(report.businessMetrics.arpv)}
                label="Avg. Revenue / Kunjungan (ARPV)"
              />
              <StatCard
                variant="lunas"
                icon={<FiRepeat />}
                value={
                  report.businessMetrics.retention.retentionRatePercent !== null
                    ? `${report.businessMetrics.retention.retentionRatePercent}%`
                    : '-'
                }
                label="Retensi Pasien"
              />
              <StatCard
                variant="pending"
                icon={<FiClock />}
                value={`${report.businessMetrics.dso.averageDays} hari`}
                label="Days Sales Outstanding (DSO)"
              />
              <StatCard
                variant="expense"
                icon={<FiPercent />}
                value={`${report.businessMetrics.pareto.top20PercentPatientShare}%`}
                label="Konsentrasi 20% Pasien Teratas"
              />
              <StatCard
                variant="margin"
                icon={<FiAward />}
                value={`${report.businessMetrics.ltv.averageVisitsPerPatient}x`}
                label="Rata-rata Kunjungan / Pasien"
              />
              <StatCard
                variant="expense"
                icon={<FiTarget />}
                value={
                  report.businessMetrics.marketing.cac !== null
                    ? formatRupiah(report.businessMetrics.marketing.cac)
                    : '-'
                }
                label="Customer Acquisition Cost (CAC)"
              />
              <StatCard
                variant={
                  report.businessMetrics.marketing.ltvCacRatio !== null &&
                  report.businessMetrics.marketing.ltvCacRatio >= 3
                    ? 'income'
                    : 'total'
                }
                icon={<FiTrendingUp />}
                value={
                  report.businessMetrics.marketing.ltvCacRatio !== null
                    ? `${report.businessMetrics.marketing.ltvCacRatio}x`
                    : '-'
                }
                label="Rasio LTV : CAC"
              />
            </div>
            <CategoryProfitabilityTable data={report.businessMetrics.categoryProfitability} />
          </div>
        )}

        {report && <TindakanTerlarisTable tindakan={report.tindakanTerlaris} />}
        {!loading && <VisitDetailTable dateFrom={dateFrom} dateTo={dateTo} />}
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
