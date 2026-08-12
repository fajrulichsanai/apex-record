'use client';

import { useCallback, useEffect, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang, type TindakanBom } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';

interface BomPanelProps {
  tarifId: number;
}

export default function BomPanel({ tarifId }: BomPanelProps) {
  const { success, error } = useToast();
  const [bomList, setBomList] = useState<TindakanBom[]>([]);
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [barangId, setBarangId] = useState('');
  const [qtyPakai, setQtyPakai] = useState('');
  const [wajib, setWajib] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [bomRes, barangRes] = await Promise.all([
        gudangApi.listBom(tarifId),
        gudangApi.listBarang({ limit: 500, isActive: true }),
      ]);
      setBomList(bomRes);
      setBarangList(barangRes.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat resep bahan';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [tarifId, error]);

  useEffect(() => {
    load();
  }, [load]);

  const usedBarangIds = new Set(bomList.map((b) => b.barangId));
  const availableBarang = barangList.filter((b) => !usedBarangIds.has(b.id));

  const handleAdd = async () => {
    if (!barangId || !qtyPakai || Number(qtyPakai) <= 0) return;
    try {
      setSubmitting(true);
      await gudangApi.createBom({ tarifId, barangId: Number(barangId), qtyPakai: Number(qtyPakai), wajib });
      success('Bahan telah ditambahkan ke resep');
      setBarangId('');
      setQtyPakai('');
      setWajib(true);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menambah bahan ke resep';
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await gudangApi.deleteBom(confirmDelete.id);
      success(`Bahan "${confirmDelete.name}" telah dihapus dari resep`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menghapus bahan dari resep';
      error(message);
    }
  };

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-sort">
        <span className="sort-label">Resep Bahan (BOM) — bahan yang dipakai saat tindakan ini dipilih</span>
      </div>

      {loading ? (
        <div className="empty-list">
          <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
          <div className="empty-title">Memuat resep bahan...</div>
        </div>
      ) : (
        <>
          {bomList.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap"><span className="material-symbols-rounded">science</span></div>
              <div className="empty-title">Belum ada bahan terdaftar</div>
              <div className="empty-sub">Stok tidak akan otomatis berkurang tanpa resep bahan</div>
            </div>
          ) : (
            <div className="gudang-table-wrap">
              <table className="gudang-table">
                <thead>
                  <tr>
                    <th>Bahan</th>
                    <th>Qty Pakai</th>
                    <th>Wajib</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bomList.map((bom) => (
                    <tr key={bom.id}>
                      <td className="gudang-name">{bom.barang?.name}</td>
                      <td>{bom.qtyPakai} {bom.barang?.satuanPakai}</td>
                      <td>
                        <span className={`status-badge ${bom.wajib ? 'active' : 'inactive'}`}>
                          {bom.wajib ? 'Wajib' : 'Opsional'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="action-btn delete"
                          aria-label="Hapus"
                          onClick={() => setConfirmDelete({ id: bom.id, name: bom.barang?.name || '' })}
                        >
                          <span className="material-symbols-rounded">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="toolbar-row" style={{ marginTop: 16, alignItems: 'flex-end' }}>
            <div style={{ minWidth: 220 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Bahan</label>
              <CustomSelect
                value={barangId}
                onChange={setBarangId}
                options={availableBarang.map((b) => ({ value: String(b.id), label: `${b.name} (${b.satuanPakai})` }))}
                placeholder="Pilih bahan..."
              />
            </div>
            <div style={{ minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Qty Pakai</label>
              <input type="number" min={0.001} step={0.001} placeholder="0" value={qtyPakai} onChange={(e) => setQtyPakai(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13 }}>
                <input type="checkbox" checked={wajib} onChange={(e) => setWajib(e.target.checked)} />
                Wajib
              </label>
            </div>
            <button type="button" className="btn-primary" onClick={handleAdd} disabled={submitting || !barangId || !qtyPakai}>
              <span className="material-symbols-rounded">add</span>
              Tambah
            </button>
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Bahan dari Resep?"
        message={`Apakah Anda yakin ingin menghapus "${confirmDelete?.name}" dari resep tindakan ini?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
