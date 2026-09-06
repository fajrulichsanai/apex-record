'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { ApiError } from '@/lib/api-client';
import { odontogramApi, type DentalBridge } from '@/lib/odontogram';
import { useToast } from '@/lib/toast-context';
import { ALL_TEETH } from './odontogramData';

interface BridgeManagerProps {
  patientId: number;
  bridges: DentalBridge[];
  onChange: () => void;
}

const TOOTH_OPTIONS = ALL_TEETH.map((t) => ({ value: String(t), label: String(t) }));

/** Gigi Tiruan Cekat (fixed bridge) spans a range of teeth, so it's managed
 * separately from a single tooth's own conditions — a connecting bar is
 * drawn under the affected teeth on the chart. */
export default function BridgeManager({ patientId, bridges, onChange }: BridgeManagerProps) {
  const { success, error } = useToast();
  const [fromTooth, setFromTooth] = useState('');
  const [toTooth, setToTooth] = useState('');
  const [label, setLabel] = useState('Gigi Tiruan Cekat');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; label: string } | null>(null);

  const handleAdd = async () => {
    if (!fromTooth || !toTooth) return;
    try {
      setSubmitting(true);
      await odontogramApi.createBridge(patientId, {
        fromTooth: Number(fromTooth),
        toTooth: Number(toTooth),
        label: label.trim() || 'Gigi Tiruan Cekat',
      });
      success('Bridge berhasil ditambahkan');
      setFromTooth('');
      setToTooth('');
      setLabel('Gigi Tiruan Cekat');
      onChange();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menambah bridge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await odontogramApi.removeBridge(patientId, confirmDelete.id);
      success('Bridge berhasil dihapus');
      setConfirmDelete(null);
      onChange();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus bridge');
    }
  };

  return (
    <div className="odt-bridge-panel">
      <div className="rm-fieldset-title">
        <span className="material-symbols-rounded">link</span>
        Gigi Tiruan Cekat (Bridge)
      </div>

      {bridges.length > 0 ? (
        <div className="odt-bridge-list">
          {bridges.map((b) => (
            <div key={b.id} className="odt-bridge-item">
              <span className="odt-bridge-range">
                {b.fromTooth} – {b.toTooth}
              </span>
              <span className="odt-bridge-label">{b.label}</span>
              <button type="button" className="rx-delete-btn" aria-label="Hapus" onClick={() => setConfirmDelete({ id: b.id, label: b.label })}>
                <span className="material-symbols-rounded">delete</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rm-view-empty">Belum ada bridge</p>
      )}

      <div className="odt-bridge-add">
        <div className="visit-form-field">
          <label>Dari Gigi</label>
          <CustomSelect value={fromTooth} onChange={setFromTooth} options={TOOTH_OPTIONS} placeholder="Pilih..." disabled={submitting} />
        </div>
        <div className="visit-form-field">
          <label>Sampai Gigi</label>
          <CustomSelect value={toTooth} onChange={setToTooth} options={TOOTH_OPTIONS} placeholder="Pilih..." disabled={submitting} />
        </div>
        <div className="visit-form-field">
          <label>Label</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} disabled={submitting} />
        </div>
        <button type="button" className="btn-outline" onClick={handleAdd} disabled={submitting || !fromTooth || !toTooth}>
          <span className="material-symbols-rounded">add</span>
          Tambah
        </button>
      </div>

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Bridge?"
        message={`Apakah Anda yakin ingin menghapus bridge "${confirmDelete?.label}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
