'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import OdontogramChart from '@/components/odontogram/OdontogramChart';
import { patientsApi, Patient, MedicalRecordEntry } from '@/lib/patients';
import { patientConsentApi, PatientConsent } from '@/lib/consent';
import { prescriptionsApi } from '@/lib/prescriptions';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../../styles/kunjungan.css';
import '../../../../styles/rekam-medis.css';
import '../../../../styles/odontogram.css';

type SectionId =
  | 'informed-consent'
  | 'physical-exam'
  | 'odontogram'
  | 'dental-exam'
  | 'supporting-exam'
  | 'prescription'
  | 'soap';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'informed-consent', label: 'Informed Consent', icon: 'draw' },
  { id: 'physical-exam', label: 'Pemeriksaan Fisik', icon: 'stethoscope' },
  { id: 'odontogram', label: 'Odontogram', icon: 'dentistry' },
  { id: 'dental-exam', label: 'Pemeriksaan Gigi Lanjutan', icon: 'cleaning_services' },
  { id: 'supporting-exam', label: 'Pemeriksaan Penunjang', icon: 'image' },
  { id: 'prescription', label: 'Resep Obat', icon: 'prescriptions' },
  { id: 'soap', label: 'Catatan SOAP', icon: 'medical_services' },
];

const CONSENT_STATUS_LABEL: Record<PatientConsent['status'], string> = {
  draft: 'Belum Ditandatangani',
  partial: 'Menunggu 1 Tanda Tangan',
  completed: 'Selesai',
};

const ENCOUNTER_STATUS_LABEL: Record<string, string> = {
  finished: 'Selesai',
  arrived: 'Sedang Berlangsung',
  cancelled: 'Dibatalkan',
};

