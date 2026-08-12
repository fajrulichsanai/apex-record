'use client';

import { useEffect, useRef, useState } from 'react';
import { Encounter } from '@/lib/patients';
import { encounterSoapApi, SoapNote } from '@/lib/encounter-soap';

interface PatientSoapModalProps {
  patientName: string;
  encounters: Encounter[];
  onClose: () => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface SoapRow {
  encounter: Encounter;
  note: SoapNote | null;
}

export default function PatientSoapModal({ patientName, encounters, onClose }: PatientSoapModalProps) {
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SoapRow[]>([]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (encounters.length === 0) {
      setLoading(false);
      setRows([]);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all(
      encounters.map((encounter) =>
        encounterSoapApi
          .get(encounter.id)
          .then((note) => ({ encounter, note }))
          .catch(() => ({ encounter, note: null })),
      ),
    ).then((results) => {
      if (!active) return;
      const sorted = [...results].sort(
        (a, b) => new Date(b.encounter.arrivedTime).getTime() - new Date(a.encounter.arrivedTime).getTime(),
      );
      setRows(sorted);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [encounters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const rowsWithNote = rows.filter((r) => r.note && (r.note.subjective || r.note.objective || r.note.assessment || r.note.plan));

  return (
    <div className="list-pasien-modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 960 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">description</span>
            </div>
            <div>
              <h2>Riwayat Catatan SOAP</h2>
              <p>Dokumentasi klinis untuk {patientName}</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="empty-sub">Memuat catatan SOAP…</div>
          ) : encounters.length === 0 ? (
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">event_busy</span>
              <div className="empty-title">Belum ada kunjungan</div>
              <div className="empty-sub">
                Pasien ini belum memiliki riwayat kunjungan, sehingga belum ada catatan SOAP.
              </div>
            </div>
          ) : rowsWithNote.length === 0 ? (
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">description</span>
              <div className="empty-title">Belum ada catatan SOAP</div>
              <div className="empty-sub">
                Catatan SOAP diisi saat membuat kunjungan baru. Belum ada kunjungan dengan catatan SOAP terisi.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="soap-history-table">
                <thead>
                  <tr>
                    <th>Tanggal Kunjungan</th>
                    <th>Dokter</th>
                    <th>Subjective</th>
                    <th>Objective</th>
                    <th>Assessment</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithNote.map(({ encounter, note }) => (
                    <tr key={encounter.id}>
                      <td>{formatDate(encounter.arrivedTime)}</td>
                      <td>{encounter.practitionerName || '—'}</td>
                      <td>{note?.subjective || '—'}</td>
                      <td>{note?.objective || '—'}</td>
                      <td>{note?.assessment || '—'}</td>
                      <td>{note?.plan || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-outline" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
