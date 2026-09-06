'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SignaturePad from '@/components/form/SignaturePad';
import ExamFindingSelect from '@/components/form/ExamFindingSelect';
import PainScalePicker from '@/components/form/PainScalePicker';
import BodyPainMap, { PainPoint } from '@/components/form/BodyPainMap';
import PrescriptionPanel from '@/components/form/PrescriptionPanel';
import CustomSelect from '@/components/form/CustomSelect';
import SoapNoteView from '@/components/rekam-medis/SoapNoteView';
import SupportingExamPanel from '@/components/rekam-medis/SupportingExamPanel';
import OdontogramChart from '@/components/odontogram/OdontogramChart';
import { UPPER_ROW, LOWER_ROW, ALL_TEETH } from '@/components/odontogram/odontogramData';
import { encounterApi, EncounterDetail } from '@/lib/encounter';
import { encounterSoapApi } from '@/lib/encounter-soap';
import { physicalExaminationApi, PhysicalExamination } from '@/lib/physical-examination';
import { dentalExaminationApi, DentalExamination, ProbingDepthEntry } from '@/lib/dental-examination';
import { reservationsApi } from '@/lib/reservations';
import { prescriptionsApi } from '@/lib/prescriptions';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../../styles/kunjungan.css';
import '../../../../styles/rekam-medis.css';
import '../../../../styles/odontogram.css';

// Rekam Medis is a book: one chapter per kind of clinical record. Pemeriksaan
// Fisik comes first (what the doctor observes), Odontogram documents the
// dentist's tooth-by-tooth findings, Pemeriksaan Gigi Lanjutan adds the
// dentist's indices (OHI-S/GI/PCR/probing depth) on top of that, Pemeriksaan
// Penunjang holds supporting images (foto/rontgen), Resep Obat stands on its
// own (printable independently), SOAP comes last (the doctor's conclusion).
type SectionId =
  | 'physical-exam'
  | 'odontogram'
  | 'dental-exam'
  | 'supporting-exam'
  | 'prescription'
  | 'soap';

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'physical-exam', label: 'Pemeriksaan Fisik', icon: 'stethoscope' },
  { id: 'odontogram', label: 'Odontogram', icon: 'dentistry' },
  { id: 'dental-exam', label: 'Pemeriksaan Gigi Lanjutan', icon: 'cleaning_services' },
  { id: 'supporting-exam', label: 'Pemeriksaan Penunjang', icon: 'image' },
  { id: 'prescription', label: 'Resep Obat', icon: 'prescriptions' },
  { id: 'soap', label: 'Catatan SOAP', icon: 'medical_services' },
];

type ExamField =
  | 'generalCondition'
  | 'consciousness'
  | 'nutritionalStatus'
  | 'height'
  | 'weight'
  | 'painScale'
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
  'height',
  'weight',
  'painScale',
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
  nutritionalStatus: '',
  height: '',
  weight: '',
  painScale: '',
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
  nutritionalStatus: ['Gizi baik', 'Gizi kurang / kurus', 'Gizi lebih / obesitas'],

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

const CONTROL_OPTIONS = [
  { value: 'none', label: 'Tidak perlu kontrol' },
  { value: '3d', label: 'Kontrol 3 Hari Lagi' },
  { value: '1w', label: 'Kontrol 1 Minggu Lagi' },
  { value: '2w', label: 'Kontrol 2 Minggu Lagi' },
  { value: '1m', label: 'Kontrol 1 Bulan Lagi' },
  { value: 'custom', label: 'Pilih Tanggal Sendiri' },
];

const CONTROL_OPTION_DAYS: Record<string, number> = { '3d': 3, '1w': 7, '2w': 14, '1m': 30 };

// Same WIB-vs-UTC pitfall as the "today" filter elsewhere in this app —
// shift to WIB before reading calendar fields so a control date computed
// late at night doesn't land a day early.
function wibToday(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000);
}

