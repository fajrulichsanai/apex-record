'use client';

import { useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { practitionersApi, Practitioner } from '@/lib/practitioners';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface EditVisitModalProps {
  visit: EncounterDetail;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditVisitModal({ visit, onClose, onUpdated }: EditVisitModalProps) {
  const { error: showError } = useToast();
  const isMounted = useRef(true);
  const hasLoaded = useRef(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState(visit.patientId.toString());
  const [practitionerId, setPractitionerId] = useState(visit.practitionerId.toString());
  const [chiefComplaint, setChiefComplaint] = useState(visit.chiefComplaint || '');
  const [soapSubjective, setSoapSubjective] = useState('');
  const [soapObjective, setSoapObjective] = useState('');
  const [soapAssessment, setSoapAssessment] = useState('');
  const [soapPlan, setSoapPlan] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    (async () => {
      try {
        setLoading(true);
        const [patientList, practitionerList, soapNote] = await Promise.all([
          patientsApi.list(),
          practitionersApi.list(),
          encounterSoapApi.get(visit.id).catch(() => null),
        ]);
        if (!isMounted.current) return;
        setPatients(patientList);
        setPractitioners(practitionerList);
        if (soapNote) {
          setSoapSubjective(soapNote.subjective || '');
          setSoapObjective(soapNote.objective || '');
          setSoapAssessment(soapNote.assessment || '');
          setSoapPlan(soapNote.plan || '');
        }
      } catch (err) {
        if (!isMounted.current) return;
        const msg = err instanceof ApiError ? err.message : 'Gagal memuat data';
        setError(msg);
        showError(msg);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    })();
  }, [showError]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !practitionerId) {
      showError('Pasien dan dokter wajib dipilih');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await encounterApi.update(visit.id, {
        patientId: Number(patientId),
        practitionerId: Number(practitionerId),
        chiefComplaint: chiefComplaint.trim() || undefined,
      });

      const hasSoapNote =
        soapSubjective.trim() || soapObjective.trim() || soapAssessment.trim() || soapPlan.trim();
      if (hasSoapNote) {
        await encounterSoapApi.upsert(visit.id, {
          subjective: soapSubjective.trim() || undefined,
          objective: soapObjective.trim() || undefined,
          assessment: soapAssessment.trim() || undefined,
          plan: soapPlan.trim() || undefined,
        });
      }

      onUpdated();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui kunjungan';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleOverlayClick = () => {
    if (!submitting) onClose();
  };

  const patientOptions = patients.map((p) => ({
    value: p.id.toString(),
    label: `${p.name} ${p.noRm ? `(${p.noRm})` : ''}`,
  }));

  const practitionerOptions = practitioners.map((d) => ({
    value: d.id.toString(),
    label: d.name,
  }));

  return (
    <div className="visit-modal-overlay" onClick={handleOverlayClick}>
      <div className="visit-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="visit-modal-header">
          <div>
            <h2>Edit Kunjungan</h2>
            <p>Perbarui data kunjungan pasien</p>
          </div>
          <button className="visit-modal-close" type="button" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="visit-form-card">
          {loading ? (
            <div className="visit-form-loading">
              <div className="spinner" />
              <p>Memuat data…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="visit-form-body">
                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      person
                    </span>
                    Pasien <span className="req">*</span>
                  </label>
                  <CustomSelect
                    value={patientId}
                    onChange={setPatientId}
                    options={patientOptions}
                    placeholder="Cari & pilih pasien…"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      medical_services
                    </span>
                    Dokter <span className="req">*</span>
                  </label>
                  <CustomSelect
                    value={practitionerId}
                    onChange={setPractitionerId}
                    options={practitionerOptions}
                    placeholder="Pilih dokter…"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      edit_note
                    </span>
                    Keluhan Utama
                  </label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Keluhan utama pasien (opsional)"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      record_voice_over
                    </span>
                    Subjective
                  </label>
                  <textarea
                    value={soapSubjective}
                    onChange={(e) => setSoapSubjective(e.target.value)}
                    placeholder="Keluhan/cerita pasien menurut pasien sendiri (opsional)"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      monitor_heart
                    </span>
                    Objective
                  </label>
                  <textarea
                    value={soapObjective}
                    onChange={(e) => setSoapObjective(e.target.value)}
                    placeholder="Hasil pemeriksaan objektif (opsional)"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      fact_check
                    </span>
                    Assessment
                  </label>
                  <textarea
                    value={soapAssessment}
                    onChange={(e) => setSoapAssessment(e.target.value)}
                    placeholder="Diagnosis/penilaian klinis (opsional)"
                    disabled={submitting}
                  />
                </div>

                <div className="visit-form-field">
                  <label>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                      checklist
                    </span>
                    Plan
                  </label>
                  <textarea
                    value={soapPlan}
                    onChange={(e) => setSoapPlan(e.target.value)}
                    placeholder="Rencana tindakan/terapi (opsional)"
                    disabled={submitting}
                  />
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
                  {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
