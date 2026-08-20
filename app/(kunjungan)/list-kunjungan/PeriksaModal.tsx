'use client';

import { useEffect, useRef, useState } from 'react';
import SignaturePad from '@/components/form/SignaturePad';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface PeriksaModalProps {
  visit: EncounterDetail;
  practitionerName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PeriksaModal({ visit, practitionerName, onClose, onSaved }: PeriksaModalProps) {
  const { error: showError } = useToast();
  const isMounted = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    encounterSoapApi
      .get(visit.id)
      .then((note) => {
        if (!isMounted.current || !note) return;
        setSubjective(note.subjective || '');
        setObjective(note.objective || '');
        setAssessment(note.assessment || '');
        setPlan(note.plan || '');
        setSignature(note.signature || null);
      })
      .catch(() => {});
  }, [visit.id]);

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
    if (!signature) {
      showError('Tanda tangan dokter wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await encounterSoapApi.upsert(visit.id, {
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        signature,
      });

      if (visit.status === 'arrived') {
        await encounterApi.updateStatus(visit.id, { status: 'in_progress' });
      }

      onSaved();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <div className="visit-modal-overlay" onClick={handleOverlayClick}>
      <div className="visit-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="visit-modal-header">
          <div>
            <h2>Mulai Periksa</h2>
            <p>Isi catatan SOAP dan tanda tangan untuk memulai pemeriksaan</p>
          </div>
          <button className="visit-modal-close" type="button" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="visit-form-card">
          <form onSubmit={handleSubmit}>
            <div className="visit-form-body">
              <div className="visit-form-field">
                <label>
                  <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                    medical_services
                  </span>
                  Dokter Pemeriksa
                </label>
                <input type="text" value={practitionerName || '—'} disabled readOnly className="visit-readonly-input" />
              </div>

              <div className="visit-form-field">
                <label>Subjective</label>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Keluhan/cerita pasien menurut pasien sendiri (opsional)"
                  disabled={submitting}
                />
              </div>

              <div className="visit-form-field">
                <label>Objective</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Hasil pemeriksaan objektif (opsional)"
                  disabled={submitting}
                />
              </div>

              <div className="visit-form-field">
                <label>Assessment</label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  placeholder="Diagnosis/penilaian klinis (opsional)"
                  disabled={submitting}
                />
              </div>

              <div className="visit-form-field">
                <label>Plan</label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Rencana tindakan/terapi (opsional)"
                  disabled={submitting}
                />
              </div>

              <div className="visit-form-field">
                <label>
                  Tanda Tangan Dokter <span className="req">*</span>
                </label>
                <SignaturePad value={signature || undefined} onChange={setSignature} disabled={submitting} />
              </div>

              {error && <div style={{ color: '#FF4D4F', fontSize: '13px' }}>{error}</div>}
            </div>

            <div className="visit-form-footer">
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  check_circle
                </span>
                {submitting ? 'Menyimpan…' : 'Simpan & Mulai Periksa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
