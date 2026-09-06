'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SignaturePad from '@/components/form/SignaturePad';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { physicalExaminationApi, PhysicalExamination } from '@/lib/physical-examination';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../../styles/kunjungan.css';
import '../../../../styles/rekam-medis.css';

// Rekam Medis is a book: one chapter per kind of clinical record. Pemeriksaan
// Fisik comes first (what the doctor observes), SOAP comes last (the
// doctor's conclusion) — new chapters (odontogram, resep, penunjang, dst.)
// get added here later without touching the layout around them.
type SectionId = 'physical-exam' | 'soap';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'physical-exam', label: 'Pemeriksaan Fisik', icon: 'stethoscope' },
  { id: 'soap', label: 'Catatan SOAP', icon: 'medical_services' },
];

type ExamField =
  | 'generalCondition'
  | 'consciousness'
  | 'bloodPressureSystolic'
  | 'bloodPressureDiastolic'
  | 'pulseRate'
  | 'respiratoryRate'
  | 'temperature'
  | 'oxygenSaturation'
  | 'cyanosis'
  | 'edema'
  | 'anemia'
  | 'jaundice'
  | 'skin'
  | 'lymphNodes'
  | 'head'
  | 'hair'
  | 'eyes'
  | 'ears'
  | 'nose'
  | 'mouth'
  | 'neck'
  | 'lungInspection'
  | 'lungPalpation'
  | 'lungPercussion'
  | 'lungAuscultation'
  | 'heartInspection'
  | 'heartPalpation'
  | 'heartPercussion'
  | 'heartAuscultation'
  | 'abdomenInspection'
  | 'abdomenPalpation'
  | 'abdomenPercussion'
  | 'abdomenAuscultation'
  | 'extremities'
  | 'genitalia'
  | 'rectal';

const NUMERIC_EXAM_FIELDS: ExamField[] = [
  'bloodPressureSystolic',
  'bloodPressureDiastolic',
  'pulseRate',
  'respiratoryRate',
  'temperature',
  'oxygenSaturation',
];

const EMPTY_EXAM: Record<ExamField, string> = {
  generalCondition: '',
  consciousness: '',
  bloodPressureSystolic: '',
  bloodPressureDiastolic: '',
  pulseRate: '',
  respiratoryRate: '',
  temperature: '',
  oxygenSaturation: '',
  cyanosis: '',
  edema: '',
  anemia: '',
  jaundice: '',
  skin: '',
  lymphNodes: '',
  head: '',
  hair: '',
  eyes: '',
  ears: '',
  nose: '',
  mouth: '',
  neck: '',
  lungInspection: '',
  lungPalpation: '',
  lungPercussion: '',
  lungAuscultation: '',
  heartInspection: '',
  heartPalpation: '',
  heartPercussion: '',
  heartAuscultation: '',
  abdomenInspection: '',
  abdomenPalpation: '',
  abdomenPercussion: '',
  abdomenAuscultation: '',
  extremities: '',
  genitalia: '',
  rectal: '',
};

