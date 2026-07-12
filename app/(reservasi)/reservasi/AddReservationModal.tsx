'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { practitionersApi, Practitioner } from '@/lib/practitioners';
import { locationsApi, Location } from '@/lib/locations';
import { reservationsApi } from '@/lib/reservations';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface AddReservationModalProps {
  onClose: () => void;
  onCreated: () => void;
}

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

export default function AddReservationModal({ onClose, onCreated }: AddReservationModalProps) {
  const { error: showError } = useToast();
  const hasLoaded = useRef(false);
  const isMounted = useRef(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [practitionerId, setPractitionerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [jamSlot, setJamSlot] = useState('');
  const [notes, setNotes] = useState('');

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
        const [patientList, practitionerList, locationList] = await Promise.all([
          patientsApi.list(),
          practitionersApi.list(),
          locationsApi.list(),
        ]);
        if (!isMounted.current) return;
        setPatients(patientList);
        setPractitioners(practitionerList);
        setLocations(locationList);
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

  const selectedPatient = useMemo(
    () => (patientId && !isManualEntry ? patients.find((p) => p.id.toString() === patientId) : null),
    [patients, patientId, isManualEntry],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isManualEntry) {
      if (!patientName.trim()) {
        showError('Nama pasien wajib diisi');
        return;
      }
    } else if (!patientId) {
      showError('Pilih pasien dari daftar atau gunakan entri manual');
      return;
    }

    if (!patientPhone.trim()) {
      showError('Nomor telepon wajib diisi');
      return;
    }

    if (!reservationDate) {
      showError('Tanggal reservasi wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await reservationsApi.create({
        patientId: isManualEntry ? undefined : Number(patientId),
        patientName: isManualEntry ? patientName.trim() : selectedPatient?.name || '',
        patientPhone: patientPhone.trim(),
        practitionerId: practitionerId ? Number(practitionerId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
        reservationDate,
        jamSlot: jamSlot || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal menambah reservasi';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const patientOptions = patients.map((p) => ({
    value: p.id.toString(),
    label: `${p.name} ${p.noRm ? `(${p.noRm})` : ''}`,
  }));

  const practitionerOptions = [
    { value: '', label: 'Tanpa preferensi dokter' },
    ...practitioners.map((p) => ({ value: p.id.toString(), label: p.name })),
  ];

  const locationOptions = [
    { value: '', label: 'Tanpa preferensi lokasi' },
    ...locations.map((l) => ({ value: l.id.toString(), label: l.name })),
  ];

  return (
    <div className="reservation-modal-overlay" onClick={handleOverlayClick}>
      <div className="reservation-modal-box">
        <div className="reservation-modal-header">
          <div>
            <h2>Tambah Reservasi</h2>
          </div>
          <button
            type="button"
            className="reservation-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0AEC0' }}>
            <div style={{ fontSize: '14px' }}>Memuat data...</div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="reservation-modal-body">
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="entryType"
                    checked={!isManualEntry}
                    onChange={() => {
                      setIsManualEntry(false);
                      setPatientName('');
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#6B7A99' }}>Pilih dari daftar</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="entryType"
                    checked={isManualEntry}
                    onChange={() => {
                      setIsManualEntry(true);
                      setPatientId('');
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#6B7A99' }}>Entri manual (telepon)</span>
                </label>
              </div>

              {!isManualEntry ? (
                <div className="reservation-form-group">
                  <label className="reservation-form-label">
                    Pilih Pasien <span className="req">*</span>
                  </label>
                  <CustomSelect
                    value={patientId}
                    onChange={setPatientId}
                    options={patientOptions}
                    placeholder="Cari dan pilih pasien..."
                  />
                  {selectedPatient && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#F5F6FA',
                        borderRadius: '8px',
                        marginTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg,#4F7EF8,#3B6CE6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}
                      >
                        {initialsFromName(selectedPatient.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A2340' }}>
                          {selectedPatient.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '2px' }}>
                          {selectedPatient.noRm && `RM: ${selectedPatient.noRm}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="reservation-form-group">
                  <label className="reservation-form-label">
                    Nama Pasien <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="reservation-form-input"
                    placeholder="Masukkan nama pasien"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="reservation-form-group">
                <label className="reservation-form-label">
                  Nomor Telepon <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  className="reservation-form-input"
                  placeholder="08xx xxxx xxxx"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="reservation-form-row">
                <div className="reservation-form-group">
                  <label className="reservation-form-label">
                    Tanggal Reservasi <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    className="reservation-form-input"
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="reservation-form-group">
                  <label className="reservation-form-label">Jam</label>
                  <input
                    type="time"
                    className="reservation-form-input"
                    value={jamSlot}
                    onChange={(e) => setJamSlot(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="reservation-form-row">
                <div className="reservation-form-group">
                  <label className="reservation-form-label">Dokter</label>
                  <CustomSelect
                    value={practitionerId}
                    onChange={setPractitionerId}
                    options={practitionerOptions}
                    placeholder="Pilih dokter..."
                  />
                </div>
                <div className="reservation-form-group">
                  <label className="reservation-form-label">Lokasi</label>
                  <CustomSelect
                    value={locationId}
                    onChange={setLocationId}
                    options={locationOptions}
                    placeholder="Pilih lokasi..."
                  />
                </div>
              </div>

              <div className="reservation-form-group">
                <label className="reservation-form-label">Catatan</label>
                <textarea
                  className="reservation-form-textarea"
                  placeholder="Catatan atau keluhan pasien..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {error && (
                <div style={{ padding: '10px', background: 'rgba(255,77,79,.08)', color: '#FF4D4F', borderRadius: '6px', fontSize: '12px' }}>
                  {error}
                </div>
              )}
            </form>

            <div className="reservation-modal-footer">
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Menambahkan...' : 'Tambah Reservasi'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
