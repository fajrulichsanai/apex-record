'use client';

import { useMemo, useState } from 'react';
import { FinancialReportResponse } from '@/lib/reports';

type SortKey = 'frekuensi' | 'labaBersih';

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface TindakanTerlarisTableProps {
  tindakan: FinancialReportResponse['tindakanTerlaris'];
}

export default function TindakanTerlarisTable({ tindakan }: TindakanTerlarisTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('frekuensi');

  const sorted = useMemo(
    () => [...tindakan].sort((a, b) => b[sortKey] - a[sortKey]),
    [tindakan, sortKey],
  );

  return (
    <div className="panel laporan-table-panel">
      <div className="panel-header">
        <h2>Tindakan Terlaris</h2>
        <div className="range-tabs">
          <button
            type="button"
            className={`range-tab ${sortKey === 'frekuensi' ? 'active' : ''}`}
            onClick={() => setSortKey('frekuensi')}
          >
            Frekuensi
          </button>
          <button
            type="button"
            className={`range-tab ${sortKey === 'labaBersih' ? 'active' : ''}`}
            onClick={() => setSortKey('labaBersih')}
          >
            Laba Bersih
          </button>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-list">
          <div className="empty-title">Belum ada data tindakan pada periode ini</div>
        </div>
      ) : (
        <div className="laporan-table-wrap">
          <table className="laporan-table">
            <thead>
              <tr>
                <th>Tindakan</th>
                <th>Modal</th>
                <th>Harga Jual</th>
                <th>Frekuensi</th>
                <th>Total Diskon</th>
                <th>Laba Bersih</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.tarifId}>
                  <td>{t.namaTindakan}</td>
                  <td>{formatRupiah(t.modal)}</td>
                  <td>{formatRupiah(t.hargaJual)}</td>
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
