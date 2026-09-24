'use client';

import { FinancialReportProResponse } from '@/lib/reports';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface DiscountRankingTableProps {
  data: FinancialReportProResponse['discountRanking'];
}

export default function DiscountRankingTable({ data }: DiscountRankingTableProps) {
  return (
    <div className="panel laporan-table-panel">
      <div className="panel-header">
        <h2>Tindakan Paling Sering Didiskon</h2>
      </div>
      {data.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Belum ada tindakan yang didiskon pada periode ini</div>
        </div>
      ) : (
        <div className="laporan-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th>Tindakan</th>
                <th>Frekuensi</th>
                <th>Total Diskon</th>
                <th>Laba Bersih</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.tarifId}>
                  <td>{t.namaTindakan}</td>
                  <td>{t.frekuensi}</td>
                  <td>{formatRupiah(t.totalDiskon)}</td>
                  <td>{formatRupiah(t.labaBersih)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
