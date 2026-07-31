'use client';

import { useEffect, useRef, useState } from 'react';
import { reservationsApi, ReservationItem } from '@/lib/reservations';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';

interface EditReservationModalProps {
  reservation: ReservationItem;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditReservationModal({ reservation, onClose, onUpdated }: EditReservationModalProps) {
  const { error: showError } = useToast();
  const isMounted = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationDate, setReservationDate] = useState(reservation.reservationDate.slice(0, 10));
  const [jamSlot, setJamSlot] = useState(reservation.jamSlot ? reservation.jamSlot.slice(0, 5) : '');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservationDate) {
      showError('Tanggal reservasi wajib diisi');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await reservationsApi.reschedule(reservation.id, {
        reservationDate,
        jamSlot: jamSlot || undefined,
      });
      onUpdated();
    } catch (err) {
      if (!isMounted.current) return;
      const msg = err instanceof ApiError ? err.message : 'Gagal mengubah jadwal reservasi';
      setError(msg);
      showError(msg);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  return (
    <div className="reservation-modal-overlay" onClick={handleOverlayClick}>
      <div className="reservation-modal-box">
        <div className="reservation-modal-header">
          <div>
            <h2>Ubah Jadwal Reservasi</h2>
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

        <form onSubmit={handleSubmit} className="reservation-modal-body">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#F5F6FA',
              borderRadius: '8px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A2340' }}>
                {reservation.patientName}
              </div>
              <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '2px' }}>
                {reservation.patientPhone}
              </div>
            </div>
          </div>

          <div className="reservation-form-row">
            <div className="reservation-form-group">
              <label className="reservation-form-label">
                Tanggal Baru <span className="req">*</span>
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
            {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
          </button>
        </div>
      </div>
    </div>
  );
}
