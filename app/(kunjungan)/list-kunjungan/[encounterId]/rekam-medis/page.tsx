'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SignaturePad from '@/components/form/SignaturePad';
import ExamFindingSelect from '@/components/form/ExamFindingSelect';
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

// Standard findings a doctor can tap instead of typing — covers the common
// case for each field; "Lainnya (isi manual)" in ExamFindingSelect still
// allows free text for anything not on the list.
const EXAM_OPTIONS: Partial<Record<ExamField, string[]>> = {
  generalCondition: ['Baik', 'Tampak sakit ringan', 'Tampak sakit sedang', 'Tampak sakit berat'],
  consciousness: ['Komposmentis', 'Apatis', 'Delirium', 'Somnolen', 'Sopor', 'Soporokoma', 'Koma'],

  cyanosis: ['Tidak ada (-)', 'Ada (+)'],
  edema: ['Tidak ada (-)', 'Ada (+)'],
  anemia: ['Tidak ada (-)', 'Ada (+)'],
  jaundice: ['Tidak ada (-)', 'Ada (+)'],

  skin: ['Dalam batas normal', 'Ikterik', 'Sianosis', 'Pucat', 'Ruam (+)', 'Turgor menurun'],
  lymphNodes: ['Tidak teraba pembesaran KGB', 'Teraba pembesaran KGB'],
  head: ['Normocephali', 'Mikrocephali', 'Makrocephali', 'Deformitas (+)'],
  hair: ['Hitam, distribusi merata, tidak mudah rontok', 'Rontok', 'Beruban', 'Rapuh'],
  eyes: ['Konjungtiva anemis -/-, sklera ikterik -/-', 'Konjungtiva anemis +/+', 'Sklera ikterik +/+', 'Pupil isokor, refleks cahaya +/+'],
  ears: ['Dalam batas normal', 'Sekret (+)', 'Nyeri tekan tragus (+)', 'Gangguan pendengaran (+)'],
  nose: ['Dalam batas normal', 'Sekret (+)', 'Deviasi septum (+)', 'Napas cuping hidung (+)'],
  mouth: ['Dalam batas normal', 'Mukosa bibir kering', 'Sianosis perioral (+)', 'Faring hiperemis (+)'],
  neck: ['Dalam batas normal, KGB tidak teraba membesar', 'Pembesaran KGB (+)', 'Pembesaran tiroid (+)', 'Peningkatan JVP (+)'],

  lungInspection: ['Simetris statis dan dinamis', 'Asimetris', 'Retraksi dinding dada (+)', 'Penggunaan otot bantu napas (+)'],
  lungPalpation: ['Fremitus taktil simetris kanan = kiri', 'Fremitus meningkat', 'Fremitus menurun'],
  lungPercussion: ['Sonor pada kedua lapang paru', 'Redup', 'Hipersonor'],
  lungAuscultation: ['Vesikuler +/+, ronkhi -/-, wheezing -/-', 'Ronkhi (+)', 'Wheezing (+)', 'Suara napas menurun'],

  heartInspection: ['Ictus cordis tidak tampak', 'Ictus cordis tampak'],
  heartPalpation: ['Ictus cordis tidak teraba', 'Ictus cordis teraba di ICS V linea midklavikula sinistra'],
  heartPercussion: ['Batas jantung dalam batas normal', 'Kardiomegali'],
  heartAuscultation: ['BJ I-II reguler, murmur (-), gallop (-)', 'Murmur (+)', 'Gallop (+)', 'Bunyi jantung ireguler'],

  abdomenInspection: ['Datar', 'Distensi (+)', 'Skar (+)', 'Massa (+)'],
  abdomenPalpation: ['Supel, nyeri tekan (-), hepar/lien tidak teraba', 'Nyeri tekan (+)', 'Hepatomegali (+)', 'Splenomegali (+)', 'Defans muskular (+)'],
  abdomenPercussion: ['Timpani pada seluruh lapang abdomen', 'Shifting dullness (+)', 'Pekak sisi (+)'],
  abdomenAuscultation: ['Bising usus (+) normal', 'Bising usus meningkat', 'Bising usus menurun/tidak terdengar'],

  extremities: ['Akral hangat, CRT < 2 detik, edema (-)', 'Akral dingin', 'Edema (+)', 'Sianosis perifer (+)'],
  genitalia: ['Dalam batas normal', 'Tidak dilakukan pemeriksaan'],
  rectal: ['Dalam batas normal', 'Tidak dilakukan pemeriksaan'],
};

function formatExamDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}

// Compiles whichever exam fields have content into a readable Objective
// block for the SOAP note — only sections with at least one filled field
// show up, so an untouched exam contributes nothing.
function composeObjectiveFromExam(exam: Record<ExamField, string>): string {
  const lines: string[] = [];

  const keadaan = [
    exam.generalCondition && `Keadaan umum: ${exam.generalCondition}`,
    exam.consciousness && `Kesadaran: ${exam.consciousness}`,
  ].filter(Boolean);
  if (keadaan.length) lines.push(keadaan.join(', '));

  const vital = [
    exam.bloodPressureSystolic && exam.bloodPressureDiastolic && `TD ${exam.bloodPressureSystolic}/${exam.bloodPressureDiastolic} mmHg`,
    exam.pulseRate && `Nadi ${exam.pulseRate}x/menit`,
    exam.respiratoryRate && `RR ${exam.respiratoryRate}x/menit`,
    exam.temperature && `Suhu ${exam.temperature}°C`,
    exam.oxygenSaturation && `SpO2 ${exam.oxygenSaturation}%`,
  ].filter(Boolean);
  if (vital.length) lines.push(`Tanda vital: ${vital.join(', ')}`);

  const umum = [
    exam.cyanosis && `sianosis ${exam.cyanosis}`,
    exam.edema && `edema ${exam.edema}`,
    exam.anemia && `anemia ${exam.anemia}`,
    exam.jaundice && `ikterik ${exam.jaundice}`,
  ].filter(Boolean);
  if (umum.length) lines.push(`Pemeriksaan umum: ${umum.join(', ')}`);

  const generalisataFields: [ExamField, string][] = [
    ['skin', 'Kulit'],
    ['lymphNodes', 'KGB'],
    ['head', 'Kepala'],
    ['hair', 'Rambut'],
    ['eyes', 'Mata'],
    ['ears', 'Telinga'],
    ['nose', 'Hidung'],
    ['mouth', 'Mulut'],
    ['neck', 'Leher'],
  ];
  const generalisata = generalisataFields.filter(([f]) => exam[f]).map(([f, label]) => `${label}: ${exam[f]}`);
  if (generalisata.length) lines.push(`Status generalisata — ${generalisata.join('; ')}`);

  const paru = [
    exam.lungInspection && `inspeksi ${exam.lungInspection}`,
    exam.lungPalpation && `palpasi ${exam.lungPalpation}`,
    exam.lungPercussion && `perkusi ${exam.lungPercussion}`,
    exam.lungAuscultation && `auskultasi ${exam.lungAuscultation}`,
  ].filter(Boolean);
  if (paru.length) lines.push(`Paru: ${paru.join('; ')}`);

  const jantung = [
    exam.heartInspection && `inspeksi ${exam.heartInspection}`,
    exam.heartPalpation && `palpasi ${exam.heartPalpation}`,
    exam.heartPercussion && `perkusi ${exam.heartPercussion}`,
    exam.heartAuscultation && `auskultasi ${exam.heartAuscultation}`,
  ].filter(Boolean);
  if (jantung.length) lines.push(`Jantung: ${jantung.join('; ')}`);

  const abdomen = [
    exam.abdomenInspection && `inspeksi ${exam.abdomenInspection}`,
    exam.abdomenPalpation && `palpasi ${exam.abdomenPalpation}`,
    exam.abdomenPercussion && `perkusi ${exam.abdomenPercussion}`,
    exam.abdomenAuscultation && `auskultasi ${exam.abdomenAuscultation}`,
  ].filter(Boolean);
  if (abdomen.length) lines.push(`Abdomen: ${abdomen.join('; ')}`);

  const lainnya = [
    exam.extremities && `Ekstremitas: ${exam.extremities}`,
    exam.genitalia && `Genitalia: ${exam.genitalia}`,
    exam.rectal && `Rectal toucher: ${exam.rectal}`,
  ].filter(Boolean);
  if (lainnya.length) lines.push(lainnya.join('; '));

  return lines.join('\n');
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
  const [examUpdatedAt, setExamUpdatedAt] = useState<string | null>(null);
  const [submittingExam, setSubmittingExam] = useState(false);
  // Tracks the auto-generated block last written into Objective, so a
  // re-save of the exam can replace just that block instead of clobbering
  // whatever the doctor typed after it.
  const lastAutoObjectiveRef = useRef('');

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
        const loadedExam = examFromResponse(examData);
        setExam(loadedExam);
        setExamUpdatedAt(examData?.updatedAt || examData?.createdAt || null);
        // If Objective already starts with what this exam data would
        // compose to, remember it so the next save replaces that block
        // instead of duplicating it.
        const composed = composeObjectiveFromExam(loadedExam);
        if (composed && note?.objective?.startsWith(composed)) {
          lastAutoObjectiveRef.current = composed;
        }
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

  const setExamValue = (field: ExamField) => (value: string) => {
    setExam((prev) => ({ ...prev, [field]: value }));
  };

  // Prepends the freshly composed exam summary to Objective, replacing the
  // previous auto-generated block (if the doctor hasn't since typed over
  // it) so their own notes after it survive the update.
  const applyExamToObjective = (examValues: Record<ExamField, string>) => {
    const block = composeObjectiveFromExam(examValues);
    if (!block) return;
    setObjective((prev) => {
      const prevAuto = lastAutoObjectiveRef.current;
      const manual = prevAuto && prev.startsWith(prevAuto) ? prev.slice(prevAuto.length).replace(/^\s+/, '') : prev.trim() === '' ? '' : prev;
      lastAutoObjectiveRef.current = block;
      return manual ? `${block}\n\n${manual}` : block;
    });
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
      const saved = await physicalExaminationApi.upsert(encounterId, payload);
      setExamUpdatedAt(saved?.updatedAt || new Date().toISOString());
      applyExamToObjective(exam);
      success('Pemeriksaan fisik berhasil disimpan, hasilnya ditambahkan ke Objective SOAP');
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
                        <p>
                          Catat hasil pemeriksaan fisik lengkap untuk kunjungan ini
                          {formatExamDate(examUpdatedAt) && ` · Terakhir diperiksa ${formatExamDate(examUpdatedAt)}`}
                        </p>
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
                              <ExamFindingSelect
                                value={exam.generalCondition}
                                onChange={setExamValue('generalCondition')}
                                options={EXAM_OPTIONS.generalCondition!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Kesadaran</label>
                              <ExamFindingSelect
                                value={exam.consciousness}
                                onChange={setExamValue('consciousness')}
                                options={EXAM_OPTIONS.consciousness!}
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
                              <ExamFindingSelect
                                value={exam.cyanosis}
                                onChange={setExamValue('cyanosis')}
                                options={EXAM_OPTIONS.cyanosis!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Edema</label>
                              <ExamFindingSelect
                                value={exam.edema}
                                onChange={setExamValue('edema')}
                                options={EXAM_OPTIONS.edema!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Anemia</label>
                              <ExamFindingSelect
                                value={exam.anemia}
                                onChange={setExamValue('anemia')}
                                options={EXAM_OPTIONS.anemia!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Ikterik</label>
                              <ExamFindingSelect
                                value={exam.jaundice}
                                onChange={setExamValue('jaundice')}
                                options={EXAM_OPTIONS.jaundice!}
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
                              <ExamFindingSelect value={exam.skin} onChange={setExamValue('skin')} options={EXAM_OPTIONS.skin!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Kelenjar Getah Bening</label>
                              <ExamFindingSelect
                                value={exam.lymphNodes}
                                onChange={setExamValue('lymphNodes')}
                                options={EXAM_OPTIONS.lymphNodes!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Kepala</label>
                              <ExamFindingSelect value={exam.head} onChange={setExamValue('head')} options={EXAM_OPTIONS.head!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Rambut</label>
                              <ExamFindingSelect value={exam.hair} onChange={setExamValue('hair')} options={EXAM_OPTIONS.hair!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Mata</label>
                              <ExamFindingSelect value={exam.eyes} onChange={setExamValue('eyes')} options={EXAM_OPTIONS.eyes!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Telinga</label>
                              <ExamFindingSelect value={exam.ears} onChange={setExamValue('ears')} options={EXAM_OPTIONS.ears!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Hidung</label>
                              <ExamFindingSelect value={exam.nose} onChange={setExamValue('nose')} options={EXAM_OPTIONS.nose!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Mulut</label>
                              <ExamFindingSelect value={exam.mouth} onChange={setExamValue('mouth')} options={EXAM_OPTIONS.mouth!} disabled={submittingExam} />
                            </div>
                            <div className="visit-form-field">
                              <label>Leher</label>
                              <ExamFindingSelect value={exam.neck} onChange={setExamValue('neck')} options={EXAM_OPTIONS.neck!} disabled={submittingExam} />
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
                              <ExamFindingSelect
                                value={exam.lungInspection}
                                onChange={setExamValue('lungInspection')}
                                options={EXAM_OPTIONS.lungInspection!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <ExamFindingSelect
                                value={exam.lungPalpation}
                                onChange={setExamValue('lungPalpation')}
                                options={EXAM_OPTIONS.lungPalpation!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <ExamFindingSelect
                                value={exam.lungPercussion}
                                onChange={setExamValue('lungPercussion')}
                                options={EXAM_OPTIONS.lungPercussion!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <ExamFindingSelect
                                value={exam.lungAuscultation}
                                onChange={setExamValue('lungAuscultation')}
                                options={EXAM_OPTIONS.lungAuscultation!}
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
                              <ExamFindingSelect
                                value={exam.heartInspection}
                                onChange={setExamValue('heartInspection')}
                                options={EXAM_OPTIONS.heartInspection!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <ExamFindingSelect
                                value={exam.heartPalpation}
                                onChange={setExamValue('heartPalpation')}
                                options={EXAM_OPTIONS.heartPalpation!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <ExamFindingSelect
                                value={exam.heartPercussion}
                                onChange={setExamValue('heartPercussion')}
                                options={EXAM_OPTIONS.heartPercussion!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <ExamFindingSelect
                                value={exam.heartAuscultation}
                                onChange={setExamValue('heartAuscultation')}
                                options={EXAM_OPTIONS.heartAuscultation!}
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
                              <ExamFindingSelect
                                value={exam.abdomenInspection}
                                onChange={setExamValue('abdomenInspection')}
                                options={EXAM_OPTIONS.abdomenInspection!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Palpasi</label>
                              <ExamFindingSelect
                                value={exam.abdomenPalpation}
                                onChange={setExamValue('abdomenPalpation')}
                                options={EXAM_OPTIONS.abdomenPalpation!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Perkusi</label>
                              <ExamFindingSelect
                                value={exam.abdomenPercussion}
                                onChange={setExamValue('abdomenPercussion')}
                                options={EXAM_OPTIONS.abdomenPercussion!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Auskultasi</label>
                              <ExamFindingSelect
                                value={exam.abdomenAuscultation}
                                onChange={setExamValue('abdomenAuscultation')}
                                options={EXAM_OPTIONS.abdomenAuscultation!}
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
                              <ExamFindingSelect
                                value={exam.extremities}
                                onChange={setExamValue('extremities')}
                                options={EXAM_OPTIONS.extremities!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Genitalia</label>
                              <ExamFindingSelect
                                value={exam.genitalia}
                                onChange={setExamValue('genitalia')}
                                options={EXAM_OPTIONS.genitalia!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Rectal Toucher</label>
                              <ExamFindingSelect
                                value={exam.rectal}
                                onChange={setExamValue('rectal')}
                                options={EXAM_OPTIONS.rectal!}
                                disabled={submittingExam}
                              />
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
