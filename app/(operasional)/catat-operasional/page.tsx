'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { operationalApi, OPERASIONAL_KATEGORI_OPTIONS, type OperationalRecord } from '@/lib/operational';
import { useToast } from '@/lib/toast-context';
import OperationalFormModal from './OperationalFormModal';
import '../../styles/catat-operasional.css';

const exportToExcel = (records: OperationalRecord[]) => {
  const headers = ['Tanggal', 'Kategori', 'Deskripsi', 'Nominal (Rp)'];

  const rows = records.map((item) => [
    item.tanggal,
    item.kategori,
    item.deskripsi,
    item.nominal.toString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `catat-operasional-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function CatatOperasionalPage() {
  const { success, error, warning } = useToast();
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; deskripsi: string } | null>(null);
  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; record?: OperationalRecord } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await operationalApi.list();
      setRecords(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data operasional';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.op-more') && !target.closest('.op-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const kategoriOptions = useMemo(
    () => Array.from(new Set(records.map((r) => r.kategori))),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = records.filter((item) => {
      const matchQ = !q || item.deskripsi.toLowerCase().includes(q);
      const matchKategori = !filterKategori || item.kategori === filterKategori;
      const matchStart = !startDate || item.tanggal >= startDate;
      const matchEnd = !endDate || item.tanggal <= endDate;
      return matchQ && matchKategori && matchStart && matchEnd;
    });
    return [...filtered].sort((a, b) => (sortAsc ? (a.tanggal > b.tanggal ? 1 : -1) : (a.tanggal < b.tanggal ? 1 : -1)));
  }, [records, searchQuery, filterKategori, startDate, endDate, sortAsc]);

  const now = new Date();
  const thisMonthRecords = useMemo(
    () => records.filter((r) => {
      const d = new Date(r.tanggal);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }),
    [records, now]
  );

  const totalBulanIni = thisMonthRecords.reduce((sum, r) => sum + r.nominal, 0);
  const totalSemuaPeriode = records.reduce((sum, r) => sum + r.nominal, 0);

  const kategoriTerbesar = useMemo(() => {
    const byKategori = new Map<string, number>();
    for (const r of thisMonthRecords) {
      byKategori.set(r.kategori, (byKategori.get(r.kategori) ?? 0) + r.nominal);
    }
    let topKategori = '-';
    let topTotal = 0;
    for (const [kategori, total] of byKategori) {
      if (total > topTotal) {
        topKategori = kategori;
        topTotal = total;
      }
    }
    return { kategori: topKategori, total: topTotal };
  }, [thisMonthRecords]);

  const jumlahTransaksiBulanIni = thisMonthRecords.length;

  const handleDelete = (id: number, deskripsi: string) => {
    setConfirmDelete({ id, deskripsi });
  };

  const confirmDeleteRecord = async () => {
    if (!confirmDelete) return;

    try {
      await operationalApi.delete(confirmDelete.id);
      success('Catatan operasional telah dihapus.');
      setConfirmDelete(null);
      await loadRecords();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus catatan operasional';
      error(message);
    }
  };

  const kategoriLabel = (value: string) =>
    OPERASIONAL_KATEGORI_OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <DashboardLayout>
      <main className="content operasional-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Catat Operasional</h1>
              <span className="badge-count">{records.length}</span>
            </div>
            <p className="page-subtitle">Pencatatan biaya operasional klinik bulanan.</p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                if (filteredRecords.length === 0) {
                  warning('Tidak ada data operasional untuk diekspor');
                  return;
                }
                exportToExcel(filteredRecords);
                success(`${filteredRecords.length} catatan telah diekspor ke Excel`);
              }}
            >
              <span className="material-symbols-rounded">download</span>
              Ekspor
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setFormModal({ mode: 'create' })}
              disabled={loading}
            >
              <span className="material-symbols-rounded">add</span>
              Tambah Operasional
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">Rp {totalBulanIni.toLocaleString('id-ID')}</div>
              <div className="stat-label">Total Bulan Ini</div>
              <div className="stat-sub">{jumlahTransaksiBulanIni} transaksi</div>
            </div>
          </div>
          <div className="stat-card allperiod">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance_wallet
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">Rp {totalSemuaPeriode.toLocaleString('id-ID')}</div>
              <div className="stat-label">Total Semua Periode</div>
              <div className="stat-sub">{records.length} catatan</div>
            </div>
          </div>
          <div className="stat-card kategori">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                category
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">Rp {kategoriTerbesar.total.toLocaleString('id-ID')}</div>
              <div className="stat-label">Kategori Terbesar</div>
              <div className="stat-sub">{kategoriLabel(kategoriTerbesar.kategori)}</div>
            </div>
          </div>
          <div className="stat-card jumlah">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                receipt_long
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{jumlahTransaksiBulanIni}</div>
              <div className="stat-label">Jumlah Transaksi</div>
              <div className="stat-sub">bulan ini</div>
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
                  placeholder="Cari berdasarkan deskripsi…"
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
                    ...kategoriOptions.map((kat) => ({ value: kat, label: kategoriLabel(kat) })),
                  ]}
                />
              </div>
              <input
                type="date"
                className="date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredRecords.length} catatan ditemukan</span>
            <span className="sort-label" onClick={() => setSortAsc((v) => !v)}>
              <span className="material-symbols-rounded">{sortAsc ? 'arrow_upward' : 'arrow_downward'}</span>
              Tanggal
            </span>
          </div>

          {loading ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">hourglass_empty</span>
              </div>
              <div className="empty-title">Memuat data operasional...</div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">search_off</span>
              </div>
              <div className="empty-title">Tidak ada catatan operasional ditemukan</div>
              <div className="empty-sub">Coba ubah kata kunci pencarian atau filter yang digunakan</div>
            </div>
          ) : (
            <div className="op-table-wrap">
              <table className="op-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Deskripsi</th>
                    <th>Nominal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td><span className="tag">{kategoriLabel(item.kategori)}</span></td>
                      <td className="op-deskripsi" title={item.deskripsi}>{item.deskripsi}</td>
                      <td className="op-nominal">Rp {item.nominal.toLocaleString('id-ID')}</td>
                      <td>
                        <div style={{ position: 'relative' }}>
                          <button
                            className="op-more"
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          >
                            <span className="material-symbols-rounded">more_vert</span>
                          </button>
                          {openMenuId === item.id && (
                            <div className="op-menu">
                              <button
                                type="button"
                                className="op-menu-item"
                                onClick={() => {
                                  setFormModal({ mode: 'edit', record: item });
                                  setOpenMenuId(null);
                                }}
                              >
                                <span className="material-symbols-rounded">edit</span>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="op-menu-item delete"
                                onClick={() => {
                                  handleDelete(item.id, item.deskripsi);
                                  setOpenMenuId(null);
                                }}
                              >
                                <span className="material-symbols-rounded">delete</span>
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmationModal
          isOpen={!!confirmDelete}
          title="Hapus Catatan Operasional?"
          message={`Apakah Anda yakin ingin menghapus catatan "${confirmDelete?.deskripsi}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          isDangerous
          onConfirm={confirmDeleteRecord}
          onCancel={() => setConfirmDelete(null)}
        />

        {formModal && (
          <OperationalFormModal
            initial={formModal.mode === 'edit' ? formModal.record : null}
            onClose={() => setFormModal(null)}
            onSaved={() => {
              setFormModal(null);
              loadRecords();
            }}
          />
        )}
      </main>
    </DashboardLayout>
  );
}
