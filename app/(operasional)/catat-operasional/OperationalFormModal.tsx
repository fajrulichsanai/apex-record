'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import {
  operationalApi,
  OPERASIONAL_KATEGORI_OPTIONS,
  type OperationalRecord,
} from '@/lib/operational';
import { useToast } from '@/lib/toast-context';

const CUSTOM_KATEGORI_VALUE = '__custom__';

interface OperationalFormModalProps {
  initial?: OperationalRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function OperationalFormModal({ initial, onClose, onSaved }: OperationalFormModalProps) {
  const { success, error } = useToast();
  const isEdit = !!initial;

  const initialIsCustomKategori = !!initial && !OPERASIONAL_KATEGORI_OPTIONS.some((o) => o.value === initial.kategori);

  const [tanggal, setTanggal] = useState(initial?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [kategoriSelect, setKategoriSelect] = useState(initialIsCustomKategori ? CUSTOM_KATEGORI_VALUE : (initial?.kategori ?? ''));
  const [kategoriCustom, setKategoriCustom] = useState(initialIsCustomKategori ? initial?.kategori ?? '' : '');
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? '');
  const [nominal, setNominal] = useState(initial ? String(initial.nominal) : '');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const kategoriOptions = [
    ...OPERASIONAL_KATEGORI_OPTIONS,
    { value: CUSTOM_KATEGORI_VALUE, label: 'Lainnya (isi manual)' },
  ];

  const validate = () => {
    const next: Record<string, string> = {};
    if (!tanggal) next.tanggal = 'Tanggal wajib diisi';
    if (!kategoriSelect) next.kategori = 'Kategori wajib dipilih';
    if (kategoriSelect === CUSTOM_KATEGORI_VALUE && !kategoriCustom.trim()) next.kategori = 'Kategori manual wajib diisi';
    if (!deskripsi.trim()) next.deskripsi = 'Deskripsi wajib diisi';
    const nominalNum = Number(nominal);
    if (!nominal || isNaN(nominalNum) || nominalNum <= 0) next.nominal = 'Nominal harus lebih dari 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const kategoriValue = kategoriSelect === CUSTOM_KATEGORI_VALUE ? kategoriCustom.trim() : kategoriSelect;
    const payload = {
      tanggal,
      kategori: kategoriValue,
      deskripsi: deskripsi.trim(),
      nominal: Number(nominal),
    };

    try {
      setSubmitting(true);
      if (isEdit && initial) {
        await operationalApi.update(initial.id, payload);
        success('Catatan operasional telah diperbarui');
      } else {
        await operationalApi.create(payload);
        success('Catatan operasional telah ditambahkan');
      }
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan catatan operasional';
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="op-modal-overlay" onClick={onClose} />
      <div className="op-modal-box">
        <div className="op-modal-header">
          <h2>{isEdit ? 'Edit Operasional' : 'Tambah Operasional'}</h2>
          <button type="button" className="op-modal-close" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="op-modal-body">
          <div className={`op-modal-field ${errors.tanggal ? 'error' : ''}`}>
            <label>Tanggal <span className="required">*</span></label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
            {errors.tanggal && <span className="op-modal-error-text">{errors.tanggal}</span>}
          </div>

          <div className={`op-modal-field ${errors.kategori ? 'error' : ''}`}>
            <label>Kategori <span className="required">*</span></label>
            <CustomSelect
              value={kategoriSelect}
              onChange={setKategoriSelect}
              options={kategoriOptions}
              placeholder="Pilih kategori..."
              error={!!errors.kategori}
            />
            {kategoriSelect === CUSTOM_KATEGORI_VALUE && (
              <input
                type="text"
                placeholder="Tulis kategori..."
                value={kategoriCustom}
                onChange={(e) => setKategoriCustom(e.target.value)}
              />
            )}
            {errors.kategori && <span className="op-modal-error-text">{errors.kategori}</span>}
          </div>

          <div className={`op-modal-field ${errors.deskripsi ? 'error' : ''}`}>
            <label>Deskripsi <span className="required">*</span></label>
            <textarea
              placeholder="Deskripsi pengeluaran operasional..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
            {errors.deskripsi && <span className="op-modal-error-text">{errors.deskripsi}</span>}
          </div>

          <div className={`op-modal-field ${errors.nominal ? 'error' : ''}`}>
            <label>Nominal (Rp) <span className="required">*</span></label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
            />
            {errors.nominal && <span className="op-modal-error-text">{errors.nominal}</span>}
          </div>
        </div>

        <div className="op-modal-footer">
          <button className="btn-outline" type="button" onClick={onClose} disabled={submitting}>
            Batal
          </button>
          <button className="btn-primary" type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </div>
    </>
  );
}
