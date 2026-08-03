'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { practitionersApi, Practitioner } from '@/lib/practitioners';
import { reservationsApi, ReservationItem } from '@/lib/reservations';
import { encounterApi } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface AddVisitModalProps {
  preselectReservationId?: number | null;
  onClose: () => void;
  onCreated: (encounterId: number) => void;
}

const STEPS = [
  { id: 1, label: 'Pasien', icon: 'person' },
  { id: 2, label: 'Detail', icon: 'medical_services' },
  { id: 3, label: 'Catatan SOAP', icon: 'description' },
  { id: 4, label: 'Konfirmasi', icon: 'task_alt' },
];

function initialsFromName(name?: string) {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function AddVisitModal({ preselectReservationId, onClose, onCreated }: AddVisitModalProps) {
  const { error: showError } = useToast();
  const hasLoaded = useRef(false);
  const isMounted = useRef(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [confirmedReservations, setConfirmedReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [reservationId, setReservationId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
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
        const [patientList, practitionerList, reservationRes] = await Promise.all([
          patientsApi.list(),
          practitionersApi.list(),
          reservationsApi.list({ status: 'confirmed' }),
        ]);
        if (!isMounted.current) return;
        setPatients(patientList);
        setPractitioners(practitionerList);
        const withPatient = reservationRes.data.filter((r) => !!r.patientId);
        setConfirmedReservations(withPatient);

        if (preselectReservationId) {
          const reservation = withPatient.find((r) => r.id === preselectReservationId);
          if (reservation) {
            setReservationId(reservation.id.toString());
            if (reservation.patientId) setPatientId(reservation.patientId.toString());
            if (reservation.notes) setChiefComplaint(reservation.notes);
            if (reservation.practitionerId) setPractitionerId(reservation.practitionerId.toString());
            setStep(2);
          }
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

  const selectedReservation = useMemo(
    () =>
      reservationId
        ? confirmedReservations.find((r) => r.id.toString() === reservationId)
        : null,
    [confirmedReservations, reservationId],
  );

  const handleSelectReservation = (value: string) => {
    setReservationId(value);
    if (value) {
      const reservation = confirmedReservations.find((r) => r.id.toString() === value);
      if (reservation?.patientId) setPatientId(reservation.patientId.toString());
      if (reservation?.notes) setChiefComplaint(reservation.notes);
      if (reservation?.practitionerId) setPractitionerId(reservation.practitionerId.toString());
    } else {
      setPatientId('');
      setChiefComplaint('');
      setPractitionerId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !practitionerId) {
      showError('Pasien dan dokter wajib dipilih');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await encounterApi.create({
        patientId: Number(patientId),
        practitionerId: Number(practitionerId),
        reservationId: reservationId ? Number(reservationId) : undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
      });

      const hasSoapNote =
        soapSubjective.trim() || soapObjective.trim() || soapAssessment.trim() || soapPlan.trim();
      if (hasSoapNote) {
        await encounterSoapApi.upsert(created.id, {
          subjective: soapSubjective.trim() || undefined,
          objective: soapObjective.trim() || undefined,
          assessment: soapAssessment.trim() || undefined,
          plan: soapPlan.trim() || undefined,
        });
      }

      onCreated(created.id);
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal membuat kunjungan';
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

  const reservationOptions = confirmedReservations.map((r) => ({
    value: r.id.toString(),
    label: `${r.patientName} · ${r.reservationDate}${r.jamSlot ? ` ${r.jamSlot}` : ''}`,
  }));

  const selectedPatient = patientId ? patients.find((p) => p.id.toString() === patientId) : null;
  const selectedPractitioner = practitionerId ? practitioners.find((p) => p.id.toString() === practitionerId) : null;

  const canGoStep2 = !!patientId;
  const canGoStep3 = !!patientId && !!practitionerId;
  const canGoStep4 = canGoStep3;

  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="visit-modal-overlay" onClick={handleOverlayClick}>
      <div className="visit-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="visit-modal-header">
          <div>
            <h2>Buat Kunjungan Baru</h2>
            <p>Daftarkan kunjungan pasien ke klinik Anda</p>
          </div>
          <button className="visit-modal-close" type="button" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="visit-form-card">
          <div className="visit-stepper-wrap">
            <div className="visit-stepper">
              {STEPS.map((s, idx) => (
                <div className={`visit-step ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`} key={s.id}>
                  {idx < STEPS.length - 1 && (
                    <div className={`visit-step-line ${step > s.id ? 'filled' : ''}`} style={{ left: '50%' }} />
                  )}
                  <div className="visit-step-dot">
                    {step > s.id ? <span className="material-symbols-rounded">check</span> : s.id}
                  </div>
                  <span className="visit-step-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="visit-form-loading">
              <div className="spinner" />
              <p>Memuat data…</p>
            </div>
          ) : error && !submitting && patients.length === 0 ? (
            <div className="visit-form-error">
              <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#FF4D4F' }}>
                error
              </span>
              <p>{error}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="visit-form-body">
                {step === 1 && (
                  <>
                    <div className="visit-step-heading">
                      <h3>Pilih Pasien</h3>
                      <p>Check-in dari reservasi yang sudah dikonfirmasi, atau cari pasien secara manual (walk-in)</p>
                    </div>

                    {reservationOptions.length > 0 && (
                      <div className="visit-form-field">
                        <label>
                          <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                            event_available
                          </span>
                          Dari Reservasi (opsional)
                        </label>
                        <CustomSelect
                          value={reservationId}
                          onChange={handleSelectReservation}
                          options={[{ value: '', label: 'Tidak dari reservasi (walk-in)' }, ...reservationOptions]}
                          disabled={submitting}
                        />
                        {selectedReservation && (
                          <div className="visit-queue-banner">
                            <span className="material-symbols-rounded">confirmation_number</span>
                            <div>
                              <div className="visit-queue-banner-text">Reservasi {selectedReservation.patientName}</div>
                              <div className="visit-queue-banner-sub">
                                Data pasien & dokter otomatis terisi dari reservasi ini
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                        disabled={!!selectedReservation || submitting}
                      />
                      {selectedPatient && (
                        <div className="visit-preview-card">
                          <div className="visit-preview-avatar">{initialsFromName(selectedPatient.name)}</div>
                          <div className="visit-preview-info">
                            <div className="visit-preview-name">{selectedPatient.name}</div>
                            <div className="visit-preview-sub">{selectedPatient.noRm || 'No. RM belum tersedia'}</div>
                          </div>
                          <div className="visit-preview-check">
                            <span className="material-symbols-rounded">check</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="visit-step-heading">
                      <h3>Detail Kunjungan</h3>
                      <p>Tentukan dokter yang menangani dan keluhan utama pasien</p>
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
                      {selectedPractitioner && (
                        <div className="visit-preview-card">
                          <div className="visit-preview-avatar dokter">{initialsFromName(selectedPractitioner.name)}</div>
                          <div className="visit-preview-info">
                            <div className="visit-preview-name">{selectedPractitioner.name}</div>
                            <div className="visit-preview-sub">Dokter Pemeriksa</div>
                          </div>
                          <div className="visit-preview-check">
                            <span className="material-symbols-rounded">check</span>
                          </div>
                        </div>
                      )}
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
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="visit-step-heading">
                      <h3>Catatan SOAP</h3>
                      <p>Dokumentasi klinis kunjungan (opsional, bisa dilengkapi kemudian)</p>
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
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="visit-step-heading">
                      <h3>Konfirmasi Kunjungan</h3>
                      <p>Periksa kembali data sebelum menyimpan kunjungan</p>
                    </div>

                    <div className="visit-summary-list">
                      <div className="visit-summary-row">
                        <div className="visit-summary-icon">
                          <span className="material-symbols-rounded">person</span>
                        </div>
                        <div className="visit-summary-body">
                          <div className="visit-summary-label">Pasien</div>
                          <div className="visit-summary-value">{selectedPatient?.name || '—'}</div>
                        </div>
                      </div>
                      <div className="visit-summary-row">
                        <div className="visit-summary-icon">
                          <span className="material-symbols-rounded">medical_services</span>
                        </div>
                        <div className="visit-summary-body">
                          <div className="visit-summary-label">Dokter</div>
                          <div className="visit-summary-value">{selectedPractitioner?.name || '—'}</div>
                        </div>
                      </div>
                      <div className="visit-summary-row">
                        <div className="visit-summary-icon">
                          <span className="material-symbols-rounded">edit_note</span>
                        </div>
                        <div className="visit-summary-body">
                          <div className="visit-summary-label">Keluhan Utama</div>
                          <div className={`visit-summary-value ${!chiefComplaint ? 'muted' : ''}`}>
                            {chiefComplaint || 'Tidak ada keluhan dicatat'}
                          </div>
                        </div>
                      </div>
                      <div className="visit-summary-row">
                        <div className="visit-summary-icon">
                          <span className="material-symbols-rounded">description</span>
                        </div>
                        <div className="visit-summary-body">
                          <div className="visit-summary-label">Catatan SOAP</div>
                          <div
                            className={`visit-summary-value ${
                              !soapSubjective && !soapObjective && !soapAssessment && !soapPlan ? 'muted' : ''
                            }`}
                          >
                            {soapSubjective || soapObjective || soapAssessment || soapPlan
                              ? 'S/O/A/P terisi'
                              : 'Belum diisi'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="visit-confirm-banner">
                      <span className="material-symbols-rounded">verified</span>
                      <span className="visit-confirm-banner-text">
                        Kunjungan akan tercatat dengan status &ldquo;Menunggu&rdquo;
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="visit-form-footer">
                {step > 1 ? (
                  <button type="button" className="btn-outline" onClick={goBack} disabled={submitting}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      arrow_back
                    </span>
                    Kembali
                  </button>
                ) : (
                  <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                    Batal
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={goNext}
                    disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3) || (step === 3 && !canGoStep4)}
                  >
                    Lanjut
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      arrow_forward
                    </span>
                  </button>
                ) : (
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      check_circle
                    </span>
                    {submitting ? 'Menyimpan…' : 'Simpan Kunjungan'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
