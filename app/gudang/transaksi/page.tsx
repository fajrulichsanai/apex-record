'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang, type StokTransaksi, type StokTransaksiType } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import GudangTabs from '../GudangTabs';
import '../../styles/gudang.css';

const TYPE_LABELS: Record<StokTransaksiType, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  adjustment: 'Adjustment',
  expired: 'Expired',
};

export default function TransaksiPage() {
  const router = useRouter();
  const { user } = useAuth();
  const viewOnly = isFeatureViewOnly(user?.role, 'gudang');
  const { error } = useToast();
  const [transaksi, setTransaksi] = useState<StokTransaksi[]>([]);
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [transaksiRes, barangRes] = await Promise.all([
        gudangApi.listTransaksi({ limit: 500 }),
        gudangApi.listBarang({ limit: 500, isActive: true }),
      ]);
      setTransaksi(transaksiRes.data);
      setBarangList(barangRes.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data transaksi';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTransaksi = useMemo(
    () => transaksi.filter((t) => !filterType || t.type === filterType),
    [transaksi, filterType]
  );

  return (
    <DashboardLayout>
      <FeatureGuard feature="gudang">
      <main className="content gudang-page">
        <GudangTabs active="transaksi" />

        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Transaksi Stok</h1>
              <span className="badge-count">{transaksi.length}</span>
            </div>
            <p className="page-subtitle">Riwayat stock in, stock out, adjustment, dan expired.</p>
          </div>
          <div className="page-header-actions">
            {!viewOnly && (
              <button className="btn-primary" type="button" onClick={() => router.push('/gudang/transaksi/create')} disabled={loading || barangList.length === 0}>
                <span className="material-symbols-rounded">add</span>
                Tambah Transaksi
              </button>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-toolbar">
            <div className="toolbar-row">
              <div style={{ minWidth: 220 }}>
                <CustomSelect
                  value={filterType}
                  onChange={setFilterType}
                  options={[
                    { value: '', label: 'Semua Tipe' },
                    ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredTransaksi.length} transaksi ditemukan</span>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
              <div className="empty-title">Memuat data transaksi...</div>
            </div>
          ) : filteredTransaksi.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">search_off</span></div>
              <div className="empty-title">Belum ada transaksi stok</div>
              <div className="empty-sub">Tambahkan transaksi stock in/out pertama Anda</div>
            </div>
          ) : (
            <div className="gudang-table-wrap">
              <table className="gudang-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Barang</th>
                    <th>Tipe</th>
                    <th>Qty</th>
                    <th>No. Faktur/Batch</th>
                    <th>Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransaksi.map((t) => (
                    <tr key={t.id}>
                      <td>{new Date(t.tanggal).toLocaleDateString('id-ID')}</td>
                      <td>
                        <div className="gudang-name">{t.barang?.name || `#${t.barangId}`}</div>
                        <div className="gudang-code">{t.barang?.sku}</div>
                      </td>
                      <td><span className="tag">{TYPE_LABELS[t.type]}</span></td>
                      <td>{t.type === 'in' ? '+' : '-'}{t.qty} {t.barang?.satuanPakai}</td>
                      <td>{t.noFaktur || t.noBatch || '-'}</td>
                      <td>{t.alasan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
