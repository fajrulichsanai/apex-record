'use client';

import { useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { Encounter } from '@/lib/patients';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface PatientSoapModalProps {
  patientName: string;
  encounters: Encounter[];
  onClose: () => void;
}

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  finished: 'Selesai',
  in_progress: 'Sedang Berlangsung',
  arrived: 'Menunggu',
  cancelled: 'Dibatalkan',
};

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PatientSoapModal({ patientName, encounters, onClose }: PatientSoapModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const isMounted = useRef(true);
  const [encounterId, setEncounterId] = useState(encounters[0]?.id.toString() || '');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!encounterId) return;
    let active = true;
    setLoading(true);
    setError(null);
    encounterSoapApi
      .get(Number(encounterId))
      .then((note) => {
        if (!active) return;
        setSubjective(note?.subjective || '');
        setObjective(note?.objective || '');
        setAssessment(note?.assessment || '');
        setPlan(note?.plan || '');
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof ApiError ? err.message : 'Gagal memuat catatan SOAP';
        setError(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [encounterId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const handleOverlayClick = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterId) {
      showError('Pilih kunjungan terlebih dahulu');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await encounterSoapApi.upsert(Number(encounterId), {
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
      });
      if (!isMounted.current) return;
      showSuccess('Catatan SOAP berhasil disimpan');
      onClose();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan catatan SOAP';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const encounterOptions = encounters.map((enc) => ({
    value: enc.id.toString(),
    label: `${formatDateTime(enc.arrivedTime)} · ${enc.practitionerName || 'Dokter tidak diketahui'} · ${ENCOUNTER_STATUS_LABEL[enc.status] ?? enc.status}`,
  }));

  return (
    <div className="list-pasien-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">description</span>
            </div>
            <div>
              <h2>Catatan SOAP</h2>
              <p>Dokumentasi klinis untuk {patientName}</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {encounters.length === 0 ? (
          <div className="modal-body">
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">event_busy</span>
              <div className="empty-title">Belum ada kunjungan</div>
              <div className="empty-sub">
                Pasien ini belum memiliki riwayat kunjungan. Catatan SOAP hanya bisa diisi untuk kunjungan yang sudah tercatat.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-field full">
                <label>Kunjungan *</label>
                <CustomSelect
                  value={encounterId}
                  onChange={setEncounterId}
                  options={encounterOptions}
                  disabled={submitting}
                />
              </div>

              {loading ? (
                <div className="empty-sub">Memuat catatan SOAP…</div>
              ) : (
                <>
                  <div className="form-field full">
                    <label>Subjective</label>
                    <textarea
                      value={subjective}
                      onChange={(e) => setSubjective(e.target.value)}
                      placeholder="Keluhan/cerita pasien menurut pasien sendiri (opsional)"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-field full">
                    <label>Objective</label>
                    <textarea
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Hasil pemeriksaan objektif (opsional)"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-field full">
                    <label>Assessment</label>
                    <textarea
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      placeholder="Diagnosis/penilaian klinis (opsional)"
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-field full">
                    <label>Plan</label>
                    <textarea
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      placeholder="Rencana tindakan/terapi (opsional)"
                      disabled={submitting}
                    />
                  </div>
                </>
              )}

              {error && <div className="field-error">{error}</div>}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting || loading}>
                {submitting ? 'Menyimpan…' : 'Simpan Catatan SOAP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