function initialsFromName(name: string) {
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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PatientRekamMedisPage() {
  const params = useParams();
  const router = useRouter();
  const { error: showError } = useToast();
  const patientId = Number(params.patientId);

  const [activeSection, setActiveSection] = useState<SectionId>('soap');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [records, setRecords] = useState<MedicalRecordEntry[]>([]);
  const [consents, setConsents] = useState<PatientConsent[]>([]);
  const [printingRxFor, setPrintingRxFor] = useState<number | null>(null);
  const [printingConsentFor, setPrintingConsentFor] = useState<number | null>(null);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      patientsApi.get(patientId),
      patientsApi.getMedicalRecord(patientId),
      patientConsentApi.list({ patientId, limit: 100 }),
    ])
      .then(([p, medicalRecord, consentRes]) => {
        if (!active) return;
        setPatient(p);
        setRecords(medicalRecord);
        setConsents(consentRes.data);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat rekam medis');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  const goBack = () => router.push(`/list-pasien?patientId=${patientId}`);

  const handlePrintRx = async (encounterId: number) => {
    setPrintingRxFor(encounterId);
    try {
      await prescriptionsApi.downloadPdf(encounterId);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mencetak resep');
    } finally {
      setPrintingRxFor(null);
    }
  };

  const handlePrintConsent = async (id: number) => {
    setPrintingConsentFor(id);
    try {
      await patientConsentApi.downloadPdf(id);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengunduh formulir persetujuan');
    } finally {
      setPrintingConsentFor(null);
    }
  };

  const vitalsRows = records.filter((r) => r.vitals);
  const soapRows = records.filter((r) => r.soap);
  const dentalExamRows = records.filter((r) => r.dentalExam);
  const prescriptionRows = records.filter((r) => r.prescriptions.length > 0);
  const supportingExamRows = records.filter((r) => r.supportingExamImages.length > 0);

  return (
    <DashboardLayout>
      <FeatureGuard feature="pasien">
        <main className="content kunjungan-page rekam-medis-page">
          <button type="button" className="rm-back-btn" onClick={goBack}>
            <span className="material-symbols-rounded">arrow_back</span>
            Kembali ke Daftar Pasien
          </button>

          {loading ? (
            <div className="rm-loading">Memuat rekam medis…</div>
          ) : loadError || !patient ? (
            <div className="rm-loading error">{loadError || 'Pasien tidak ditemukan'}</div>
          ) : (
            <>
              <div className="rm-header">
                <div className="detail-avatar">{initialsFromName(patient.name)}</div>
                <div>
                  <div className="rm-patient-name">{patient.name}</div>
                  <div className="rm-patient-meta">No. RM {patient.noRm || '—'}</div>
                </div>
              </div>

              <div className="rm-layout">
                <nav className="rm-sidebar">
                  <div className="rm-sidebar-title">Rekam Medis</div>
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`rm-sidebar-item ${activeSection === s.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(s.id)}
                    >
                      <span className="material-symbols-rounded">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </nav>

                <div className="rm-content">
                  {activeSection === 'informed-consent' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Informed Consent</h2>
                        <p>Riwayat formulir persetujuan tindakan medis pasien ini.</p>
                      </div>
                      <div className="rm-section-body">
                        {consents.length === 0 ? (
                          <div className="rm-loading">Belum ada formulir persetujuan.</div>
                        ) : (
                          <div className="rx-table-wrap">
                            <table className="rx-table">
                              <thead>
                                <tr>
                                  <th>Tanggal</th>
                                  <th>Judul</th>
                                  <th>Status</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {consents.map((c) => (
                                  <tr key={c.id}>
                                    <td>{formatDate(c.createdAt)}</td>
                                    <td className="rx-drug-name">{c.title}</td>
                                    <td>{CONSENT_STATUS_LABEL[c.status]}</td>
                                    <td>
                                      {c.status === 'completed' && (
                                        <button
                                          type="button"
                                          className="btn-outline btn-sm"
                                          onClick={() => handlePrintConsent(c.id)}
                                          disabled={printingConsentFor === c.id}
                                        >
                                          {printingConsentFor === c.id ? 'Memproses…' : 'Unduh PDF'}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'physical-exam' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Fisik</h2>
                        <p>Riwayat tanda-tanda vital (TTV) per kunjungan.</p>
                      </div>
                      <div className="rm-section-body">
                        {vitalsRows.length === 0 ? (
                          <div className="rm-loading">Belum ada data TTV tercatat.</div>
                        ) : (
                          <div className="rx-table-wrap">
                            <table className="rx-table">
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
                    </div>
                  )}

                  {activeSection === 'odontogram' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Odontogram</h2>
                        <p>
                          Chart kondisi gigi pasien saat ini — kumulatif lintas kunjungan, bukan per tanggal
                          (temuan dibawa terus sampai diperbarui).
                        </p>
                      </div>
                      <div className="rm-section-body">
                        <OdontogramChart patientId={patientId} />
                      </div>
                    </div>
                  )}

                  {activeSection === 'dental-exam' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Gigi Lanjutan</h2>
                        <p>Riwayat indeks OHI-S, Gingival Index, dan Plaque Control Record per kunjungan.</p>
                      </div>
                      <div className="rm-section-body">
                        {dentalExamRows.length === 0 ? (
                          <div className="rm-loading">Belum ada data pemeriksaan gigi lanjutan.</div>
                        ) : (
                          <div className="rx-table-wrap">
                            <table className="rx-table">
                              <thead>
                                <tr>
                                  <th>Tanggal</th>
                                  <th>OHI-S</th>
                                  <th>Gingival Index</th>
                                  <th>Plaque Control Record</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dentalExamRows.map(({ encounter, dentalExam }) => {
                                  const ohis =
                                    dentalExam?.ohisDebris != null && dentalExam?.ohisCalculus != null
                                      ? (dentalExam.ohisDebris + dentalExam.ohisCalculus).toFixed(1)
                                      : null;
                                  const pcr =
                                    dentalExam?.plaqueSurfacesWithPlaque != null &&
                                    dentalExam?.plaqueSurfacesExamined
                                      ? `${Math.round(
                                          (dentalExam.plaqueSurfacesWithPlaque / dentalExam.plaqueSurfacesExamined) * 100,
                                        )}%`
                                      : null;
                                  return (
                                    <tr key={encounter.id}>
                                      <td>{formatDate(encounter.arrivedTime)}</td>
                                      <td>{ohis ?? '—'}</td>
                                      <td>{dentalExam?.gingivalIndex ?? '—'}</td>
                                      <td>{pcr ?? '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'supporting-exam' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Penunjang</h2>
                        <p>Foto klinis dan rontgen per kunjungan.</p>
                      </div>
                      <div className="rm-section-body">
                        {supportingExamRows.length === 0 ? (
                          <div className="rm-loading">Belum ada foto/rontgen tercatat.</div>
                        ) : (
                          supportingExamRows.map(({ encounter, supportingExamImages }) => (
                            <div key={encounter.id} className="rm-exam-group">
                              <div className="rm-exam-group-date">{formatDate(encounter.arrivedTime)}</div>
                              <div className="rm-exam-gallery">
                                {supportingExamImages.map((img) => (
                                  <a
                                    key={img.id}
                                    href={img.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rm-exam-thumb"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.fileUrl} alt={img.category || img.imageType} />
                                    <span>{img.imageType === 'xray' ? 'Rontgen' : 'Foto'}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'prescription' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Resep Obat</h2>
                        <p>Riwayat obat yang diresepkan per kunjungan.</p>
                      </div>
                      <div className="rm-section-body">
                        {prescriptionRows.length === 0 ? (
                          <div className="rm-loading">Belum ada resep tercatat.</div>
                        ) : (
                          <div className="rx-table-wrap">
                            <table className="rx-table">
                              <thead>
                                <tr>
                                  <th>Tanggal</th>
                                  <th>Obat</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {prescriptionRows.map(({ encounter, prescriptions }) => (
                                  <tr key={encounter.id}>
                                    <td>{formatDate(encounter.arrivedTime)}</td>
                                    <td>
                                      {prescriptions
                                        .map((rx) => `${rx.drugName}${rx.dosage ? ` (${rx.dosage})` : ''}`)
                                        .join(', ')}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn-outline btn-sm"
                                        onClick={() => handlePrintRx(encounter.id)}
                                        disabled={printingRxFor === encounter.id}
                                      >
                                        {printingRxFor === encounter.id ? 'Memproses…' : 'Cetak'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'soap' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>CPPT — Catatan Perkembangan Pasien Terintegrasi</h2>
                        <p>Lembar SOAP terintegrasi, satu baris per kunjungan.</p>
                      </div>
                      <div className="rm-section-body">
                        {soapRows.length === 0 ? (
                          <div className="rm-loading">Belum ada catatan SOAP tercatat.</div>
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
                                {soapRows.map(({ encounter, soap }) => (
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
                                        <span className="rm-muted">Belum ttd</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