function examFromResponse(data: PhysicalExamination | null): Record<ExamField, string> {
  const next = { ...EMPTY_EXAM };
  if (!data) return next;
  (Object.keys(EMPTY_EXAM) as ExamField[]).forEach((field) => {
    const value = data[field];
    next[field] = value === null || value === undefined ? '' : String(value);
  });
  return next;
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

function statusLabel(status?: string) {
  if (status === 'arrived') return 'Menunggu';
  if (status === 'in_progress') return 'Berlangsung';
  if (status === 'finished') return 'Selesai';
  if (status === 'cancelled') return 'Batal';
  return '—';
}

export default function RekamMedisPage() {
  const params = useParams<{ encounterId: string }>();
  const router = useRouter();
  const { error: showError, success } = useToast();
  const encounterId = Number(params.encounterId);
  const isMounted = useRef(true);

  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('physical-exam');

  const [exam, setExam] = useState<Record<ExamField, string>>(EMPTY_EXAM);
  const [submittingExam, setSubmittingExam] = useState(false);

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!encounterId) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [d, note, examData] = await Promise.all([
          encounterApi.detail(encounterId),
          encounterSoapApi.get(encounterId),
          physicalExaminationApi.get(encounterId),
        ]);
        if (!isMounted.current) return;
        setDetail(d);
        if (note) {
          setSubjective(note.subjective || '');
          setObjective(note.objective || '');
          setAssessment(note.assessment || '');
          setPlan(note.plan || '');
          setSignature(note.signature || null);
        }
        setExam(examFromResponse(examData));
      } catch (err) {
        if (!isMounted.current) return;
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat rekam medis');
      } finally {
        if (isMounted.current) setLoading(false);
      }
    })();
  }, [encounterId]);

  const goBackToVisit = () => router.push(`/list-kunjungan?encounterId=${encounterId}`);

  const setExamField = (field: ExamField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    setExam((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExam(true);
    try {
      const payload: Record<string, string | number | undefined> = {};
      (Object.keys(EMPTY_EXAM) as ExamField[]).forEach((field) => {
        const raw = exam[field].trim();
        if (!raw) {
          payload[field] = undefined;
          return;
        }
        payload[field] = NUMERIC_EXAM_FIELDS.includes(field) ? Number(raw) : raw;
      });
      await physicalExaminationApi.upsert(encounterId, payload);
      success('Pemeriksaan fisik berhasil disimpan');
      setActiveSection('soap');
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan fisik');
    } finally {
      if (isMounted.current) setSubmittingExam(false);
    }
  };

  const handleSaveSoap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature) {
      showError('Tanda tangan dokter wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await encounterSoapApi.upsert(encounterId, {
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        signature,
      });
      success('Catatan SOAP berhasil disimpan');
      goBackToVisit();
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan');
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="kunjungan">
        <main className="content kunjungan-page rekam-medis-page">
          <button type="button" className="rm-back-btn" onClick={goBackToVisit}>
            <span className="material-symbols-rounded">arrow_back</span>
            Kembali ke Kunjungan
          </button>

          {loading ? (
            <div className="rm-loading">Memuat rekam medis…</div>
          ) : loadError || !detail ? (
            <div className="rm-loading error">{loadError || 'Kunjungan tidak ditemukan'}</div>
          ) : (
            <>
              <div className="rm-header">
                <div className="detail-avatar">{initialsFromName(detail.patient?.name)}</div>
                <div>
                  <div className="rm-patient-name">{detail.patient?.name || '—'}</div>
                  <div className="rm-patient-meta">
                    No. RM {detail.patient?.noRm || '—'} ·{' '}
                    {detail.practitioner?.name ? `dr. ${detail.practitioner.name}` : 'Dokter belum ditentukan'} ·{' '}
                    {statusLabel(detail.status)}
                  </div>
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
                  {activeSection === 'physical-exam' && (
                    <form onSubmit={handleSaveExam} className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Fisik</h2>
                        <p>Catat hasil pemeriksaan fisik lengkap untuk kunjungan ini</p>
                      </div>

                      <div className="rm-section-body">
                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">visibility</span>
                            Keadaan Umum &amp; Kesadaran
                          </div>
                          <div className="rm-field-grid">
                            <div className="visit-form-field">
                              <label>Keadaan Umum</label>
                              <input
                                type="text"
                                value={exam.generalCondition}
                                onChange={setExamField('generalCondition')}
                                placeholder="mis. Tampak sakit sedang"
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Kesadaran</label>
                              <input
                                type="text"
                                value={exam.consciousness}
                                onChange={setExamField('consciousness')}
                                placeholder="mis. Komposmentis"
                                disabled={submittingExam}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">monitor_heart</span>
                            Tanda Vital
                          </div>
                          <div className="rm-field-grid cols-4">
                            <div className="visit-form-field">
                              <label>Tekanan Darah</label>
                              <div className="rm-bp-group">
                                <input
                                  type="number"
                                  value={exam.bloodPressureSystolic}
                                  onChange={setExamField('bloodPressureSystolic')}
                                  placeholder="120"
                                  disabled={submittingExam}
                                />
                                <span className="rm-bp-sep">/</span>
                                <input
                                  type="number"
                                  value={exam.bloodPressureDiastolic}
                                  onChange={setExamField('bloodPressureDiastolic')}
                                  placeholder="80"
                                  disabled={submittingExam}
                                />
                                <span className="unit">mmHg</span>
                              </div>
                            </div>
                            <div className="visit-form-field">
                              <label>Nadi</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  value={exam.pulseRate}
                                  onChange={setExamField('pulseRate')}
                                  placeholder="80"
                                  disabled={submittingExam}
                                />
                                <span className="unit">x/menit</span>
                              </div>
                            </div>
                            <div className="visit-form-field">
                              <label>Frekuensi Napas</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  value={exam.respiratoryRate}
                                  onChange={setExamField('respiratoryRate')}
                                  placeholder="20"
                                  disabled={submittingExam}
                                />
                                <span className="unit">x/menit</span>
                              </div>
                            </div>
                            <div className="visit-form-field">
                              <label>Suhu</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={exam.temperature}
                                  onChange={setExamField('temperature')}
                                  placeholder="36.5"
                                  disabled={submittingExam}
                                />
                                <span className="unit">°C</span>
                              </div>
                            </div>
                            <div className="visit-form-field">
                              <label>Saturasi O2</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  value={exam.oxygenSaturation}
                                  onChange={setExamField('oxygenSaturation')}
                                  placeholder="98"
                                  disabled={submittingExam}
                                />
                                <span className="unit">%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">health_and_safety</span>
                            Pemeriksaan Umum
                          </div>
                          <div className="rm-field-grid cols-4">
                            <div className="visit-form-field">
                              <label>Sianosis</label>
                              <input
                                type="text"
                                value={exam.cyanosis}
                                onChange={setExamField('cyanosis')}
                                placeholder="mis. (-)"
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Edema</label>
                              <input
                                type="text"
                                value={exam.edema}
                                onChange={setExamField('edema')}
                                placeholder="mis. (-)"
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Anemia</label>
                              <input
                                type="text"
                                value={exam.anemia}
                                onChange={setExamField('anemia')}
                                placeholder="mis. (-)"
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Ikterik</label>
                              <input
                                type="text"
                                value={exam.jaundice}
                                onChange={setExamField('jaundice')}
                                placeholder="mis. (+) sklera & kulit"
                                disabled={submittingExam}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">accessibility_new</span>
                            Status Generalisata
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Kulit</label>
                              <input type="text" value={exam.skin} onChange={setExamField('skin')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Kelenjar Getah Bening</label>
                              <input
                                type="text"
                                value={exam.lymphNodes}
                                onChange={setExamField('lymphNodes')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Kepala</label>
                              <input type="text" value={exam.head} onChange={setExamField('head')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Rambut</label>
                              <input type="text" value={exam.hair} onChange={setExamField('hair')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Mata</label>
                              <input type="text" value={exam.eyes} onChange={setExamField('eyes')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Telinga</label>
                              <input type="text" value={exam.ears} onChange={setExamField('ears')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Hidung</label>
                              <input type="text" value={exam.nose} onChange={setExamField('nose')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Mulut</label>
                              <input type="text" value={exam.mouth} onChange={setExamField('mouth')} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Leher</label>
                              <input type="text" value={exam.neck} onChange={setExamField('neck')} disabled={submittingExam} />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">lungs</span>
                            Thorax — Paru
                          </div>
                          <div className="rm-field-grid">
                            <div className="visit-form-field">
                              <label>Inspeksi</label>
                              <textarea
                                value={exam.lungInspection}
                                onChange={setExamField('lungInspection')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <textarea
                                value={exam.lungPalpation}
                                onChange={setExamField('lungPalpation')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <textarea
                                value={exam.lungPercussion}
                                onChange={setExamField('lungPercussion')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <textarea
                                value={exam.lungAuscultation}
                                onChange={setExamField('lungAuscultation')}
                                placeholder="mis. Vesikuler, ronkhi -/-, wheezing -/-"
                                disabled={submittingExam}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">favorite</span>
                            Thorax — Jantung
                          </div>
                          <div className="rm-field-grid">
                            <div className="visit-form-field">
                              <label>Inspeksi</label>
                              <textarea
                                value={exam.heartInspection}
                                onChange={setExamField('heartInspection')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <textarea
                                value={exam.heartPalpation}
                                onChange={setExamField('heartPalpation')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <textarea
                                value={exam.heartPercussion}
                                onChange={setExamField('heartPercussion')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <textarea
                                value={exam.heartAuscultation}
                                onChange={setExamField('heartAuscultation')}
                                placeholder="mis. BJ I-II reguler, murmur (-), gallop (-)"
                                disabled={submittingExam}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">digestion</span>
                            Abdomen
                          </div>
                          <div className="rm-field-grid">
                            <div className="visit-form-field">
                              <label>Inspeksi</label>
                              <textarea
                                value={exam.abdomenInspection}
                                onChange={setExamField('abdomenInspection')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <textarea
                                value={exam.abdomenPalpation}
                                onChange={setExamField('abdomenPalpation')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <textarea
                                value={exam.abdomenPercussion}
                                onChange={setExamField('abdomenPercussion')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <textarea
                                value={exam.abdomenAuscultation}
                                onChange={setExamField('abdomenAuscultation')}
                                placeholder="mis. Bising usus (+) normal"
                                disabled={submittingExam}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">more_horiz</span>
                            Pemeriksaan Lainnya
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Ekstremitas</label>
                              <textarea
                                value={exam.extremities}
                                onChange={setExamField('extremities')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Genitalia</label>
                              <textarea
                                value={exam.genitalia}
                                onChange={setExamField('genitalia')}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Rectal Toucher</label>
                              <textarea value={exam.rectal} onChange={setExamField('rectal')} disabled={submittingExam} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rm-section-footer">
                        <button type="button" className="btn-outline" onClick={goBackToVisit} disabled={submittingExam}>
                          Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={submittingExam}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            arrow_forward
                          </span>
                          {submittingExam ? 'Menyimpan…' : 'Simpan & Lanjut ke SOAP'}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeSection === 'soap' && (
                    <form onSubmit={handleSaveSoap} className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Catatan SOAP</h2>
                        <p>Isi dokumentasi klinis dan tanda tangan dokter untuk kunjungan ini</p>
                      </div>

                      <div className="rm-section-body">
                        <div className="visit-form-field">
                          <label>
                            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                              medical_services
                            </span>
                            Dokter Pemeriksa
                          </label>
                          <input
                            type="text"
                            value={detail.practitioner?.name || '—'}
                            disabled
                            readOnly
                            className="visit-readonly-input"
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Subjective</label>
                          <textarea
                            value={subjective}
                            onChange={(e) => setSubjective(e.target.value)}
                            placeholder="Keluhan/cerita pasien menurut pasien sendiri (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Objective</label>
                          <textarea
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            placeholder="Hasil pemeriksaan objektif (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Assessment</label>
                          <textarea
                            value={assessment}
                            onChange={(e) => setAssessment(e.target.value)}
                            placeholder="Diagnosis/penilaian klinis (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>Plan</label>
                          <textarea
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="Rencana tindakan/terapi (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="visit-form-field">
                          <label>
                            Tanda Tangan Dokter <span className="req">*</span>
                          </label>
                          <SignaturePad value={signature || undefined} onChange={setSignature} disabled={submitting} />
                        </div>
                      </div>

                      <div className="rm-section-footer">
                        <button type="button" className="btn-outline" onClick={goBackToVisit} disabled={submitting}>
                          Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            check_circle
                          </span>
                          {submitting ? 'Menyimpan…' : 'Simpan SOAP'}
                        </button>
                      </div>
                    </form>
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
