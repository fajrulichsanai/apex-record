'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { ApiError } from '@/lib/api-client';
import { prescriptionsApi, type PrescriptionItem } from '@/lib/prescriptions';
import { useToast } from '@/lib/toast-context';

interface PrescriptionPanelProps {
  encounterId: number;
  disabled?: boolean;
}

const EMPTY_DRAFT = { drugName: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' };

/**
 * Resep obat — a distinct, structured list (not a plain textarea like the
 * rest of SOAP) so each drug's dosage/frequency/duration/quantity stays
 * separately readable. Lives inside the Treatment section. Add/remove
 * persist immediately, mirroring BomPanel's pattern for tarif/tindakan.
 */
export default function PrescriptionPanel({ encounterId, disabled }: PrescriptionPanelProps) {
  const { success, error } = useToast();
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await prescriptionsApi.list(encounterId);
      setItems(data);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat resep obat');
    } finally {
      setLoading(false);
    }
  }, [encounterId, error]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!draft.drugName.trim()) return;
    try {
      setSubmitting(true);
      await prescriptionsApi.create(encounterId, {
        drugName: draft.drugName.trim(),
        dosage: draft.dosage.trim() || undefined,
        frequency: draft.frequency.trim() || undefined,
        duration: draft.duration.trim() || undefined,
        quantity: draft.quantity.trim() || undefined,
        instructions: draft.instructions.trim() || undefined,
      });
      success('Obat telah ditambahkan ke resep');
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menambah obat ke resep');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await prescriptionsApi.remove(encounterId, confirmDelete.id);
      success(`Obat "${confirmDelete.name}" telah dihapus dari resep`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus obat dari resep');
    }
  };

  return (
    <div className="rx-panel">
      {loading ? (
        <div className="rx-empty">Memuat resep obat…</div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="rx-table-wrap">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>Nama Obat</th>
                    <th>Dosis</th>
                    <th>Frekuensi</th>
                    <th>Durasi</th>
                    <th>Jumlah</th>
                    <th>Aturan Pakai</th>
                    {!disabled && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="rx-drug-name">{item.drugName}</td>
                      <td>{item.dosage || '—'}</td>
                      <td>{item.frequency || '—'}</td>
                      <td>{item.duration || '—'}</td>
                      <td>{item.quantity || '—'}</td>
                      <td>{item.instructions || '—'}</td>
                      {!disabled && (
                        <td>
                          <button
                            type="button"
                            className="rx-delete-btn"
                            aria-label="Hapus"
                            onClick={() => setConfirmDelete({ id: item.id, name: item.drugName })}
                          >
                            <span className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <div className="rx-empty">
              <span className="material-symbols-rounded">medication</span>
              Belum ada obat yang diresepkan
            </div>
          )}

          {!disabled && (
            <div className="rx-add-row">
              <div className="rx-add-fields">
                <input
                  type="text"
                  placeholder="Nama obat *"
                  value={draft.drugName}
                  onChange={(e) => setDraft((d) => ({ ...d, drugName: e.target.value }))}
                  className="rx-add-drug"
                />
                <input
                  type="text"
                  placeholder="Dosis"
                  value={draft.dosage}
                  onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Frekuensi"
                  value={draft.frequency}
                  onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Durasi"
                  value={draft.duration}
                  onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Jumlah"
                  value={draft.quantity}
                  onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Aturan pakai"
                  value={draft.instructions}
                  onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
                  className="rx-add-instructions"
                />
              </div>
              <button type="button" className="btn-outline rx-add-btn" onClick={handleAdd} disabled={submitting || !draft.drugName.trim()}>
                <span className="material-symbols-rounded">add</span>
                Tambah Obat
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Obat dari Resep?"
        message={`Apakah Anda yakin ingin menghapus "${confirmDelete?.name}" dari resep ini?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
