'use client';

import { useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { treatmentPlanApi, TreatmentType, TREATMENT_TYPE_LABEL } from '@/lib/treatment-plan';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface AddTreatmentPlanModalProps {
  patientId: number;
  onClose: () => void;
  onCreated: () => void;
}

const TREATMENT_TYPE_OPTIONS = (Object.keys(TREATMENT_TYPE_LABEL) as TreatmentType[]).map((value) => ({
  value,
  label: TREATMENT_TYPE_LABEL[value],
}));

export default function AddTreatmentPlanModal({ patientId, onClose, onCreated }: AddTreatmentPlanModalProps) {
  const { error: showError } = useToast();
  const isMounted = useRef(true);
  const [treatmentType, setTreatmentType] = useState<string>('orthodontic');
  const [label, setLabel] = useState('');
  const [totalStages, setTotalStages] = useState('');
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOverlayClick = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await treatmentPlanApi.create({
        patientId,
        treatmentType: treatmentType as TreatmentType,
        label: label.trim() || undefined,
        totalStages: totalStages ? Number(totalStages) : undefined,
        startDate: startDate || undefined,
      });
      if (!isMounted.current) return;
      onCreated();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal membuat treatment plan';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <div className="list-pasien-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">timeline</span>
            </div>
            <div>
              <h2>Tambah Treatment Plan</h2>
              <p>Mulai pelacakan progress treatment bertahap untuk pasien ini</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field full">
              <label>Jenis Treatment *</label>
              <CustomSelect
                value={treatmentType}
                onChange={setTreatmentType}
                options={TREATMENT_TYPE_OPTIONS}
                disabled={submitting}
              />
            </div>

            <div className="form-field full">
              <label>Label (opsional)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="mis. Behel rahang atas & bawah"
                disabled={submitting}
              />
            </div>

            <div className="form-field">
              <label>Total Tahap (opsional)</label>
              <input
                type="number"
                min={1}
                value={totalStages}
                onChange={(e) => setTotalStages(e.target.value)}
                placeholder="Kosongkan jika belum diketahui"
                disabled={submitting}
              />
            </div>

            <div className="form-field">
              <label>Tanggal Mulai (opsional)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
              />
            </div>

            {error && <div className="field-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan…' : 'Simpan Treatment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
