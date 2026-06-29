'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { patientsApi, Patient } from '@/lib/patients';
import { queuesApi } from '@/lib/queues';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface AddQueueModalProps {
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

export default function AddQueueModal({ onClose, onCreated }: AddQueueModalProps) {
  const { error: showError } = useToast();
  const hasLoaded = useRef(false);
  const isMounted = useRef(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);

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
        const patientList = await patientsApi.list();
        if (!isMounted.current) return;
        setPatients(patientList);
      } catch (err) {
        if (!isMounted.current) return;
        const msg = err instanceof ApiError ? err.message : 'Gagal memuat data pasien';
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
    } else {
      if (!patientId) {
        showError('Pilih pasien dari daftar atau gunakan entri manual');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      await queuesApi.create({
        patientId: isManualEntry ? undefined : Number(patientId),
        patientName: isManualEntry ? patientName.trim() : undefined,
        phone: phone.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
        isFirstVisit: isFirstVisit,
      });
      onCreated();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal menambah antrian';
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

  return (
    <div className="queue-modal-overlay" onClick={handleOverlayClick}>
      <div className="queue-modal-box">
        <div className="queue-modal-header">
          <div>
            <h2>Tambah Antrian</h2>
          </div>
          <button
            type="button"
            className="queue-modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#A0AEC0' }}>
            <div style={{ fontSize: '14px' }}>Memuat data pasien...</div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="queue-modal-body">
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
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
                    <span style={{ fontSize: '13px', color: '#6B7A99' }}>Entri manual (walk-in)</span>
                  </label>
                </div>
              </div>

              {!isManualEntry ? (
                <div className="queue-form-group">
                  <label className="queue-form-label">
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
                <>
                  <div className="queue-form-group">
                    <label className="queue-form-label">
                      Nama Pasien <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="queue-form-input"
                      placeholder="Masukkan nama pasien"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="queue-form-group">
                    <label className="queue-form-label">Nomor Telepon</label>
                    <input
                      type="tel"
                      className="queue-form-input"
                      placeholder="08xx xxxx xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </>
              )}

              <div className="queue-form-group">
                <label className="queue-form-label">Keluhan Utama</label>
                <textarea
                  className="queue-form-textarea"
                  placeholder="Deskripsi keluhan atau kondisi pasien..."
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="queue-form-checkbox">
                <input
                  type="checkbox"
                  id="isFirstVisit"
                  checked={isFirstVisit}
                  onChange={(e) => setIsFirstVisit(e.target.checked)}
                  disabled={submitting}
                />
                <label htmlFor="isFirstVisit">Kunjungan pertama kali ke klinik</label>
              </div>

              {error && (
                <div style={{ padding: '10px', background: 'rgba(255,77,79,.08)', color: '#FF4D4F', borderRadius: '6px', fontSize: '12px' }}>
                  {error}
                </div>
              )}
            </form>

            <div className="queue-modal-footer">
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Menambahkan...' : 'Tambah Antrian'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