function computeControlDate(option: string): string {
  const days = CONTROL_OPTION_DAYS[option];
  if (!days) return '';
  const d = wibToday();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateOnly(value?: string) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

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
function composeObjectiveFromExam(exam: Record<ExamField, string>, painPointCount = 0): string {
  const lines: string[] = [];

  const keadaan = [
    exam.generalCondition && `Keadaan umum: ${exam.generalCondition}`,
    exam.consciousness && `Kesadaran: ${exam.consciousness}`,
    exam.nutritionalStatus && `Status gizi: ${exam.nutritionalStatus}`,
    exam.height && exam.weight && `TB/BB: ${exam.height} cm / ${exam.weight} kg`,
  ].filter(Boolean);
  if (keadaan.length) lines.push(keadaan.join(', '));

  if (exam.painScale) {
    lines.push(`Skala nyeri: ${exam.painScale}/10${painPointCount ? ` (${painPointCount} lokasi ditandai)` : ''}`);
  }

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

// ----- Pemeriksaan Gigi Lanjutan: OHI-S, Gingival Index, Plaque Control
// Record, Probing Depth — a second "objective" data source that composes
// into SOAP's Objective field alongside Pemeriksaan Fisik (see
// mergeAutoBlockIntoObjective below).

type DentalExamField =
  | 'ohisDebris'
  | 'ohisCalculus'
  | 'gingivalIndex'
  | 'plaqueSurfacesWithPlaque'
  | 'plaqueSurfacesExamined'
  | 'notes';

type DentalExamState = Record<DentalExamField, string>;

const EMPTY_DENTAL_EXAM: DentalExamState = {
  ohisDebris: '',
  ohisCalculus: '',
  gingivalIndex: '',
  plaqueSurfacesWithPlaque: '',
  plaqueSurfacesExamined: '',
  notes: '',
};

interface ProbingRow {
  toothNumber: number;
  buccal: string;
  lingual: string;
}

function emptyProbingRows(): ProbingRow[] {
  return ALL_TEETH.map((toothNumber) => ({ toothNumber, buccal: '', lingual: '' }));
}

function dentalExamFromResponse(data: DentalExamination | null): DentalExamState {
  const next = { ...EMPTY_DENTAL_EXAM };
  if (!data) return next;
  (Object.keys(EMPTY_DENTAL_EXAM) as DentalExamField[]).forEach((field) => {
    const value = data[field];
    next[field] = value === null || value === undefined ? '' : String(value);
  });
  return next;
}

function probingRowsFromResponse(data: DentalExamination | null): ProbingRow[] {
  const rows = emptyProbingRows();
  if (!data?.probingDepths?.length) return rows;
  const byTooth = new Map(data.probingDepths.map((p) => [p.toothNumber, p]));
  return rows.map((row) => {
    const found = byTooth.get(row.toothNumber);
    if (!found) return row;
    return {
      toothNumber: row.toothNumber,
      buccal: found.buccal === null || found.buccal === undefined ? '' : String(found.buccal),
      lingual: found.lingual === null || found.lingual === undefined ? '' : String(found.lingual),
    };
  });
}

// OHI-S (Greene & Vermillion): Debris Index + Calculus Index, each 0-3.
function ohisCategory(total: number): string {
  if (total <= 1.2) return 'Baik';
  if (total <= 3.0) return 'Sedang';
  return 'Buruk';
}

// Gingival Index (Löe & Silness), 0-3.
function gingivalCategory(value: number): string {
  if (value <= 0) return 'Sehat';
  if (value <= 1.0) return 'Ringan';
  if (value <= 2.0) return 'Sedang';
  return 'Berat';
}

function indexBadgeTone(category: string): 'good' | 'fair' | 'poor' {
  if (category === 'Baik' || category === 'Sehat') return 'good';
  if (category === 'Sedang' || category === 'Ringan') return 'fair';
  return 'poor';
}

function composeObjectiveFromDentalExam(exam: DentalExamState, probing: ProbingRow[]): string {
  const lines: string[] = [];

  const debris = exam.ohisDebris ? Number(exam.ohisDebris) : null;
  const calculus = exam.ohisCalculus ? Number(exam.ohisCalculus) : null;
  if (debris !== null || calculus !== null) {
    const total = (debris || 0) + (calculus || 0);
    lines.push(
      `OHI-S: Debris Index ${debris ?? '-'} + Calculus Index ${calculus ?? '-'} = ${total.toFixed(1)} (${ohisCategory(total)})`,
    );
  }

  if (exam.gingivalIndex) {
    const gi = Number(exam.gingivalIndex);
    lines.push(`Gingival Index: ${gi} (${gingivalCategory(gi)})`);
  }

  const withPlaque = exam.plaqueSurfacesWithPlaque ? Number(exam.plaqueSurfacesWithPlaque) : null;
  const examined = exam.plaqueSurfacesExamined ? Number(exam.plaqueSurfacesExamined) : null;
  if (withPlaque !== null && examined) {
    const pct = (withPlaque / examined) * 100;
    lines.push(
      `Plaque Control Record: ${withPlaque}/${examined} permukaan (${pct.toFixed(1)}%, ${pct < 10 ? 'baik' : 'perlu perbaikan kebersihan mulut'})`,
    );
  }

  const filledProbing = probing.filter((p) => p.buccal || p.lingual);
  if (filledProbing.length) {
    lines.push(
      `Probing depth (mm): ${filledProbing.map((p) => `gigi ${p.toothNumber} B${p.buccal || '-'}/L${p.lingual || '-'}`).join(', ')}`,
    );
  }

  if (exam.notes) lines.push(`Catatan: ${exam.notes}`);

  if (!lines.length) return '';
  return ['Pemeriksaan Gigi Lanjutan:', ...lines].join('\n');
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
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [dentalExam, setDentalExam] = useState<DentalExamState>(EMPTY_DENTAL_EXAM);
  const [dentalExamUpdatedAt, setDentalExamUpdatedAt] = useState<string | null>(null);
  const [probingDepths, setProbingDepths] = useState<ProbingRow[]>(emptyProbingRows());
  const [submittingDentalExam, setSubmittingDentalExam] = useState(false);

  // Tracks the combined auto-generated block (Pemeriksaan Fisik + Pemeriksaan
  // Gigi Lanjutan) last written into Objective, so saving either exam can
  // replace just that block instead of clobbering whatever the doctor typed
  // after it, or duplicating the other exam's contribution.
  const lastAutoObjectiveRef = useRef('');

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [treatment, setTreatment] = useState('');
  const [plan, setPlan] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [soapUpdatedAt, setSoapUpdatedAt] = useState<string | null>(null);
  // A SOAP note that was already saved opens in read-only view mode first
  // ("bukan tempat isi saja") — Edit switches to the form.
  const [soapMode, setSoapMode] = useState<'view' | 'edit'>('edit');
  const [hasSavedNote, setHasSavedNote] = useState(false);

  // Plan's follow-up control scheduler — creates a Reservasi automatically
  // on save so a control visit doesn't rely on the doctor remembering to
  // book it separately afterward.
  const [controlOption, setControlOption] = useState('none');
  const [controlDate, setControlDate] = useState('');
  const [controlReservationCreated, setControlReservationCreated] = useState(false);
  const effectiveControlDate = controlOption === 'custom' ? controlDate : computeControlDate(controlOption);

  const [printingRx, setPrintingRx] = useState(false);

  const ohisTotal = (Number(dentalExam.ohisDebris) || 0) + (Number(dentalExam.ohisCalculus) || 0);
  const pcrPercent =
    dentalExam.plaqueSurfacesWithPlaque && dentalExam.plaqueSurfacesExamined && Number(dentalExam.plaqueSurfacesExamined) > 0
      ? (Number(dentalExam.plaqueSurfacesWithPlaque) / Number(dentalExam.plaqueSurfacesExamined)) * 100
      : null;

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
        const [d, note, examData, dentalExamData] = await Promise.all([
          encounterApi.detail(encounterId),
          encounterSoapApi.get(encounterId),
          physicalExaminationApi.get(encounterId),
          dentalExaminationApi.get(encounterId),
        ]);
        if (!isMounted.current) return;
        setDetail(d);
        if (note) {
          setSubjective(note.subjective || '');
          setObjective(note.objective || '');
          setAssessment(note.assessment || '');
          setTreatment(note.treatment || '');
          setPlan(note.plan || '');
          setSignature(note.signature || null);
          setSoapUpdatedAt(note.updatedAt || note.createdAt || null);
          setHasSavedNote(true);
          setSoapMode('view');
        }
        const loadedExam = examFromResponse(examData);
        setExam(loadedExam);
        setExamUpdatedAt(examData?.updatedAt || examData?.createdAt || null);
        setPainPoints(examData?.painPoints || []);

        const loadedDentalExam = dentalExamFromResponse(dentalExamData);
        setDentalExam(loadedDentalExam);
        setDentalExamUpdatedAt(dentalExamData?.updatedAt || dentalExamData?.createdAt || null);
        const loadedProbingDepths = probingRowsFromResponse(dentalExamData);
        setProbingDepths(loadedProbingDepths);

        // If Objective already starts with what these two exams would
        // compose to combined, remember it so the next save replaces that
        // block instead of duplicating it.
        const physicalBlock = composeObjectiveFromExam(loadedExam, examData?.painPoints?.length || 0);
        const dentalBlock = composeObjectiveFromDentalExam(loadedDentalExam, loadedProbingDepths);
        const combined = [physicalBlock, dentalBlock].filter(Boolean).join('\n\n');
        if (combined && note?.objective?.startsWith(combined)) {
          lastAutoObjectiveRef.current = combined;
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

  const setDentalField = (field: DentalExamField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = e.target;
    setDentalExam((prev) => ({ ...prev, [field]: value }));
  };

  const setProbingValue = (toothNumber: number, side: 'buccal' | 'lingual') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setProbingDepths((prev) => prev.map((row) => (row.toothNumber === toothNumber ? { ...row, [side]: value } : row)));
  };

  const handleControlOptionChange = (value: string) => {
    setControlOption(value);
    setControlReservationCreated(false);
    if (value !== 'custom') setControlDate('');
  };

  const handleControlDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setControlDate(e.target.value);
    setControlReservationCreated(false);
  };

  const handlePrintPrescription = async () => {
    setPrintingRx(true);
    try {
      await prescriptionsApi.downloadPdf(encounterId);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mencetak resep');
    } finally {
      setPrintingRx(false);
    }
  };

  // Prepends the freshly composed combined block (Pemeriksaan Fisik +
  // Pemeriksaan Gigi Lanjutan) to Objective, replacing the previous
  // auto-generated block (if the doctor hasn't since typed over it) so
  // their own notes after it survive the update.
  const mergeAutoBlockIntoObjective = (combined: string) => {
    if (!combined) return;
    setObjective((prev) => {
      const prevAuto = lastAutoObjectiveRef.current;
      const manual = prevAuto && prev.startsWith(prevAuto) ? prev.slice(prevAuto.length).replace(/^\s+/, '') : prev.trim() === '' ? '' : prev;
      lastAutoObjectiveRef.current = combined;
      return manual ? `${combined}\n\n${manual}` : combined;
    });
  };

  const applyExamToObjective = (examValues: Record<ExamField, string>, painPointCount: number) => {
    const physicalBlock = composeObjectiveFromExam(examValues, painPointCount);
    const dentalBlock = composeObjectiveFromDentalExam(dentalExam, probingDepths);
    mergeAutoBlockIntoObjective([physicalBlock, dentalBlock].filter(Boolean).join('\n\n'));
  };

  const applyDentalExamToObjective = (dentalValues: DentalExamState, probingValues: ProbingRow[]) => {
    const physicalBlock = composeObjectiveFromExam(exam, painPoints.length);
    const dentalBlock = composeObjectiveFromDentalExam(dentalValues, probingValues);
    mergeAutoBlockIntoObjective([physicalBlock, dentalBlock].filter(Boolean).join('\n\n'));
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExam(true);
    try {
      const payload: Record<string, string | number | undefined | PainPoint[]> = {};
      (Object.keys(EMPTY_EXAM) as ExamField[]).forEach((field) => {
        const raw = exam[field].trim();
        if (!raw) {
          payload[field] = undefined;
          return;
        }
        payload[field] = NUMERIC_EXAM_FIELDS.includes(field) ? Number(raw) : raw;
      });
      payload.painPoints = painPoints.length ? painPoints : undefined;
      const saved = await physicalExaminationApi.upsert(encounterId, payload);
      setExamUpdatedAt(saved?.updatedAt || new Date().toISOString());
      applyExamToObjective(exam, painPoints.length);
      success('Pemeriksaan fisik berhasil disimpan, hasilnya ditambahkan ke Objective SOAP');
      setSoapMode('edit');
      setActiveSection('soap');
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan fisik');
    } finally {
      if (isMounted.current) setSubmittingExam(false);
    }
  };

  const handleSaveDentalExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDentalExam(true);
    try {
      const numericFields: DentalExamField[] = [
        'ohisDebris',
        'ohisCalculus',
        'gingivalIndex',
        'plaqueSurfacesWithPlaque',
        'plaqueSurfacesExamined',
      ];
      const payload: Record<string, string | number | undefined | ProbingDepthEntry[]> = {};
      numericFields.forEach((field) => {
        const raw = dentalExam[field].trim();
        payload[field] = raw ? Number(raw) : undefined;
      });
      payload.notes = dentalExam.notes.trim() || undefined;
      const filledProbing: ProbingDepthEntry[] = probingDepths
        .filter((row) => row.buccal.trim() || row.lingual.trim())
        .map((row) => ({
          toothNumber: row.toothNumber,
          buccal: row.buccal.trim() ? Number(row.buccal) : undefined,
          lingual: row.lingual.trim() ? Number(row.lingual) : undefined,
        }));
      payload.probingDepths = filledProbing.length ? filledProbing : undefined;
      const saved = await dentalExaminationApi.upsert(encounterId, payload);
      setDentalExamUpdatedAt(saved?.updatedAt || new Date().toISOString());
      applyDentalExamToObjective(dentalExam, probingDepths);
      success('Pemeriksaan gigi lanjutan berhasil disimpan, hasilnya ditambahkan ke Objective SOAP');
      setSoapMode('edit');
      setActiveSection('soap');
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan pemeriksaan gigi lanjutan');
    } finally {
      if (isMounted.current) setSubmittingDentalExam(false);
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
      const saved = await encounterSoapApi.upsert(encounterId, {
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        treatment: treatment.trim() || undefined,
        plan: plan.trim() || undefined,
        signature,
      });
      setSoapUpdatedAt(saved?.updatedAt || new Date().toISOString());
      setHasSavedNote(true);
      success('Catatan SOAP berhasil disimpan');

      if (controlOption !== 'none' && effectiveControlDate && !controlReservationCreated && detail?.patient?.id) {
        try {
          await reservationsApi.create({
            patientId: detail.patient.id,
            patientName: detail.patient.name,
            practitionerId: detail.practitioner?.id,
            reservationDate: effectiveControlDate,
            notes: 'Kontrol lanjutan dari hasil pemeriksaan',
          });
          setControlReservationCreated(true);
          success(`Reservasi kontrol otomatis dibuat untuk ${formatDateOnly(effectiveControlDate)}`);
        } catch (rErr) {
          showError(rErr instanceof ApiError ? `Catatan SOAP tersimpan, tapi gagal membuat reservasi kontrol: ${rErr.message}` : 'Catatan SOAP tersimpan, tapi gagal membuat reservasi kontrol otomatis');
        }
      }

      setSoapMode('view');
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
                          <div className="rm-field-grid cols-3">
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
                            <div className="visit-form-field">
                              <label>Status Gizi</label>
                              <ExamFindingSelect
                                value={exam.nutritionalStatus}
                                onChange={setExamValue('nutritionalStatus')}
                                options={EXAM_OPTIONS.nutritionalStatus!}
                                disabled={submittingExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Tinggi Badan</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  value={exam.height}
                                  onChange={setExamField('height')}
                                  placeholder="165"
                                  disabled={submittingExam}
                                />
                                <span className="unit">cm</span>
                              </div>
                            </div>
                            <div className="visit-form-field">
                              <label>Berat Badan</label>
                              <div className="rm-input-unit">
                                <input
                                  type="number"
                                  value={exam.weight}
                                  onChange={setExamField('weight')}
                                  placeholder="60"
                                  disabled={submittingExam}
                                />
                                <span className="unit">kg</span>
                              </div>
                            </div>
                            {exam.height && exam.weight && (
                              <div className="visit-form-field">
                                <label>IMT (BMI)</label>
                                <div className="rm-bmi-badge">
                                  {(Number(exam.weight) / (Number(exam.height) / 100) ** 2).toFixed(1)} kg/m²
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rm-fieldset rm-fieldset-vitals">
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
                            <span className="material-symbols-rounded">sentiment_dissatisfied</span>
                            Skala Nyeri
                          </div>
                          <div className="visit-form-field">
                            <label>Seberapa nyeri dirasakan pasien? (0 = tidak nyeri, 10 = nyeri terberat)</label>
                            <PainScalePicker value={exam.painScale} onChange={setExamValue('painScale')} disabled={submittingExam} />
                          </div>
                          <div className="visit-form-field">
                            <label>Lokasi Nyeri</label>
                            <BodyPainMap points={painPoints} onChange={setPainPoints} disabled={submittingExam} />
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

                  {activeSection === 'odontogram' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Odontogram</h2>
                        <p>Peta kondisi gigi pasien (FDI/ISO 3950) — data ini mengikuti pasien di semua kunjungan, bukan hanya kunjungan ini</p>
                      </div>
                      <div className="rm-section-body">
                        {detail.patient ? (
                          <OdontogramChart patientId={detail.patient.id} />
                        ) : (
                          <div className="rm-loading">Data pasien tidak ditemukan</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === 'dental-exam' && (
                    <form onSubmit={handleSaveDentalExam} className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Gigi Lanjutan</h2>
                        <p>
                          OHI-S, Gingival Index, Plaque Control Record &amp; Probing Depth — hasilnya ikut ditambahkan ke Objective SOAP
                          {formatExamDate(dentalExamUpdatedAt) && ` · Terakhir diperiksa ${formatExamDate(dentalExamUpdatedAt)}`}
                        </p>
                      </div>

                      <div className="rm-section-body">
                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">cleaning_services</span>
                            Oral Hygiene Index — Simplified (OHI-S)
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Debris Index (0–3)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="3"
                                value={dentalExam.ohisDebris}
                                onChange={setDentalField('ohisDebris')}
                                placeholder="0.0"
                                disabled={submittingDentalExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Calculus Index (0–3)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="3"
                                value={dentalExam.ohisCalculus}
                                onChange={setDentalField('ohisCalculus')}
                                placeholder="0.0"
                                disabled={submittingDentalExam}
                              />
                            </div>
                            {(dentalExam.ohisDebris || dentalExam.ohisCalculus) && (
                              <div className="visit-form-field">
                                <label>Total OHI-S</label>
                                <div className={`rm-index-badge ${indexBadgeTone(ohisCategory(ohisTotal))}`}>
                                  {ohisTotal.toFixed(1)} · {ohisCategory(ohisTotal)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">emergency</span>
                            Gingival Index (Löe &amp; Silness)
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Skor (0–3)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="3"
                                value={dentalExam.gingivalIndex}
                                onChange={setDentalField('gingivalIndex')}
                                placeholder="0.0"
                                disabled={submittingDentalExam}
                              />
                            </div>
                            {dentalExam.gingivalIndex && (
                              <div className="visit-form-field">
                                <label>Kategori</label>
                                <div className={`rm-index-badge ${indexBadgeTone(gingivalCategory(Number(dentalExam.gingivalIndex)))}`}>
                                  {gingivalCategory(Number(dentalExam.gingivalIndex))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">grid_on</span>
                            Plaque Control Record (O&apos;Leary)
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Permukaan dengan Plak</label>
                              <input
                                type="number"
                                min="0"
                                value={dentalExam.plaqueSurfacesWithPlaque}
                                onChange={setDentalField('plaqueSurfacesWithPlaque')}
                                placeholder="0"
                                disabled={submittingDentalExam}
                              />
                            </div>
                            <div className="visit-form-field">
                              <label>Total Permukaan Diperiksa</label>
                              <input
                                type="number"
                                min="0"
                                value={dentalExam.plaqueSurfacesExamined}
                                onChange={setDentalField('plaqueSurfacesExamined')}
                                placeholder="128"
                                disabled={submittingDentalExam}
                              />
                            </div>
                            {pcrPercent !== null && (
                              <div className="visit-form-field">
                                <label>Persentase Plak</label>
                                <div className={`rm-index-badge ${pcrPercent < 10 ? 'good' : 'poor'}`}>{pcrPercent.toFixed(1)}%</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">straighten</span>
                            Probing Depth (mm)
                          </div>
                          <div className="rm-probing-grid">
                            <div>
                              <div className="rm-probing-arch-label">Rahang Atas</div>
                              <div className="rx-table-wrap">
                                <table className="rx-table rm-probing-table">
                                  <thead>
                                    <tr>
                                      <th>Gigi</th>
                                      <th>Bukal</th>
                                      <th>Palatal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {probingDepths
                                      .filter((row) => UPPER_ROW.includes(row.toothNumber))
                                      .map((row) => (
                                        <tr key={row.toothNumber}>
                                          <td>{row.toothNumber}</td>
                                          <td>
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              value={row.buccal}
                                              onChange={setProbingValue(row.toothNumber, 'buccal')}
                                              disabled={submittingDentalExam}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              value={row.lingual}
                                              onChange={setProbingValue(row.toothNumber, 'lingual')}
                                              disabled={submittingDentalExam}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div>
                              <div className="rm-probing-arch-label">Rahang Bawah</div>
                              <div className="rx-table-wrap">
                                <table className="rx-table rm-probing-table">
                                  <thead>
                                    <tr>
                                      <th>Gigi</th>
                                      <th>Bukal</th>
                                      <th>Lingual</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {probingDepths
                                      .filter((row) => LOWER_ROW.includes(row.toothNumber))
                                      .map((row) => (
                                        <tr key={row.toothNumber}>
                                          <td>{row.toothNumber}</td>
                                          <td>
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              value={row.buccal}
                                              onChange={setProbingValue(row.toothNumber, 'buccal')}
                                              disabled={submittingDentalExam}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              type="number"
                                              step="0.5"
                                              min="0"
                                              value={row.lingual}
                                              onChange={setProbingValue(row.toothNumber, 'lingual')}
                                              disabled={submittingDentalExam}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="visit-form-field">
                          <label>Catatan Tambahan</label>
                          <textarea
                            value={dentalExam.notes}
                            onChange={setDentalField('notes')}
                            placeholder="Catatan lain (opsional)"
                            disabled={submittingDentalExam}
                          />
                        </div>
                      </div>

                      <div className="rm-section-footer">
                        <button type="button" className="btn-outline" onClick={goBackToVisit} disabled={submittingDentalExam}>
                          Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={submittingDentalExam}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            arrow_forward
                          </span>
                          {submittingDentalExam ? 'Menyimpan…' : 'Simpan & Lanjut ke SOAP'}
                        </button>
                      </div>
                    </form>
                  )}

                  {activeSection === 'supporting-exam' && (
                    <div className="rm-section">
                      <div className="rm-section-heading">
                        <h2>Pemeriksaan Penunjang</h2>
                        <p>Unggah foto atau hasil rontgen untuk kunjungan ini</p>
                      </div>
                      <div className="rm-section-body">
                        <SupportingExamPanel encounterId={encounterId} />
                      </div>
                    </div>
                  )}

                  {activeSection === 'prescription' && (
                    <div className="rm-section">
                      <div className="rm-section-heading rm-view-heading">
                        <div>
                          <h2>Resep Obat</h2>
                          <p>Kelola obat yang diresepkan untuk kunjungan ini, lalu cetak sebagai lembar resep</p>
                        </div>
                        <button type="button" className="btn-primary" onClick={handlePrintPrescription} disabled={printingRx}>
                          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                            print
                          </span>
                          {printingRx ? 'Menyiapkan…' : 'Cetak Resep'}
                        </button>
                      </div>
                      <div className="rm-section-body">
                        <PrescriptionPanel encounterId={encounterId} />
                      </div>
                    </div>
                  )}

                  {activeSection === 'soap' && soapMode === 'view' && (
                    <SoapNoteView
                      practitionerName={detail.practitioner?.name}
                      subjective={subjective}
                      objective={objective}
                      assessment={assessment}
                      treatment={treatment}
                      plan={plan}
                      signature={signature}
                      updatedAtLabel={formatExamDate(soapUpdatedAt)}
                      onEdit={() => setSoapMode('edit')}
                    />
                  )}

                  {activeSection === 'soap' && soapMode === 'edit' && (
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

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">clinical_notes</span>
                            Treatment — tindakan pada kunjungan ini
                          </div>
                          <div className="visit-form-field">
                            <label>Tindakan yang dilakukan</label>
                            <textarea
                              value={treatment}
                              onChange={(e) => setTreatment(e.target.value)}
                              placeholder="mis. Debridement luka, injeksi antibiotik (opsional). Resep obat dikelola di tab Resep Obat."
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        <div className="visit-form-field">
                          <label>Plan</label>
                          <textarea
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            placeholder="Rencana untuk kunjungan berikutnya (opsional)"
                            disabled={submitting}
                          />
                        </div>

                        <div className="rm-fieldset">
                          <div className="rm-fieldset-title">
                            <span className="material-symbols-rounded">event_repeat</span>
                            Jadwal Kontrol
                          </div>
                          <div className="rm-field-grid cols-3">
                            <div className="visit-form-field">
                              <label>Kontrol Berikutnya</label>
                              <CustomSelect
                                value={controlOption}
                                onChange={handleControlOptionChange}
                                options={CONTROL_OPTIONS}
                                disabled={submitting}
                              />
                            </div>
                            {controlOption === 'custom' && (
                              <div className="visit-form-field">
                                <label>Tanggal Kontrol</label>
                                <input
                                  type="date"
                                  value={controlDate}
                                  min={wibToday().toISOString().slice(0, 10)}
                                  onChange={handleControlDateChange}
                                  disabled={submitting}
                                />
                              </div>
                            )}
                            {controlOption !== 'none' && controlOption !== 'custom' && effectiveControlDate && (
                              <div className="visit-form-field">
                                <label>Tanggal</label>
                                <div className="rm-bmi-badge">{formatDateOnly(effectiveControlDate)}</div>
                              </div>
                            )}
                          </div>
                          {controlOption !== 'none' && (
                            <p className={`rm-control-hint${controlReservationCreated ? ' done' : ''}`}>
                              {controlReservationCreated
                                ? `✓ Reservasi kontrol sudah dibuat untuk ${formatDateOnly(effectiveControlDate)}`
                                : 'Reservasi kontrol akan dibuat otomatis di modul Reservasi saat Catatan SOAP ini disimpan.'}
                            </p>
                          )}
                        </div>

                        <div className="visit-form-field">
                          <label>
                            Tanda Tangan Dokter <span className="req">*</span>
                          </label>
                          <SignaturePad value={signature || undefined} onChange={setSignature} disabled={submitting} />
                        </div>
                      </div>

                      <div className="rm-section-footer">
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => (hasSavedNote ? setSoapMode('view') : goBackToVisit())}
                          disabled={submitting}
                        >
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
