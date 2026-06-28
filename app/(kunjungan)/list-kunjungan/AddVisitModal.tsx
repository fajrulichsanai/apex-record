'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { practitionersApi, Practitioner } from '@/lib/practitioners';
import { locationsApi, Location } from '@/lib/locations';
import { queuesApi, QueueItem } from '@/lib/queues';
import { encounterApi } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface AddVisitModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const STEPS = [
  { id: 1, label: 'Pasien' },
  { id: 2, label: 'Detail' },
  { id: 3, label: 'Konfirmasi' },
];

export default function AddVisitModal({ onClose, onCreated }: AddVisitModalProps) {
  const { error: showError } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [queueId, setQueueId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [patientList, practitionerList, locationList, queueRes] = await Promise.all([
        patientsApi.list(),
        practitionersApi.list(),
        locationsApi.list(true),
        queuesApi.list({ status: 'waiting' }),
      ]);
      setPatients(patientList);
      setPractitioners(practitionerList);
      setLocations(locationList);
      setWaitingQueue(queueRes.data);
      if (locationList[0]) setLocationId(locationList[0].id.toString());
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memuat data';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedQueue = useMemo(
    () => (queueId ? waitingQueue.find((q) => q.id.toString() === queueId) : null),
    [waitingQueue, queueId],
  );

  const handleSelectQueue = (value: string) => {
    setQueueId(value);
    if (value) {
      const queue = waitingQueue.find((q) => q.id.toString() === value);
      if (queue?.patientId) setPatientId(queue.patientId.toString());
      if (queue?.chiefComplaint) setChiefComplaint(queue.chiefComplaint);
      if (queue?.practitionerId) setPractitionerId(queue.practitionerId.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !practitionerId || !locationId) {
      showError('Pasien, dokter, dan lokasi wajib dipilih');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await encounterApi.create({
        patientId: Number(patientId),
        practitionerId: Number(practitionerId),
        locationId: Number(locationId),
        queueId: queueId ? Number(queueId) : undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal membuat kunjungan';
      setError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p.id.toString(),
    label: `${p.name} ${p.noRm ? `(${p.noRm})` : ''}`,
  }));

  const practitionerOptions = practitioners.map((d) => ({
    value: d.id.toString(),
    label: d.name,
  }));

  const queueOptions = waitingQueue.map((q) => ({
    value: q.id.toString(),
    label: `${q.nomorAntrian} · ${q.patientName || `Pasien #${q.patientId}`}`,
  }));

  const selectedPatient = patientId ? patients.find((p) => p.id.toString() === patientId) : null;
  const selectedPractitioner = practitionerId ? practitioners.find((p) => p.id.toString() === practitionerId) : null;

  const canGoStep2 = !!patientId;
  const canGoStep3 = !!patientId && !!practitionerId && !!locationId;

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="visit-wizard-overlay" onClick={onClose}>
      <div className="visit-wizard-box" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <div>
            <h2>Buat Kunjungan Baru</h2>
            <p>Daftarkan kunjungan pasien ke klinik Anda</p>
          </div>
          <button className="wizard-close" type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="wizard-steps">
          {STEPS.map((s, idx) => (
            <div className="wizard-step-item" key={s.id}>
              <div className={`wizard-step-dot ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}>
                {step > s.id ? <span className="material-symbols-rounded">check</span> : s.id}
              </div>
              <span className={`wizard-step-label ${step === s.id ? 'active' : ''}`}>{s.label}</span>
              {idx < STEPS.length - 1 && <div className={`wizard-step-line ${step > s.id ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="wizard-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            Memuat data…
          </div>
        ) : error && !submitting && patients.length === 0 ? (
          <div className="wizard-body" style={{ textAlign: 'center', padding: '40px 24px', color: '#FF4D4F' }}>
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="wizard-body">
              {step === 1 && (
                <div className="wizard-fields">
                  {queueOptions.length > 0 && (
                    <div className="wizard-field">
                      <label>Dari Antrian (opsional)</label>
                      <CustomSelect
                        value={queueId}
                        onChange={handleSelectQueue}
                        options={[{ value: '', label: 'Tidak dari antrian (walk-in)' }, ...queueOptions]}
                        disabled={submitting}
                      />
                    </div>
                  )}
                  <div className="wizard-field">
                    <label>Pasien *</label>
                    <CustomSelect
                      value={patientId}
                      onChange={setPatientId}
                      options={patientOptions}
                      placeholder="Pilih pasien…"
                      disabled={!!selectedQueue || submitting}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="wizard-fields">
                  <div className="wizard-field">
                    <label>Dokter *</label>
                    <CustomSelect
                      value={practitionerId}
                      onChange={setPractitionerId}
                      options={practitionerOptions}
                      placeholder="Pilih dokter…"
                      disabled={submitting}
                    />
                  </div>
                  <div className="wizard-field">
                    <label>Keluhan Utama</label>
                    <textarea
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Keluhan utama pasien (opsional)"
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="wizard-summary">
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Pasien</span>
                    <span className="wizard-summary-value">{selectedPatient?.name || '—'}</span>
                  </div>
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Dokter</span>
                    <span className="wizard-summary-value">{selectedPractitioner?.name || '—'}</span>
                  </div>
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Keluhan</span>
                    <span className="wizard-summary-value">{chiefComplaint || '—'}</span>
                  </div>
                </div>
              )}

            </div>

            <div className="wizard-footer">
              {step > 1 ? (
                <button type="button" className="btn-outline" onClick={goBack} disabled={submitting}>
                  Kembali
                </button>
              ) : (
                <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                  Batal
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={goNext}
                  disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
                >
                  Lanjut
                  <span className="material-symbols-rounded">arrow_forward</span>
                </button>
              ) : (
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <span className="material-symbols-rounded">check_circle</span>
                  {submitting ? 'Menyimpan…' : 'Simpan Kunjungan'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
