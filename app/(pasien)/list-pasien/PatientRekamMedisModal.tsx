'use client';

import { useEffect, useState } from 'react';
import { patientsApi, MedicalRecordEntry } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';

interface PatientRekamMedisModalProps {
  patientId: number;
  patientName: string;
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

function hasVitals(v: MedicalRecordEntry['vitals']) {
  if (!v) return false;
  return (
    v.bloodPressureSystolic != null ||
    v.bloodPressureDiastolic != null ||
    v.pulseRate != null ||
    v.respiratoryRate != null ||
    v.temperature != null ||
    v.oxygenSaturation != null ||
    v.weight != null ||
    v.height != null
  );
}

function hasSoap(s: MedicalRecordEntry['soap']) {
  if (!s) return false;
  return !!(s.subjective || s.objective || s.assessment || s.treatment || s.plan || s.controlPlan || s.signature);
}

export default function PatientRekamMedisModal({ patientId, patientName, onClose }: PatientRekamMedisModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<MedicalRecordEntry[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    patientsApi
      .getMedicalRecord(patientId)
      .then((data) => {
        if (active) setEntries(data);
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat rekam medis');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const vitalsRows = entries.filter((e) => hasVitals(e.vitals));
  const cpptRows = entries.filter((e) => hasSoap(e.soap));

  return (
    <div className="list-pasien-modal-overlay" onClick={onClose}>
      <div className="modal-box rekam-medis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">folder_shared</span>
            </div>
            <div>
              <h2>Rekam Medis</h2>
              <p>{patientName}</p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="empty-sub">Memuat rekam medis…</div>
          ) : loadError ? (
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">error</span>
              <div className="empty-title">Gagal memuat</div>
              <div className="empty-sub">{loadError}</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">event_busy</span>
              <div className="empty-title">Belum ada kunjungan</div>
              <div className="empty-sub">
                Pasien ini belum memiliki riwayat kunjungan, sehingga belum ada rekam medis.
              </div>
            </div>
          ) : (
            <>
              <div className="rm-view-section">
                <h3>Tanda-Tanda Vital (TTV)</h3>
                {vitalsRows.length === 0 ? (
                  <div className="empty-sub">Belum ada data TTV tercatat.</div>
                ) : (
                  <div className="rm-table-scroll">
                    <table className="ttv-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>Tensi</th>
                          <th>Nadi</th>
                          <th>RR</th>
                          <th>Suhu</th>
                          <th>SpO2</th>
                          <th>BB</th>
                          <th>TB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitalsRows.map(({ encounter, vitals }) => (
                          <tr key={encounter.id}>
                            <td>{formatDate(encounter.arrivedTime)}</td>
                            <td>
                              {vitals?.bloodPressureSystolic != null && vitals?.bloodPressureDiastolic != null
                                ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`
                                : '—'}
                            </td>
                            <td>{vitals?.pulseRate != null ? `${vitals.pulseRate}x/mnt` : '—'}</td>
                            <td>{vitals?.respiratoryRate != null ? `${vitals.respiratoryRate}x/mnt` : '—'}</td>
                            <td>{vitals?.temperature != null ? `${vitals.temperature}°C` : '—'}</td>
                            <td>{vitals?.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : '—'}</td>
                            <td>{vitals?.weight != null ? `${vitals.weight} kg` : '—'}</td>
                            <td>{vitals?.height != null ? `${vitals.height} cm` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rm-view-section">
                <h3>CPPT — Catatan Perkembangan Pasien Terintegrasi</h3>
                {cpptRows.length === 0 ? (
                  <div className="empty-sub">Belum ada catatan SOAP tercatat.</div>
                ) : (
                  <div className="rm-table-scroll">
                    <table className="cppt-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>SOAP</th>
                          <th>Tindakan / Rencana</th>
                          <th>DPJP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cpptRows.map(({ encounter, soap }) => (
                          <tr key={encounter.id}>
                            <td className="cppt-date">
                              {formatDate(encounter.arrivedTime)}
                              <span className="cppt-status">
                                {ENCOUNTER_STATUS_LABEL[encounter.status] ?? encounter.status}
                              </span>
                            </td>
                            <td>
                              <div className="cppt-cell-row"><b>S</b><span>{soap?.subjective || '—'}</span></div>
                              <div className="cppt-cell-row"><b>O</b><span>{soap?.objective || '—'}</span></div>
                              <div className="cppt-cell-row"><b>A</b><span>{soap?.assessment || '—'}</span></div>
                            </td>
                            <td>
                              <div className="cppt-cell-row"><b>Tr</b><span>{soap?.treatment || '—'}</span></div>
                              <div className="cppt-cell-row"><b>P</b><span>{soap?.plan || '—'}</span></div>
                              <div className="cppt-cell-row"><b>Kontrol</b><span>{soap?.controlPlan || '—'}</span></div>
                            </td>
                            <td className="cppt-dpjp">
                              <div>{encounter.practitionerName ? `drg. ${encounter.practitionerName}` : '—'}</div>
                              {soap?.signature ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={soap.signature} alt="Tanda tangan dokter" className="cppt-signature" />
                              ) : (
                                <span className="empty-sub" style={{ maxWidth: 'none' }}>Belum ttd</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
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
