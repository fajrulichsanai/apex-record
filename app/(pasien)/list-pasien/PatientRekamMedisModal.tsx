'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Encounter } from '@/lib/patients';

interface PatientRekamMedisModalProps {
  patientName: string;
  encounters: Encounter[];
  onClose: () => void;
}

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  finished: 'Selesai',
  arrived: 'Sedang Berlangsung',
  cancelled: 'Dibatalkan',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PatientRekamMedisModal({ patientName, encounters, onClose }: PatientRekamMedisModalProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedEncounters = [...encounters].sort(
    (a, b) => new Date(b.arrivedTime).getTime() - new Date(a.arrivedTime).getTime(),
  );

  return (
    <div className="list-pasien-modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">folder_shared</span>
            </div>
            <div>
              <h2>Rekam Medis</h2>
              <p>Riwayat rekam medis untuk {patientName}</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body">
          {sortedEncounters.length === 0 ? (
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">event_busy</span>
              <div className="empty-title">Belum ada kunjungan</div>
              <div className="empty-sub">
                Pasien ini belum memiliki riwayat kunjungan, sehingga belum ada rekam medis.
              </div>
            </div>
          ) : (
            <div className="rekam-medis-list">
              {sortedEncounters.map((encounter) => (
                <div className="rekam-medis-row" key={encounter.id}>
                  <div className="rekam-medis-row-info">
                    <div className="rekam-medis-row-title">{encounter.serviceType}</div>
                    <div className="rekam-medis-row-sub">
                      {formatDate(encounter.arrivedTime)} · {encounter.practitionerName || '—'} ·{' '}
                      {ENCOUNTER_STATUS_LABEL[encounter.status] ?? encounter.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => router.push(`/list-kunjungan/${encounter.id}/rekam-medis`)}
                  >
                    <span className="material-symbols-rounded">visibility</span>
                    Lihat Rekam Medis
                  </button>
                </div>
              ))}
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
