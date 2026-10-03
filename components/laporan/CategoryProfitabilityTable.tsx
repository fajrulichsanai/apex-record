'use client';

import { FinancialReportResponse } from '@/lib/reports';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface CategoryProfitabilityTableProps {
  data: FinancialReportResponse['businessMetrics']['categoryProfitability'];
}

export default function CategoryProfitabilityTable({ data }: CategoryProfitabilityTableProps) {
  return (
    <div className="panel laporan-table-panel">
      <div className="panel-header">
        <h2>Profitabilitas per Kategori Tindakan</h2>
      </div>
      {data.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Belum ada data tindakan pada periode ini</div>
        </div>
      ) : (
        <div className="laporan-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Frekuensi</th>
                <th>Pendapatan</th>
                <th>Modal</th>
                <th>Laba Bersih</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.kategori}>
                  <td>{c.kategori}</td>
                  <td>{c.frekuensi}</td>
                  <td>{formatRupiah(c.pendapatan)}</td>
                  <td>{formatRupiah(c.modal)}</td>
                  <td>{formatRupiah(c.labaBersih)}</td>
                  <td>{c.marginPersen}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
