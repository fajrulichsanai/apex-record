'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiDollarSign, FiCheckCircle, FiClock } from 'react-icons/fi';
import MultiClinicLayout from '@/components/layout/MultiClinicLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { multiClinicApi, type MultiClinicReport, type OwnedClinic } from '@/lib/multi-clinic';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import '../../styles/multi-klinik.css';

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Preset = 'this-month' | 'last-month' | '30d' | 'custom';

function presetRange(preset: Exclude<Preset, 'custom'>) {
  const now = new Date();
  if (preset === 'this-month') {
    return { dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: isoDate(now) };
  }
  if (preset === 'last-month') {
    return {
      dateFrom: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      dateTo: isoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { dateFrom: isoDate(from), dateTo: isoDate(now) };
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Laporan semua cabang dengan filter klinik di halaman yang sama (PRD MK-04):
 * owner tidak perlu berpindah cabang untuk membandingkan.
 */
export default function MultiClinicReportPage() {
  const [branches, setBranches] = useState<OwnedClinic[]>([]);
  const [clinicId, setClinicId] = useState<number | ''>('');
  const [preset, setPreset] = useState<Preset>('this-month');
  const [range, setRange] = useState(() => presetRange('this-month'));
  const [report, setReport] = useState<MultiClinicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    multiClinicApi
      .myClinics()
      .then((rows) => setBranches(Array.isArray(rows) ? rows : []))
      .catch(() => setBranches([]));
  }, []);

  const rangeValid = range.dateFrom && range.dateTo && range.dateFrom <= range.dateTo;

  useEffect(() => {
    if (!rangeValid) return;
    let active = true;
    multiClinicApi
      .report({ ...range, clinicId: clinicId || undefined })
      .then((data) => {
        if (!active) return;
        setReport(data);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Gagal memuat laporan');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, clinicId, rangeValid]);

  const maxVisits = useMemo(() => Math.max(1, ...(report?.byDay ?? []).map((d) => d.visits)), [report]);
  const collectedRate =
    report && report.totals.revenue > 0 ? Math.round((report.totals.collected / report.totals.revenue) * 100) : null;

  const changePreset = (next: Preset) => {
    setPreset(next);
    if (next !== 'custom') {
      setLoading(true);
      setRange(presetRange(next));
    }
  };

  return (
    <MultiClinicLayout>
      <div className="mk-scope mk-page">
        <div className="mk-head">
          <div>
            <h1>Laporan Cabang</h1>
            <p>Kunjungan dan keuangan semua cabang dalam satu halaman. Pilih satu cabang untuk melihatnya saja.</p>
          </div>
        </div>

        <div className="mk-card">
          <div className="mk-filters">
            <label className="mk-field">
              Cabang
              <CustomSelect
                value={String(clinicId)}
                onChange={(value) => {
                  setLoading(true);
                  setClinicId(value ? Number(value) : '');
                }}
                options={[
                  { value: '', label: 'Semua cabang' },
                  ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                ]}
              />
            </label>
            <label className="mk-field">
              Periode
              <CustomSelect
                value={preset}
                onChange={(value) => changePreset(value as Preset)}
                options={[
                  { value: 'this-month', label: 'Bulan ini' },
                  { value: 'last-month', label: 'Bulan lalu' },
                  { value: '30d', label: '30 hari terakhir' },
                  { value: 'custom', label: 'Pilih tanggal…' },
                ]}
              />
            </label>
            {preset === 'custom' && (
              <>
                <label className="mk-field">
                  Dari
                  <input
                    type="date"
                    value={range.dateFrom}
                    max={range.dateTo || undefined}
                    onChange={(e) => {
                      setLoading(true);
                      setRange((r) => ({ ...r, dateFrom: e.target.value }));
                    }}
                  />
                </label>
                <label className="mk-field">
                  Sampai
                  <input
                    type="date"
                    value={range.dateTo}
                    min={range.dateFrom || undefined}
                    onChange={(e) => {
                      setLoading(true);
                      setRange((r) => ({ ...r, dateTo: e.target.value }));
                    }}
                  />
                </label>
              </>
            )}
          </div>
          {!rangeValid && <div className="mk-alert warn">Tanggal awal harus sebelum tanggal akhir.</div>}
        </div>

        {error && <div className="mk-alert bad">{error}</div>}

        {loading && !report ? (
          <div className="mk-card mk-muted">Memuat laporan…</div>
        ) : report ? (
          <>
            <div className="mk-stats" aria-busy={loading}>
              <div className="mk-stat">
                <span className="ic"><FiCalendar /></span>
                <div className="body">
                  <span className="l">Kunjungan</span>
                  <span className="v">{report.totals.visits.toLocaleString('id-ID')}</span>
                  <span className="s">
                    {report.totals.finished.toLocaleString('id-ID')} selesai · {report.totals.cancelled.toLocaleString('id-ID')} batal
                  </span>
                </div>
              </div>
              <div className="mk-stat">
                <span className="ic"><FiDollarSign /></span>
                <div className="body">
                  <span className="l">Omzet (tagihan)</span>
                  <span className="v">Rp {formatCurrency(report.totals.revenue)}</span>
                  <span className="s">{report.totals.billings.toLocaleString('id-ID')} tagihan</span>
                </div>
              </div>
              <div className="mk-stat">
                <span className="ic"><FiCheckCircle /></span>
                <div className="body">
                  <span className="l">Sudah dibayar</span>
                  <span className="v">Rp {formatCurrency(report.totals.collected)}</span>
                  {collectedRate !== null && <span className="s">{collectedRate}% dari omzet</span>}
                </div>
              </div>
              <div className="mk-stat">
                <span className="ic"><FiClock /></span>
                <div className="body">
                  <span className="l">Belum dibayar</span>
                  <span className="v">Rp {formatCurrency(report.totals.outstanding)}</span>
                </div>
              </div>
            </div>

            <div className="mk-card">
              <div className="mk-card-head">
                <h2>Kunjungan per hari</h2>
                <span className="mk-muted">
                  {shortDate(report.range.dateFrom)} – {shortDate(report.range.dateTo)}
                </span>
              </div>
              {report.byDay.length === 0 ? (
                <p className="mk-hint">Belum ada kunjungan di periode ini.</p>
              ) : (
                <>
                  <div className="mk-trend" role="img" aria-label="Grafik kunjungan per hari">
                    {report.byDay.map((d) => (
                      <div
                        key={d.date}
                        className="mk-trend-bar"
                        title={`${shortDate(d.date)}: ${d.visits} kunjungan · Rp ${formatCurrency(d.revenue)}`}
                      >
                        <span style={{ height: `${Math.round((d.visits / maxVisits) * 100)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="mk-trend-axis">
                    <span>{shortDate(report.byDay[0].date)}</span>
                    <span>{shortDate(report.byDay[report.byDay.length - 1].date)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="mk-table-wrap">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th>Cabang</th>
                    <th className="r">Kunjungan</th>
                    <th className="r">Selesai</th>
                    <th className="r">Omzet</th>
                    <th className="r">Dibayar</th>
                    <th className="r">Belum dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {report.clinics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="mk-muted">
                        Belum ada cabang terhubung.
                      </td>
                    </tr>
                  ) : (
                    report.clinics.map((c) => (
                      <tr key={c.clinic.id}>
                        <td className="name">{c.clinic.name}</td>
                        <td className="r num" data-label="Kunjungan">{c.visits.toLocaleString('id-ID')}</td>
                        <td className="r num" data-label="Selesai">{c.finished.toLocaleString('id-ID')}</td>
                        <td className="r num" data-label="Omzet">Rp {formatCurrency(c.revenue)}</td>
                        <td className="r num" data-label="Dibayar">Rp {formatCurrency(c.collected)}</td>
                        <td className="r num" data-label="Belum dibayar">Rp {formatCurrency(c.outstanding)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {report.clinics.length > 1 && (
                  <tfoot>
                    <tr>
                      <td className="name">Total</td>
                      <td className="r num" data-label="Kunjungan">{report.totals.visits.toLocaleString('id-ID')}</td>
                      <td className="r num" data-label="Selesai">{report.totals.finished.toLocaleString('id-ID')}</td>
                      <td className="r num" data-label="Omzet">Rp {formatCurrency(report.totals.revenue)}</td>
                      <td className="r num" data-label="Dibayar">Rp {formatCurrency(report.totals.collected)}</td>
                      <td className="r num" data-label="Belum dibayar">Rp {formatCurrency(report.totals.outstanding)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        ) : null}
      </div>
    </MultiClinicLayout>
  );
}
