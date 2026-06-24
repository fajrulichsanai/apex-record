'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import CustomSelect from '@/components/form/CustomSelect';
import { apiClient, ApiError } from '@/lib/api-client';
import { tarifApi, type Tarif } from '@/lib/tarif';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import '../styles/tarif.css';

// Simple function to export CSV (Excel compatible)
const exportToExcel = (tarifs: Tarif[]) => {
  const headers = ['Kode', 'Nama Tindakan', 'Kategori', 'Harga Pokok (Rp)', 'Harga Jual (Rp)', 'Diskon Maksimal (Rp)', 'Margin (%)'];

  const rows = tarifs.map(item => {
    const margin = item.hargaPokok > 0 ? ((item.hargaJual - item.hargaPokok) / item.hargaJual * 100).toFixed(0) : '0';
    return [
      item.kodeIcd9 || `ID-${item.id}`,
      item.name,
      item.kategori,
      (item.hargaPokok || 0).toString(),
      (item.hargaJual || 0).toString(),
      (item.diskonMaksimal || 0).toString(),
      margin
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape cells that contain commas or quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  // Create blob and download
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

const KATEGORI_ICON: Record<string, string> = {
  'Bedah Mulut': 'dentistry',
  'Konservasi': 'medical_services',
  'Konsultasi': 'chat_bubble',
  'Ortho': 'straighten',
};
export default function TarifPage() {
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');

  const [inputNama, setInputNama] = useState('');
  const [inputHargaPokok, setInputHargaPokok] = useState('');
  const [inputHargaJual, setInputHargaJual] = useState('');
  const [inputKategori, setInputKategori] = useState('Konsultasi');
  const [inputKodeIcd9, setInputKodeIcd9] = useState('');
  const [inputDiskonMaksimal, setInputDiskonMaksimal] = useState('');

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onOkAction?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const loadTarifs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tarifApi.list();
      setTarifs(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data tarif';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Memuat Data',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTarifs();
  }, [loadTarifs]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setOpenMenuId(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tarif-more') && !target.closest('.tarif-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const filteredTarif = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tarifs.filter((item) => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || (item.kodeIcd9?.toLowerCase().includes(q) ?? false);
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

  const openModal = (tarifToEdit?: Tarif) => {
    if (tarifToEdit) {
      setEditingId(tarifToEdit.id);
      setInputNama(tarifToEdit.name);
      setInputHargaPokok((tarifToEdit.hargaPokok || 0).toString());
      setInputHargaJual((tarifToEdit.hargaJual || 0).toString());
      setInputKategori(tarifToEdit.kategori);
      setInputKodeIcd9(tarifToEdit.kodeIcd9 || '');
      setInputDiskonMaksimal((tarifToEdit.diskonMaksimal || 0).toString());
    } else {
      setEditingId(null);
      setInputNama('');
      setInputHargaPokok('');
      setInputHargaJual('');
      setInputKategori('Konsultasi');
      setInputKodeIcd9('');
      setInputDiskonMaksimal('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!inputNama.trim() || !inputHargaJual.trim()) {
      setFeedback({
        isOpen: true,
        type: 'warning',
        title: 'Data Tidak Lengkap',
        message: 'Nama dan Harga Jual harus diisi',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: inputNama,
        kategori: inputKategori,
        kodeIcd9: inputKodeIcd9 || undefined,
        hargaPokok: parseCurrency(inputHargaPokok),
        hargaJual: parseCurrency(inputHargaJual),
        diskonMaksimal: parseCurrency(inputDiskonMaksimal),
      };

      if (editingId) {
        await tarifApi.update(editingId, payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Tarif Berhasil Diperbarui',
          message: `Tarif "${inputNama}" telah diperbarui.`,
          onOkAction: () => {
            closeModal();
            loadTarifs();
            setFeedback((prev) => ({ ...prev, isOpen: false }));
          },
        });
      } else {
        await tarifApi.create(payload);
        setFeedback({
          isOpen: true,
          type: 'success',
          title: 'Tarif Berhasil Ditambahkan',
          message: `Tarif "${inputNama}" telah ditambahkan ke daftar.`,
          onOkAction: () => {
            closeModal();
            loadTarifs();
            setFeedback((prev) => ({ ...prev, isOpen: false }));
          },
        });
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : `Gagal menyimpan tarif`;
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menyimpan Tarif',
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    setConfirmDelete({ id, name });
  };

  const confirmDeleteTarif = async () => {
    if (!confirmDelete) return;

    try {
      await tarifApi.delete(confirmDelete.id);
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Tarif Berhasil Dihapus',
        message: `Tarif "${confirmDelete.name}" telah dihapus dari daftar.`,
      });
      setConfirmDelete(null);
      await loadTarifs();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus tarif';
      setFeedback({
        isOpen: true,
        type: 'error',
        title: 'Gagal Menghapus Tarif',
        message,
      });
    }
  };

  return (
    <DashboardLayout>
      <main className="content tarif-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Tarif &amp; Tindakan</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola daftar tarif dan tindakan klinik Anda</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-outline" type="button" onClick={() => {
              if (filteredTarif.length === 0) {
                setFeedback({
                  isOpen: true,
                  type: 'warning',
                  title: 'Tidak ada data',
                  message: 'Tidak ada data tarif untuk diekspor',
                });
                return;
              }
              exportToExcel(filteredTarif);
              setFeedback({
                isOpen: true,
                type: 'success',
                title: 'Ekspor Berhasil',
                message: `${filteredTarif.length} tarif telah diekspor ke Excel`,
              });
            }}>
              <span className="material-symbols-rounded">download</span>
              Ekspor
            </button>
            <button className="btn-primary" type="button" onClick={() => openModal()} disabled={loading}>
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
              <div className="stat-label">Total Tindakan</div>
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
              <div className="stat-label">Tindakan Termahal</div>
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
              <div className="stat-sub">dari {totalCount} tindakan</div>
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
                  placeholder="Cari tarif atau kode ICD9…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterKategori === '' ? 'active' : ''}`}
                onClick={() => setFilterKategori('')}
                type="button"
              >
                Semua
              </button>
              {Array.from(new Set(tarifs.map((t) => t.kategori))).map((kat) => (
                <button
                  key={kat}
                  className={`filter-tab ${filterKategori === kat ? 'active' : ''}`}
                  onClick={() => setFilterKategori(kat)}
                  type="button"
                >
                  {kat}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredTarif.length} tindakan ditemukan</span>
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
              <div className="empty-title">Tidak ada tindakan ditemukan</div>
              <div className="empty-sub">Coba ubah kata kunci pencarian atau filter yang digunakan</div>
            </div>
          ) : (
            <div className="tarif-list">
              {filteredTarif.map((item) => {
                const margin = item.hargaPokok > 0 ? ((item.hargaJual - item.hargaPokok) / item.hargaJual * 100).toFixed(0) : 0;
                return (
                  <div key={item.id} className="tarif-item">
                    <div className="tarif-icon" style={{
                      background: item.kategori === 'Bedah Mulut' ? 'linear-gradient(135deg,#FF6B9D,#E84393)'
                        : item.kategori === 'Konservasi' ? 'linear-gradient(135deg,#F5A623,#E8831A)'
                        : 'linear-gradient(135deg,#4F7EF8,#7B5CFA)',
                    }}>
                      <span className="material-symbols-rounded">{KATEGORI_ICON[item.kategori] || 'medical_services'}</span>
                    </div>
                    <div className="tarif-info">
                      <div className="tarif-top">
                        <span className="tarif-code">{item.kodeIcd9 || `ID-${item.id}`}</span>
                        <span className="tarif-name">{item.name}</span>
                      </div>
                      <div className="tarif-badges">
                        <span className="tag">{item.kategori}</span>
                        {item.diskonMaksimal > 0 && <span className="tag multi">Diskon {item.diskonMaksimal}%</span>}
                      </div>
                    </div>
                    <div className="tarif-right">
                      <div className="tarif-price">Rp {(item.hargaJual || 0).toLocaleString('id-ID')}</div>
                      <div className="tarif-unit">harga jual</div>
                      <span className="tarif-margin">
                        <span className="material-symbols-rounded">trending_up</span>
                        Margin {margin}%
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button className="tarif-more" type="button" onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
                        <span className="material-symbols-rounded">more_vert</span>
                      </button>
                      {openMenuId === item.id && (
                        <div className="tarif-menu">
                          <button type="button" className="tarif-menu-item" onClick={() => {
                            openModal(item);
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
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className="tarif-page-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="tarif-page-modal-box">
              <div className="modal-header">
                <div className="modal-header-title">
                  <div className="modal-header-icon">
                    <span className="material-symbols-rounded">sell</span>
                  </div>
                  <div>
                    <h2>{editingId ? 'Edit Tarif' : 'Tambah Tarif Baru'}</h2>
                    <p>{editingId ? 'Perbarui detail tindakan' : 'Lengkapi detail tindakan dan struktur harganya'}</p>
                  </div>
                </div>
                <button className="modal-close" type="button" onClick={closeModal} aria-label="Tutup">
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="preview-card">
                  <div className="preview-badges">
                    <span className="preview-badge">{inputKategori}</span>
                  </div>
                  <div className="preview-name">{inputNama || 'Nama tindakan…'}</div>
                  <div>
                    <span className="preview-price">
                      Rp {(parseInt(inputHargaJual) || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field full">
                    <label>Nama Tindakan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Scaling Gigi"
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Kode ICD9 (opsional)</label>
                    <input
                      type="text"
                      placeholder="Contoh: J06.9"
                      value={inputKodeIcd9}
                      onChange={(e) => setInputKodeIcd9(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Kategori</label>
                    <CustomSelect
                      value={inputKategori}
                      onChange={setInputKategori}
                      options={[
                        { value: 'Konsultasi', label: 'Konsultasi' },
                        { value: 'Bedah Mulut', label: 'Bedah Mulut' },
                        { value: 'Konservasi', label: 'Konservasi' },
                        { value: 'Ortho', label: 'Ortho' },
                      ]}
                    />
                  </div>
                </div>

                <div className="form-section-title">
                  <span className="material-symbols-rounded">payments</span>
                  Harga & Biaya
                </div>

                <div className="split-row">
                  <div className="form-field">
                    <label>Harga Pokok (Rp)</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={formatCurrencyInput(inputHargaPokok)}
                      onChange={(e) => setInputHargaPokok(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Harga Jual (Rp) *</label>
                    <input
                      type="text"
                      placeholder="150.000"
                      value={formatCurrencyInput(inputHargaJual)}
                      onChange={(e) => setInputHargaJual(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="split-row">
                  <div className="form-field">
                    <label>Diskon Maksimal (Rp)</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={formatCurrencyInput(inputDiskonMaksimal)}
                      onChange={(e) => setInputDiskonMaksimal(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-outline" type="button" onClick={closeModal} disabled={submitting}>
                  Batal
                </button>
                <button className="btn-primary" type="button" onClick={handleSubmit} disabled={submitting}>
                  <span className="material-symbols-rounded">save</span>
                  {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Tarif'}
                </button>
              </div>
            </div>
          </div>
        )}

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

        <FeedbackModal
          isOpen={feedback.isOpen}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onOkAction={feedback.onOkAction || (() => setFeedback({ ...feedback, isOpen: false }))}
        />
      </main>
    </DashboardLayout>
  );
}
