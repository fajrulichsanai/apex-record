'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import GudangTabs from '../GudangTabs';
import '../../styles/gudang.css';

export default function BarangPage() {
  const router = useRouter();
  const { user } = useAuth();
  const viewOnly = isFeatureViewOnly(user?.role, 'gudang');
  const { success, error } = useToast();
  const [items, setItems] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gudangApi.listBarang({ limit: 500 });
      setItems(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data barang';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const kategoriOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.kategori).filter(Boolean))) as string[],
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      const matchCat = !filterKategori || item.kategori === filterKategori;
      const matchLow = !filterLowStock || item.stokSaatIni < item.stokMinimum;
      return matchQ && matchCat && matchLow;
    });
  }, [items, searchQuery, filterKategori, filterLowStock]);

  const totalCount = items.filter((i) => i.isActive).length;
  const lowStockCount = items.filter((i) => i.isActive && i.stokSaatIni < i.stokMinimum).length;
  const totalValue = items.reduce((s, i) => s + i.stokSaatIni * (i.hargaBeli || 0), 0);
  const kategoriCount = new Set(items.map((i) => i.kategori).filter(Boolean)).size;

  const handleDelete = (id: number, name: string) => setConfirmDelete({ id, name });

  const confirmDeleteBarang = async () => {
    if (!confirmDelete) return;
    try {
      await gudangApi.deleteBarang(confirmDelete.id);
      success(`Barang "${confirmDelete.name}" telah dinonaktifkan.`);
      setConfirmDelete(null);
      await loadItems();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus barang';
      error(message);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="gudang">
      <main className="content gudang-page">
        <GudangTabs active="barang" />

        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Master Barang</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola daftar barang, satuan, harga beli, dan stok minimum.</p>
          </div>
          <div className="page-header-actions">
            {!viewOnly && (
              <button className="btn-primary" type="button" onClick={() => router.push('/gudang/barang/create')} disabled={loading}>
                <span className="material-symbols-rounded">add</span>
                Tambah Barang
              </button>
            )}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card total">
            <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span></div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Barang Aktif</div>
              <div className="stat-sub">{kategoriCount} kategori</div>
            </div>
          </div>
          <div className="stat-card margin">
            <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span></div>
            <div className="stat-info">
              <div className="stat-value">Rp {totalValue.toLocaleString('id-ID')}</div>
              <div className="stat-label">Nilai Inventory</div>
              <div className="stat-sub">berdasarkan stok saat ini</div>
            </div>
          </div>
          <div className="stat-card termahal">
            <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span></div>
            <div className="stat-info">
              <div className="stat-value">{lowStockCount}</div>
              <div className="stat-label">Stok Kritis</div>
              <div className="stat-sub">di bawah stok minimum</div>
            </div>
          </div>
          <div className="stat-card durasi">
            <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>category</span></div>
            <div className="stat-info">
              <div className="stat-value">{kategoriCount}</div>
              <div className="stat-label">Kategori</div>
              <div className="stat-sub">dari {totalCount} barang</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari nama atau SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ minWidth: 200 }}>
                <CustomSelect
                  value={filterKategori}
                  onChange={setFilterKategori}
                  options={[{ value: '', label: 'Semua Kategori' }, ...kategoriOptions.map((k) => ({ value: k, label: k }))]}
                />
              </div>
              <button
                type="button"
                className={`btn-outline${filterLowStock ? ' active' : ''}`}
                onClick={() => setFilterLowStock((v) => !v)}
              >
                <span className="material-symbols-rounded">warning</span>
                Stok Kritis
              </button>
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredItems.length} barang ditemukan</span>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
              <div className="empty-title">Memuat data barang...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">search_off</span></div>
              <div className="empty-title">Tidak ada barang ditemukan</div>
              <div className="empty-sub">Coba ubah kata kunci pencarian atau filter yang digunakan</div>
            </div>
          ) : (
            <div className="gudang-table-wrap">
              <table className="gudang-table">
                <thead>
                  <tr>
                    <th>Nama Barang</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                    <th>Harga Beli</th>
                    <th>Lokasi</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isLow = item.stokSaatIni < item.stokMinimum;
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="gudang-name">{item.name}</div>
                          <div className="gudang-code">{item.sku}</div>
                        </td>
                        <td>{item.kategori ? <span className="tag">{item.kategori}</span> : '-'}</td>
                        <td>
                          <span className={isLow ? 'gudang-margin' : undefined}>
                            {isLow && <span className="material-symbols-rounded" style={{ fontSize: 14 }}>warning</span>}
                            {item.stokSaatIni} {item.satuanPakai} <span style={{ color: 'var(--text-sub)', fontSize: 11 }}>(min {item.stokMinimum})</span>
                          </span>
                        </td>
                        <td>Rp {(item.hargaBeli || 0).toLocaleString('id-ID')}</td>
                        <td>{item.lokasiSimpan || '-'}</td>
                        <td>
                          <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>
                          {viewOnly ? (
                            <span className="gudang-actions-readonly">-</span>
                          ) : (
                            <div className="gudang-actions">
                              <button type="button" className="action-btn edit" aria-label="Edit" onClick={() => router.push(`/gudang/barang/edit/${item.id}`)}>
                                <span className="material-symbols-rounded">edit</span>
                              </button>
                              <button type="button" className="action-btn delete" aria-label="Hapus" onClick={() => handleDelete(item.id, item.name)}>
                                <span className="material-symbols-rounded">delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmationModal
          isOpen={!!confirmDelete}
          title="Nonaktifkan Barang?"
          message={`Apakah Anda yakin ingin menonaktifkan barang "${confirmDelete?.name}"? Data transaksi lama tetap tersimpan.`}
          confirmLabel="Ya, Nonaktifkan"
          cancelLabel="Batal"
          isDangerous
          onConfirm={confirmDeleteBarang}
          onCancel={() => setConfirmDelete(null)}
        />
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
