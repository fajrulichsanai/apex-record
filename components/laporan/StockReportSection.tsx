'use client';

import { FinancialReportProResponse } from '@/lib/reports';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface StockReportSectionProps {
  data: FinancialReportProResponse['stockReport'];
}

export default function StockReportSection({ data }: StockReportSectionProps) {
  return (
    <div className="panel laporan-table-panel">
      <div className="panel-header">
        <h2>Laporan Stok</h2>
        <span className="stock-inventory-value">
          Total Nilai Inventory: <strong>{formatRupiah(data.totalInventoryValue)}</strong>
          {' '}({data.totalActiveItems} item aktif)
        </span>
      </div>
      {data.usage.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Belum ada pemakaian bahan pada periode ini</div>
        </div>
      ) : (
        <div className="laporan-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th>Bahan</th>
                <th>Qty Terpakai</th>
                <th>Biaya</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.barangId}>
                  <td>{u.barangName}</td>
                  <td>{u.qtyUsed} {u.satuan}</td>
                  <td>{formatRupiah(u.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
