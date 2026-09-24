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
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiInfo,
  FiTrendingDown,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiXCircle,
  FiZap,
} from 'react-icons/fi';
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

const GENDER_LABELS: Record<string, string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
};

const CATEGORY_COLORS = ['#4F7EF8', '#7B5CFA', '#2DCB8A', '#F5A623', '#38C9C0', '#FF7A59', '#FF4D4F', '#A0AEC0'];

interface Insight {
  text: string;
  tone: 'good' | 'warn' | 'neutral';
}

function buildInsights(report: VisitReportResponse | null): Insight[] {
  if (!report) return [];
  const list: Insight[] = [];

  const { changePercent } = report.comparison;
  if (changePercent !== null) {
    if (changePercent > 0) {
      list.push({ text: `Kunjungan naik ${changePercent}% dibanding periode sebelumnya.`, tone: 'good' });
    } else if (changePercent < 0) {
      list.push({ text: `Kunjungan turun ${Math.abs(changePercent)}% dibanding periode sebelumnya.`, tone: 'warn' });
    } else {
      list.push({ text: 'Kunjungan stabil, sama seperti periode sebelumnya.', tone: 'neutral' });
    }
  }

  if (report.summary.total > 0) {
    const cancelRate = (report.summary.cancelled / report.summary.total) * 100;
    if (cancelRate >= 15) {
      list.push({ text: `Tingkat pembatalan cukup tinggi (${cancelRate.toFixed(0)}%) — perlu ditelusuri penyebabnya.`, tone: 'warn' });
    } else if (report.summary.cancelled > 0) {
      list.push({ text: `Tingkat pembatalan ${cancelRate.toFixed(0)}%, masih dalam batas wajar.`, tone: 'good' });
    }
  }

  const { new: newCount, returning } = report.demographics.newVsReturning;
  const totalPatients = newCount + returning;
  if (totalPatients > 0) {
    const returningPct = (returning / totalPatients) * 100;
    if (returningPct >= 50) {
      list.push({ text: `${returningPct.toFixed(0)}% kunjungan berasal dari pasien lama — retensi pasien baik.`, tone: 'good' });
    } else {
      list.push({ text: `${(100 - returningPct).toFixed(0)}% kunjungan berasal dari pasien baru — akuisisi pasien sedang tumbuh.`, tone: 'neutral' });
    }
  }

  if (report.procedureMix.byKategori.length > 0) {
    const top = report.procedureMix.byKategori[0];
    const totalProc = report.procedureMix.byKategori.reduce((sum, k) => sum + k.count, 0);
    const pct = totalProc > 0 ? (top.count / totalProc) * 100 : 0;
    list.push({ text: `Kategori tindakan terbanyak: ${top.kategori} (${pct.toFixed(0)}% dari seluruh tindakan).`, tone: 'neutral' });
  }

  if (report.procedureMix.avgProceduresPerVisit > 0) {
    list.push({ text: `Rata-rata ${report.procedureMix.avgProceduresPerVisit} tindakan per kunjungan.`, tone: 'neutral' });
  }

  const peakHour = [...report.byHour].sort((a, b) => b.count - a.count)[0];
  if (peakHour && peakHour.count > 0) {
    const nextHour = (peakHour.hour + 1) % 24;
    list.push({
      text: `Jam tersibuk: pukul ${String(peakHour.hour).padStart(2, '0')}.00–${String(nextHour).padStart(2, '0')}.00.`,
      tone: 'neutral',
    });
  }

  const busiestDay = [...report.byDayOfWeek].sort((a, b) => b.count - a.count)[0];
  if (busiestDay && busiestDay.count > 0) {
    list.push({ text: `Hari tersibuk: ${busiestDay.day}.`, tone: 'neutral' });
  }

  return list;
}

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

  const insights = useMemo(() => buildInsights(report), [report]);

  const genderData = useMemo(() => {
    if (!report) return [];
    const colors: Record<string, string> = { male: '#4F7EF8', female: '#FF7A9E' };
    return report.demographics.byGender
      .filter((g) => g.count > 0)
      .map((g) => ({
        name: g.gender ? GENDER_LABELS[g.gender] ?? g.gender : 'Tidak diketahui',
        value: g.count,
        color: g.gender ? colors[g.gender] ?? '#A0AEC0' : '#A0AEC0',
      }));
  }, [report]);

  const ageGroupData = useMemo(
    () => (report?.demographics.byAgeGroup ?? []).map((a) => ({ kelompok: a.group, jumlah: a.count })),
    [report],
  );

  const newVsReturning = report?.demographics.newVsReturning ?? { new: 0, returning: 0 };
  const totalPatientVisits = newVsReturning.new + newVsReturning.returning;
  const returningPct = totalPatientVisits > 0 ? Math.round((newVsReturning.returning / totalPatientVisits) * 100) : 0;

  const topProceduresData = useMemo(
    () => (report?.procedureMix.topProcedures ?? []).map((p) => ({ tindakan: p.tarifName, jumlah: p.count })),
    [report],
  );

  const kategoriTindakanData = useMemo(
    () =>
      (report?.procedureMix.byKategori ?? []).map((k, i) => ({
        name: k.kategori,
        value: k.count,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [report],
  );

  const byHourData = useMemo(
    () => (report?.byHour ?? []).filter((h) => h.count > 0 || (h.hour >= 7 && h.hour <= 20)).map((h) => ({ jam: `${String(h.hour).padStart(2, '0')}:00`, jumlah: h.count })),
    [report],
  );

  const byDayOfWeekData = useMemo(
    () => (report?.byDayOfWeek ?? []).map((d) => ({ hari: d.day, jumlah: d.count })),
    [report],
  );

  const comparisonPercent = report?.comparison.changePercent ?? null;

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
            name: 'Demografi',
            rows: [
              ...full.demographics.byGender.map((g) => ({
                Kategori: 'Jenis Kelamin',
                Rincian: g.gender ? GENDER_LABELS[g.gender] ?? g.gender : 'Tidak diketahui',
                Jumlah: g.count,
              })),
              ...full.demographics.byAgeGroup.map((a) => ({
                Kategori: 'Kelompok Usia',
                Rincian: a.group,
                Jumlah: a.count,
              })),
              { Kategori: 'Status Pasien', Rincian: 'Pasien Baru', Jumlah: full.demographics.newVsReturning.new },
              { Kategori: 'Status Pasien', Rincian: 'Pasien Lama', Jumlah: full.demographics.newVsReturning.returning },
            ],
          },
          {
            name: 'Tindakan',
            rows: full.procedureMix.topProcedures.map((p) => ({ Tindakan: p.tarifName, Kategori: p.kategori, Frekuensi: p.count })),
          },
          {
            name: 'Pola Waktu',
            rows: [
              ...full.byHour.filter((h) => h.count > 0).map((h) => ({ Pola: 'Jam', Rincian: `${String(h.hour).padStart(2, '0')}:00`, Jumlah: h.count })),
              ...full.byDayOfWeek.map((d) => ({ Pola: 'Hari', Rincian: d.day, Jumlah: d.count })),
            ],
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
          <div className="stat-card total">
            <div className="stat-icon">
              <FiActivity />
            </div>
            <div className="stat-info">
              <div className="stat-value">{loading ? '...' : totalKunjungan}</div>
              <div className="stat-label">Total Kunjungan</div>
              {!loading && comparisonPercent !== null && (
                <div className="stat-trend">
                  {comparisonPercent >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                  {comparisonPercent >= 0 ? '+' : ''}
                  {comparisonPercent}% vs sebelumnya
                </div>
              )}
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

        <div className="laporan-section">
          <div className="laporan-section-title">
            <h2>Demografi Pasien</h2>
            <span>Siapa yang berkunjung ke klinik</span>
          </div>
          <div className="chart-grid">
            <div className="panel chart-panel">
              <div className="panel-header">
                <h2>Jenis Kelamin</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {genderData.map((entry) => (
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
                <h2>Kelompok Usia</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ageGroupData}>
                    <CartesianGrid stroke="#E8ECF4" vertical={false} />
                    <XAxis dataKey="kelompok" tick={{ fontSize: 10.5, fill: '#6B7A99' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={55} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="jumlah" name="Kunjungan" fill="#38C9C0" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>Pasien Baru vs Lama</h2>
              </div>
              <div className="split-stat-body">
                <div className="split-stat-bar">
                  <div style={{ width: `${totalPatientVisits > 0 ? (newVsReturning.returning / totalPatientVisits) * 100 : 0}%`, background: '#4F7EF8' }} />
                  <div style={{ width: `${totalPatientVisits > 0 ? (newVsReturning.new / totalPatientVisits) * 100 : 100}%`, background: '#F5A623' }} />
                </div>
                <div className="split-stat-row">
                  <span className="label"><span className="dot" style={{ background: '#4F7EF8' }} />Pasien Lama</span>
                  <span className="value">{newVsReturning.returning}</span>
                </div>
                <div className="split-stat-row">
                  <span className="label"><span className="dot" style={{ background: '#F5A623' }} />Pasien Baru</span>
                  <span className="value">{newVsReturning.new}</span>
                </div>
                <p className="split-stat-hint">
                  {totalPatientVisits > 0
                    ? `${returningPct}% kunjungan berasal dari pasien lama.`
                    : 'Belum ada data kunjungan pada periode ini.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="laporan-section">
          <div className="laporan-section-title">
            <h2>Tindakan &amp; Prosedur</h2>
            <span>Apa yang paling sering dikerjakan</span>
          </div>
          <div className="chart-grid">
            <div className="panel chart-panel wide">
              <div className="panel-header">
                <h2>10 Tindakan Terbanyak</h2>
              </div>
              <div className="chart-body">
                {topProceduresData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(220, topProceduresData.length * 34)}>
                    <BarChart data={topProceduresData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid stroke="#E8ECF4" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="tindakan" tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} width={200} />
                      <Tooltip />
                      <Bar dataKey="jumlah" name="Frekuensi" fill="#4F7EF8" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-list"><span className="empty-title">Belum ada tindakan tercatat pada periode ini.</span></div>
                )}
              </div>
            </div>

            <div className="panel chart-panel">
              <div className="panel-header">
                <h2>Kategori Tindakan</h2>
              </div>
              <div className="chart-body">
                {kategoriTindakanData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={kategoriTindakanData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {kategoriTindakanData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-list"><span className="empty-title">Belum ada data.</span></div>
                )}
              </div>
              <div className="mini-metric-row">
                <span className="mini-metric-label">Rata-rata Tindakan / Kunjungan</span>
                <span className="mini-metric-value">{report?.procedureMix.avgProceduresPerVisit ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="laporan-section">
          <div className="laporan-section-title">
            <h2>Pola Waktu Kunjungan</h2>
            <span>Kapan klinik paling sibuk</span>
          </div>
          <div className="chart-grid">
            <div className="panel chart-panel wide">
              <div className="panel-header">
                <h2><FiClock style={{ marginRight: 6, verticalAlign: -2 }} />Jam Kedatangan Pasien</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byHourData}>
                    <CartesianGrid stroke="#E8ECF4" vertical={false} />
                    <XAxis dataKey="jam" tick={{ fontSize: 10.5, fill: '#6B7A99' }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="jumlah" name="Kunjungan" fill="#F5A623" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel chart-panel">
              <div className="panel-header">
                <h2><FiUsers style={{ marginRight: 6, verticalAlign: -2 }} />Hari dalam Seminggu</h2>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byDayOfWeekData}>
                    <CartesianGrid stroke="#E8ECF4" vertical={false} />
                    <XAxis dataKey="hari" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7A99' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="jumlah" name="Kunjungan" fill="#7B5CFA" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
