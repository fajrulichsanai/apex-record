'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { practitionersApi, Practitioner } from '@/lib/practitioners';
import { locationsApi, Location } from '@/lib/locations';
import { queuesApi, QueueItem } from '@/lib/queues';
import { encounterApi } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';

interface AddVisitModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddVisitModal({ onClose, onCreated }: AddVisitModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof ApiError ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError('Pasien, dokter, dan lokasi wajib dipilih');
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
      setError(err instanceof ApiError ? err.message : 'Gagal membuat kunjungan');
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

  const locationOptions = locations.map((l) => ({
    value: l.id.toString(),
    label: l.name,
  }));

  const queueOptions = waitingQueue.map((q) => ({
    value: q.id.toString(),
    label: `${q.nomorAntrian} · ${q.patientName || `Pasien #${q.patientId}`}`,
  }));

  const selectedPatient = patientId ? patients.find((p) => p.id.toString() === patientId) : null;
  const selectedPractitioner = practitionerId ? practitioners.find((p) => p.id.toString() === practitionerId) : null;
  const selectedLocation = locationId ? locations.find((l) => l.id.toString() === locationId) : null;

  return (
    <div className="kunjungan-modal-overlay" onClick={onClose}>
      <div className="kunjungan-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">event_note</span>
            </div>
            <div>
              <h2>Buat Kunjungan Baru</h2>
              <p>Daftarkan kunjungan pasien ke klinik Anda</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            Memuat data…
          </div>
        ) : error && !submitting ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '40px 24px', color: '#FF4D4F' }}>
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="preview-card">
                <div className="preview-info">
                  {selectedPatient && <div className="preview-patient">{selectedPatient.name}</div>}
                  {selectedPractitioner && (
                    <div className="preview-practitioner">
                      <span className="material-symbols-rounded">person</span>
                      {selectedPractitioner.name}
                    </div>
                  )}
                  {selectedLocation && (
                    <div className="preview-location">
                      <span className="material-symbols-rounded">location_on</span>
                      {selectedLocation.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                {queueOptions.length > 0 && (
                  <div className="form-field full">
                    <label>Dari Antrian (opsional)</label>
                    <CustomSelect
                      value={queueId}
                      onChange={handleSelectQueue}
                      options={[{ value: '', label: 'Tidak dari antrian (walk-in)' }, ...queueOptions]}
                      disabled={submitting}
                    />
                  </div>
                )}

                <div className="form-field full">
                  <label>Pasien *</label>
                  <CustomSelect
                    value={patientId}
                    onChange={setPatientId}
                    options={patientOptions}
                    placeholder="Pilih pasien…"
                    disabled={!!selectedQueue || submitting}
                  />
                </div>

                <div className="form-field">
                  <label>Dokter *</label>
                  <CustomSelect
                    value={practitionerId}
                    onChange={setPractitionerId}
                    options={practitionerOptions}
                    placeholder="Pilih dokter…"
                    disabled={submitting}
                  />
                </div>

                <div className="form-field">
                  <label>Lokasi *</label>
                  <CustomSelect
                    value={locationId}
                    onChange={setLocationId}
                    options={locationOptions}
                    placeholder="Pilih lokasi…"
                    disabled={submitting}
                  />
                </div>

                <div className="form-field full">
                  <label>Keluhan Utama</label>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Keluhan utama pasien (opsional)"
                    disabled={submitting}
                  />
                </div>
              </div>

              {error && submitting === false && (
                <div style={{ color: '#FF4D4F', fontSize: '13px', marginTop: '8px' }}>{error}</div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                <span className="material-symbols-rounded">check_circle</span>
                {submitting ? 'Menyimpan…' : 'Simpan Kunjungan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
