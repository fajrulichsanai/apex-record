'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { useToast } from '@/lib/toast-context';
import '../styles/tarif.css';

// Simple function to export CSV (Excel compatible)
const exportToExcel = (tarifs: Tarif[]) => {
  const headers = ['Title', 'Category', 'Harga Modal (Rp)', 'Harga Jual (Rp)', 'Margin (Rp)', 'Status'];

  const rows = tarifs.map(item => {
    const margin = (item.hargaJual || 0) - (item.hargaPokok || 0);
    return [
      item.name,
      item.kategori,
      (item.hargaPokok || 0).toString(),
      (item.hargaJual || 0).toString(),
      margin.toString(),
      item.isActive ? 'Aktif' : 'Nonaktif',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `tarif-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function TarifPage() {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  const loadTarifs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tarifApi.list();
      setTarifs(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data tarif';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadTarifs();
  }, [loadTarifs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tarif-more') && !target.closest('.tarif-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const kategoriOptions = useMemo(
    () => Array.from(new Set(tarifs.map((t) => t.kategori))),
    [tarifs]
  );

  const filteredTarif = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tarifs.filter((item) => {
      const matchQ = !q || item.name.toLowerCase().includes(q);
      const matchCat = !filterKategori || item.kategori === filterKategori;
      return matchQ && matchCat;
    });
  }, [tarifs, searchQuery, filterKategori]);

  const totalCount = tarifs.length;
  const avgMarginMargin = tarifs.length > 0
    ? Math.round(tarifs.reduce((s, t) => {
        const hargaPokok = t.hargaPokok || 0;
        const hargaJual = t.hargaJual || 0;
        return s + (hargaJual > 0 ? ((hargaJual - hargaPokok) / hargaJual * 100) : 0);
      }, 0) / tarifs.length)
    : 0;
  const termahal = tarifs.length > 0 ? tarifs.reduce((a, b) => ((b.hargaJual || 0) > (a.hargaJual || 0) ? b : a)) : null;
  const kategoriCount = tarifs.length > 0 ? new Set(tarifs.map((t) => t.kategori)).size : 0;

  const handleDelete = (id: number, name: string) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteTarif = async () => {
    if (!confirmDelete) return;

    try {
      await tarifApi.delete(confirmDelete.id);
      success(`Tarif "${confirmDelete.name}" telah dihapus dari daftar.`);
      setConfirmDelete(null);
      await loadTarifs();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus tarif';
      error(message);
    }
  };

  return (
    <DashboardLayout>
      <main className="content tarif-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Tarif Setting</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola tarif layanan klinik dan dasar laporan keuangan.</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-outline" type="button" onClick={() => {
              if (filteredTarif.length === 0) {
                warning('Tidak ada data tarif untuk diekspor');
                return;
              }
              exportToExcel(filteredTarif);
              success(`${filteredTarif.length} tarif telah diekspor ke Excel`);
            }}>
              <span className="material-symbols-rounded">download</span>
              Ekspor
            </button>
            <button className="btn-primary" type="button" onClick={() => router.push('/tarif/create')} disabled={loading}>
              <span className="material-symbols-rounded">add</span>
              Tambah Tarif
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                receipt_long
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Tarif</div>
              <div className="stat-sub">{kategoriCount} kategori aktif</div>
            </div>
          </div>
          <div className="stat-card margin">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgMarginMargin}%</div>
              <div className="stat-label">Rata-rata Margin</div>
              <div className="stat-sub">dari harga pokok</div>
            </div>
          </div>
          <div className="stat-card termahal">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">Rp {termahal ? (termahal.hargaJual || 0).toLocaleString('id-ID') : '0'}</div>
              <div className="stat-label">Tarif Termahal</div>
              <div className="stat-sub">{termahal?.name || '-'}</div>
            </div>
          </div>
          <div className="stat-card durasi">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                category
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{kategoriCount}</div>
              <div className="stat-label">Kategori Aktif</div>
              <div className="stat-sub">dari {totalCount} tarif</div>
            </div>
          </div>
        </div>

        {/* Panel */}
        <div className="panel">
          <div className="panel-toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari berdasarkan title…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ minWidth: 200 }}>
                <CustomSelect
                  value={filterKategori}
                  onChange={setFilterKategori}
                  options={[
                    { value: '', label: 'Semua Kategori' },
                    ...kategoriOptions.map((kat) => ({ value: kat, label: kat })),
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredTarif.length} tarif ditemukan</span>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">hourglass_empty</span>
              </div>
              <div className="empty-title">Memuat data tarif...</div>
            </div>
          ) : filteredTarif.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">search_off</span>
              </div>
              <div className="empty-title">Tidak ada tarif ditemukan</div>
              <div className="empty-sub">Coba ubah kata kunci pencarian atau filter yang digunakan</div>
            </div>
          ) : (
            <div className="tarif-table-wrap">
              <table className="tarif-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Harga Modal</th>
                    <th>Harga Jual</th>
                    <th>Margin</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTarif.map((item) => {
                    const margin = (item.hargaJual || 0) - (item.hargaPokok || 0);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="tarif-name">{item.name}</div>
                          {item.kodeIcd9 && <div className="tarif-code">{item.kodeIcd9}</div>}
                        </td>
                        <td><span className="tag">{item.kategori}</span></td>
                        <td>Rp {(item.hargaPokok || 0).toLocaleString('id-ID')}</td>
                        <td>Rp {(item.hargaJual || 0).toLocaleString('id-ID')}</td>
                        <td>
                          <span className="tarif-margin">
                            <span className="material-symbols-rounded">trending_up</span>
                            Rp {margin.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <button className="tarif-more" type="button" onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
                              <span className="material-symbols-rounded">more_vert</span>
                            </button>
                            {openMenuId === item.id && (
                              <div className="tarif-menu">
                                <button type="button" className="tarif-menu-item" onClick={() => {
                                  router.push(`/tarif/edit/${item.id}`);
                                  setOpenMenuId(null);
                                }}>
                                  <span className="material-symbols-rounded">edit</span>
                                  Edit
                                </button>
                                <button type="button" className="tarif-menu-item delete" onClick={() => {
                                  handleDelete(item.id, item.name);
                                  setOpenMenuId(null);
                                }}>
                                  <span className="material-symbols-rounded">delete</span>
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
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
          title="Hapus Tarif?"
          message={`Apakah Anda yakin ingin menghapus tarif "${confirmDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          isDangerous
          onConfirm={confirmDeleteTarif}
          onCancel={() => setConfirmDelete(null)}
        />
      </main>
    </DashboardLayout>
  );
}
