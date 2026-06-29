'use client';

import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { doctorFeeApi, type DoctorMonthlyShareReport } from '@/lib/doctor-fee';
import { useToast } from '@/lib/toast-context';

const MONTH_OPTIONS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

function initialsFromName(name?: string) {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

const exportReportToExcel = (reports: DoctorMonthlyShareReport[], year: number, month: number) => {
  const headers = ['Dokter', 'Tindakan', 'Jumlah', 'Tipe Fee', 'Nilai Fee', 'Total Share (Rp)'];
  const rows: string[][] = [];
  for (const r of reports) {
    for (const b of r.breakdown) {
      rows.push([
        r.practitionerName,
        b.tarifName,
        String(b.count),
        b.feeType === 'fixed' ? 'Fixed' : 'Persentase',
        b.feeType === 'fixed' ? `Rp ${b.feeValue}` : `${b.feeValue}%`,
        b.totalShare.toString(),
      ]);
    }
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => (cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `share-fee-dokter-${year}-${String(month).padStart(2, '0')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function MonthlyReportPanel() {
  const { success, error, warning } = useToast();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [reports, setReports] = useState<DoctorMonthlyShareReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const yearOptions = useMemo(() => {
    const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
    return years.map((y) => ({ value: String(y), label: String(y) }));
  }, [now]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    doctorFeeApi
      .monthlyReport({ year: Number(year), month: Number(month) })
      .then((res) => {
        if (!active) return;
        setReports(res);
        setSelectedId(res[0]?.practitionerId ?? null);
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Gagal memuat laporan share fee';
        error(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year, month, error]);

  const selected = reports.find((r) => r.practitionerId === selectedId) ?? null;

  return (
    <div className="panel">
      <div className="panel-toolbar">
        <div className="picker-row">
          <div>
            <CustomSelect value={month} onChange={setMonth} options={MONTH_OPTIONS} />
          </div>
          <div>
            <CustomSelect value={year} onChange={setYear} options={yearOptions} />
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn-outline"
          type="button"
          onClick={() => {
            if (reports.length === 0) {
              warning('Tidak ada data laporan untuk diekspor');
              return;
            }
            exportReportToExcel(reports, Number(year), Number(month));
            success('Laporan share fee telah diekspor ke Excel');
          }}
        >
          <span className="material-symbols-rounded">download</span>
          Ekspor
        </button>
      </div>

      {loading ? (
        <div className="empty-list">
          <div className="empty-icon-wrap">
            <span className="material-symbols-rounded">hourglass_empty</span>
          </div>
          <div className="empty-title">Memuat laporan...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-list">
          <div className="empty-icon-wrap">
            <span className="material-symbols-rounded">search_off</span>
          </div>
          <div className="empty-title">Tidak ada tindakan pada periode ini</div>
          <div className="empty-sub">Pilih bulan/tahun lain atau pastikan tindakan sudah dicatat</div>
        </div>
      ) : (
        <div className="report-layout">
          <div className="dokter-list">
            {reports.map((r) => (
              <div
                key={r.practitionerId}
                className={`dokter-row ${selectedId === r.practitionerId ? 'active' : ''}`}
                onClick={() => setSelectedId(r.practitionerId)}
              >
                <div className="dokter-avatar">{initialsFromName(r.practitionerName)}</div>
                <div className="dokter-info">
                  <div className="dokter-name">{r.practitionerName}</div>
                  <div className="dokter-meta">{r.totalTindakan} tindakan</div>
                </div>
                <div className="dokter-total">Rp {r.totalShareFee.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>

          <div className="detail-panel">
            {selected ? (
              <>
                <div className="detail-header">
                  <h3>{selected.practitionerName}</h3>
                  <div className="detail-total">Rp {selected.totalShareFee.toLocaleString('id-ID')}</div>
                </div>
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Tindakan</th>
                      <th>Jumlah</th>
                      <th>Tipe Fee</th>
                      <th>Nilai Fee</th>
                      <th>Total Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.breakdown.map((b) => (
                      <tr key={b.tarifId}>
                        <td>{b.tarifName}</td>
                        <td>{b.count}</td>
                        <td>{b.feeType === 'fixed' ? 'Fixed' : 'Persentase'}</td>
                        <td>{b.feeType === 'fixed' ? `Rp ${b.feeValue.toLocaleString('id-ID')}` : `${b.feeValue}%`}</td>
                        <td>Rp {b.totalShare.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}>Total Tindakan: {selected.totalTindakan}</td>
                      <td>Rp {selected.totalShareFee.toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
              </>
            ) : (
              <div className="empty-list">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">person</span>
                </div>
                <div className="empty-title">Pilih dokter untuk melihat rincian</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
