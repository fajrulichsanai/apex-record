'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { Patient, PatientPayload, patientsApi } from '@/lib/patients';

export const PATIENT_DRAFT_KEY = 'patient-wizard-draft';

type UiGender = 'laki-laki' | 'perempuan';

interface WizardForm {
  name: string;
  gender: UiGender;
  birthDate: string;
  isNewborn: boolean;
  nik: string;
  phone: string;
  email: string;
  maritalStatus: string;
  pekerjaan: string;

  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;

  nikIbu: string;
  namaWali: string;
  hubunganWali: string;
  birthOrder: string;

  sumberInformasi: string;
  detailSumber: string;
  kodeReferral: string;
  referrerPatientId: number | null;
  referrerSearch: string;

  golonganDarah: string;
  rhesus: string;
  punyaAlergi: boolean;
  catatanAlergi: string;

  preferensiKontak: string;
  preferensiJamKontak: string;
  catatanPreferensi: string;
  isMember: boolean;
  memberId: string;

  consentMarketing: boolean;
}

const EMPTY_FORM: WizardForm = {
  name: '',
  gender: 'laki-laki',
  birthDate: '',
  isNewborn: false,
  nik: '',
  phone: '',
  email: '',
  maritalStatus: '',
  pekerjaan: '',

  address: '',
  kelurahan: '',
  kecamatan: '',
  city: '',
  province: '',
  postalCode: '',

  nikIbu: '',
  namaWali: '',
  hubunganWali: '',
  birthOrder: '',

  sumberInformasi: '',
  detailSumber: '',
  kodeReferral: '',
  referrerPatientId: null,
  referrerSearch: '',

  golonganDarah: '',
  rhesus: '',
  punyaAlergi: false,
  catatanAlergi: '',

  preferensiKontak: '',
  preferensiJamKontak: '',
  catatanPreferensi: '',
  isMember: false,
  memberId: '',

  consentMarketing: false,
};

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(age, 0);
}

function isValidNIK(nik: string): boolean {
  return /^\d{16}$/.test(nik.trim());
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.trim().replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

function isValidPostalCode(code: string): boolean {
  return /^\d{5}$/.test(code.trim());
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidBirthDate(birthDate: string): boolean {
  if (!birthDate) return false;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return false;
  return date <= new Date();
}

function patientToForm(patient: Patient): WizardForm {
  return {
    name: patient.name,
    gender: patient.gender === 'male' ? 'laki-laki' : 'perempuan',
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    isNewborn: !patient.nik && !!patient.nikIbu,
    nik: patient.nik || '',
    phone: patient.phone || '',
    email: patient.email || '',
    maritalStatus: patient.maritalStatus || '',
    pekerjaan: patient.pekerjaan || '',

    address: patient.address || '',
    kelurahan: patient.kelurahan || '',
    kecamatan: patient.kecamatan || '',
    city: patient.city || '',
    province: patient.province || '',
    postalCode: patient.postalCode || '',

    nikIbu: patient.nikIbu || '',
    namaWali: patient.namaWali || '',
    hubunganWali: patient.hubunganWali || '',
    birthOrder: patient.birthOrder ? String(patient.birthOrder) : '',

    sumberInformasi: patient.sumberInformasi || '',
    detailSumber: patient.detailSumber || '',
    kodeReferral: patient.kodeReferral || '',
    referrerPatientId: patient.referrerPatientId ?? null,
    referrerSearch: '',

    golonganDarah: patient.golonganDarah || '',
    rhesus: patient.rhesus || '',
    punyaAlergi: !!patient.punyaAlergi,
    catatanAlergi: patient.catatanAlergi || '',

    preferensiKontak: patient.preferensiKontak || '',
    preferensiJamKontak: patient.preferensiJamKontak || '',
    catatanPreferensi: patient.catatanPreferensi || '',
    isMember: !!patient.isMember,
    memberId: patient.memberId || '',

    consentMarketing: !!patient.consentMarketing,
  };
}

function formToPayload(form: WizardForm): PatientPayload {
  return {
    name: form.name,
    gender: form.gender === 'laki-laki' ? 'male' : 'female',
    isNewborn: form.isNewborn,
    nik: form.isNewborn ? undefined : form.nik || undefined,
    dateOfBirth: form.birthDate || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    pekerjaan: form.pekerjaan || undefined,
    maritalStatus: (form.maritalStatus || undefined) as PatientPayload['maritalStatus'],

    address: form.address || undefined,
    kelurahan: form.kelurahan || undefined,
    kecamatan: form.kecamatan || undefined,
    city: form.city || undefined,
    province: form.province || undefined,
    postalCode: form.postalCode || undefined,

    nikIbu: form.nikIbu || undefined,
    namaWali: form.namaWali || undefined,
    hubunganWali: (form.hubunganWali || undefined) as PatientPayload['hubunganWali'],
    birthOrder: form.birthOrder ? Number(form.birthOrder) : undefined,

    sumberInformasi: (form.sumberInformasi || undefined) as PatientPayload['sumberInformasi'],
    detailSumber: form.detailSumber || undefined,
    kodeReferral: form.kodeReferral || undefined,
    referrerPatientId: form.referrerPatientId ?? undefined,

    golonganDarah: (form.golonganDarah || undefined) as PatientPayload['golonganDarah'],
    rhesus: (form.rhesus || undefined) as PatientPayload['rhesus'],
    punyaAlergi: form.punyaAlergi,
    catatanAlergi: form.punyaAlergi ? form.catatanAlergi || undefined : undefined,

    preferensiKontak: (form.preferensiKontak || undefined) as PatientPayload['preferensiKontak'],
    preferensiJamKontak: (form.preferensiJamKontak ||
      undefined) as PatientPayload['preferensiJamKontak'],
    catatanPreferensi: form.catatanPreferensi || undefined,
    isMember: form.isMember,
    memberId: form.isMember ? form.memberId || undefined : undefined,

    consentMarketing: form.consentMarketing,
    consentTanggal: form.consentMarketing ? new Date().toISOString() : undefined,
    consentVersion: form.consentMarketing ? '1.0' : undefined,
  };
}

const SUMBER_OPTIONS = [
  { value: '', label: 'Pilih sumber informasi' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'teman_keluarga', label: 'Teman / Keluarga' },
  { value: 'lewat_depan_klinik', label: 'Lewat Depan Klinik' },
  { value: 'brosur', label: 'Brosur' },
  { value: 'lainnya', label: 'Lainnya' },
];

interface StepDef {
  key: string;
  label: string;
  icon: string;
}

const BASE_STEPS: StepDef[] = [
  { key: 'identitas', label: 'Identitas', icon: 'badge' },
  { key: 'alamat', label: 'Alamat', icon: 'location_on' },
  { key: 'wali', label: 'Wali', icon: 'family_restroom' },
  { key: 'marketing', label: 'Marketing', icon: 'campaign' },
  { key: 'medis', label: 'Medis', icon: 'medical_information' },
  { key: 'preferensi', label: 'Preferensi', icon: 'tune' },
  { key: 'persetujuan', label: 'Persetujuan', icon: 'fact_check' },
];

interface PatientWizardProps {
  mode: 'create' | 'edit';
  initialPatient?: Patient | null;
  noRmDisplay?: string;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (payload: PatientPayload) => void;
  onCancel: () => void;
}

export default function PatientWizard({
  mode,
  initialPatient,
  noRmDisplay,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: PatientWizardProps) {
  const [form, setForm] = useState<WizardForm>(EMPTY_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [referrerResults, setReferrerResults] = useState<Patient[]>([]);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from initial patient (edit mode) or draft (create mode)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (initialPatient) {
      setForm(patientToForm(initialPatient));
      return;
    }
    if (mode === 'create' && typeof window !== 'undefined') {
      const raw = localStorage.getItem(PATIENT_DRAFT_KEY);
      if (raw) {
        try {
          setForm({ ...EMPTY_FORM, ...JSON.parse(raw) });
        } catch {
          // ignore corrupt draft
        }
      }
    }
  }, [initialPatient, mode]);

  // Autosave draft (create mode only)
  useEffect(() => {
    if (mode !== 'create') return;
    const timeout = setTimeout(() => {
      localStorage.setItem(PATIENT_DRAFT_KEY, JSON.stringify(form));
      setDraftSavedAt(new Date().toLocaleTimeString('id-ID'));
    }, 600);
    return () => clearTimeout(timeout);
  }, [form, mode]);

  // Clear conditional fields when toggled OFF
  useEffect(() => {
    if (!form.punyaAlergi && form.catatanAlergi) {
      setForm((prev) => ({ ...prev, catatanAlergi: '' }));
    }
  }, [form.punyaAlergi]);

  useEffect(() => {
    if (!form.isMember && form.memberId) {
      setForm((prev) => ({ ...prev, memberId: '' }));
    }
  }, [form.isMember]);

  useEffect(() => {
    if (form.sumberInformasi !== 'lainnya' && form.detailSumber) {
      setForm((prev) => ({ ...prev, detailSumber: '' }));
    }
  }, [form.sumberInformasi]);

  const age = useMemo(() => calcAge(form.birthDate), [form.birthDate]);
  const isMinor = form.isNewborn || (age !== null && age < 17);

  const steps = useMemo(
    () => BASE_STEPS.filter((s) => s.key !== 'wali' || isMinor),
    [isMinor]
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  // Referrer autocomplete (debounced)
  useEffect(() => {
    const query = form.referrerSearch.trim();
    if (!query) {
      setReferrerResults([]);
      return;
    }
    setReferrerLoading(true);
    const timeout = setTimeout(() => {
      patientsApi
        .list({ search: query, limit: 5 })
        .then((data) => setReferrerResults(data))
        .catch(() => setReferrerResults([]))
        .finally(() => setReferrerLoading(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [form.referrerSearch]);

  const update = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (key: string): Record<string, string | null> => {
    const errs: Record<string, string | null> = {};
    if (key === 'identitas') {
      if (!form.name.trim()) errs.name = 'Nama lengkap wajib diisi.';
      if (!form.birthDate) {
        errs.birthDate = 'Tanggal lahir wajib diisi.';
      } else if (!isValidBirthDate(form.birthDate)) {
        errs.birthDate = 'Tanggal lahir tidak boleh di masa depan.';
      }
      if (!form.phone.trim()) {
        errs.phone = 'Nomor telepon wajib diisi.';
      } else if (!isValidPhone(form.phone)) {
        errs.phone = 'Format nomor telepon tidak valid (10-13 digit).';
      }
      if (!form.isNewborn && !form.nik.trim()) {
        errs.nik = 'NIK wajib diisi, atau tandai sebagai bayi baru lahir.';
      } else if (!form.isNewborn && form.nik.trim() && !isValidNIK(form.nik)) {
        errs.nik = 'NIK harus 16 digit.';
      }
      if (form.email.trim() && !isValidEmail(form.email)) {
        errs.email = 'Format email tidak valid.';
      }
    }
    if (key === 'alamat') {
      if (!form.kecamatan.trim()) errs.kecamatan = 'Kecamatan wajib diisi.';
      if (!form.city.trim()) errs.city = 'Kota/Kabupaten wajib diisi.';
      if (form.postalCode.trim() && !isValidPostalCode(form.postalCode)) {
        errs.postalCode = 'Kode pos harus 5 digit.';
      }
    }
    if (key === 'wali' && isMinor) {
      if (!form.namaWali.trim()) errs.namaWali = 'Nama wali wajib diisi.';
      if (!form.hubunganWali) errs.hubunganWali = 'Hubungan wali wajib dipilih.';
    }
    if (key === 'marketing') {
      if (!form.sumberInformasi) errs.sumberInformasi = 'Sumber informasi wajib dipilih.';
      if (form.sumberInformasi === 'lainnya' && !form.detailSumber.trim()) {
        errs.detailSumber = 'Detail sumber wajib diisi.';
      }
    }
    if (key === 'medis') {
      if (form.punyaAlergi && !form.catatanAlergi.trim()) {
        errs.catatanAlergi = 'Catatan alergi wajib diisi.';
      }
    }
    if (key === 'preferensi') {
      if (form.isMember && !form.memberId.trim()) {
        errs.memberId = 'Member ID wajib diisi.';
      }
    }
    if (key === 'persetujuan') {
      if (!form.consentMarketing) {
        errs.consentMarketing = 'Persetujuan penggunaan data pribadi wajib dicentang.';
      }
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(currentStep.key);
    const hasErrors = Object.values(errs).some((e) => e !== null);
    if (hasErrors) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goPrev = () => {
    setFieldErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSaveDraft = () => {
    localStorage.setItem(PATIENT_DRAFT_KEY, JSON.stringify(form));
    setDraftSavedAt(new Date().toLocaleTimeString('id-ID'));
  };

  const handleSubmit = () => {
    const allErrors: Record<string, string | null> = {};

    // Validate all steps
    for (const step of steps) {
      const stepErrors = validateStep(step.key);
      Object.assign(allErrors, stepErrors);
    }

    const hasErrors = Object.values(allErrors).some((e) => e !== null);
    if (hasErrors) {
      setFieldErrors(allErrors);
      // Find first step with error and navigate to it
      for (let i = 0; i < steps.length; i++) {
        const stepErrors = validateStep(steps[i].key);
        if (Object.values(stepErrors).some((e) => e !== null)) {
          setStepIndex(i);
          break;
        }
      }
      return;
    }

    setFieldErrors({});
    onSubmit(formToPayload(form));
  };

  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="patient-wizard">
      <div className="wizard-stepper">
        {steps.map((step, idx) => {
          const isDone = idx < stepIndex;
          const isActive = idx === stepIndex;
          const isLocked = idx > stepIndex;
          return (
            <div
              key={step.key}
              className={`wizard-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
            >
              {idx < steps.length - 1 && (
                <span className={`wizard-step-line ${isDone ? 'filled' : ''}`} />
              )}
              <button
                type="button"
                className="wizard-step-btn"
                disabled={isLocked}
                title={isLocked ? 'Selesaikan langkah sebelumnya terlebih dahulu' : step.label}
                onClick={() => {
                  if (isLocked) return;
                  setFieldErrors({});
                  setStepIndex(idx);
                }}
              >
                {isDone ? <span className="material-symbols-rounded">check</span> : idx + 1}
              </button>
              <span className="wizard-step-label">{step.label}</span>
            </div>
          );
        })}
      </div>

      <div className="wizard-progress">
        <div className="wizard-progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="wizard-progress-text">
        Langkah {stepIndex + 1} dari {steps.length} ({progressPct}%)
        {mode === 'create' && draftSavedAt && (
          <span className="wizard-draft-saved"> · Draf tersimpan {draftSavedAt}</span>
        )}
      </div>

      <div className="patient-form-card">
        <div className="modal-body">
          <div className="form-section-title">
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              {currentStep.icon}
            </span>
            {currentStep.label}
          </div>

          {submitError && <div className="satusehat-empty">{submitError}</div>}

          {currentStep.key === 'identitas' && (
            <div className="form-row">
              <div className="form-field">
                <label>No. Rekam Medis</label>
                <input type="text" value={noRmDisplay || 'Akan dibuat otomatis'} readOnly disabled />
              </div>
              <div className={`form-field full ${fieldErrors.name ? 'error' : ''}`}>
                <label>Nama Lengkap *</label>
                <input
                  type="text"
                  placeholder="Sesuai KTP / dokumen identitas resmi"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
              </div>
              <div className={`form-field ${fieldErrors.birthDate ? 'error' : ''}`}>
                <label>Tanggal Lahir *</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => update('birthDate', e.target.value)}
                />
                {fieldErrors.birthDate && <span className="field-error">{fieldErrors.birthDate}</span>}
              </div>
              <div className="form-field">
                <label>Umur</label>
                <input type="text" value={age !== null ? `${age} tahun` : '—'} readOnly disabled />
              </div>
              <div className="form-field">
                <label>Jenis Kelamin *</label>
                <CustomSelect
                  value={form.gender}
                  onChange={(v) => update('gender', v as UiGender)}
                  options={[
                    { value: 'laki-laki', label: 'Laki-laki' },
                    { value: 'perempuan', label: 'Perempuan' },
                  ]}
                  error={!!fieldErrors.gender}
                />
                {fieldErrors.gender && <span className="field-error">{fieldErrors.gender}</span>}
              </div>
              <div className="form-field full wizard-switch-field">
                <label>Pasien Bayi Baru Lahir (Belum Punya NIK)?</label>
                <button
                  type="button"
                  className={`wizard-switch ${form.isNewborn ? 'on' : ''}`}
                  onClick={() => update('isNewborn', !form.isNewborn)}
                >
                  <span className="wizard-switch-track" />
                </button>
              </div>
              <div className={`form-field ${fieldErrors.nik ? 'error' : ''}`}>
                <label>NIK {form.isNewborn ? '' : '*'}</label>
                <input
                  type="text"
                  placeholder="16 digit NIK"
                  value={form.nik}
                  onChange={(e) => update('nik', e.target.value)}
                  disabled={form.isNewborn}
                />
                {fieldErrors.nik && <span className="field-error">{fieldErrors.nik}</span>}
              </div>
              <div className={`form-field ${fieldErrors.phone ? 'error' : ''}`}>
                <label>Nomor Telepon (WA) *</label>
                <input
                  type="text"
                  placeholder="Contoh: 0812xxxxxxxx"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
                {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
              </div>
              <div className={`form-field ${fieldErrors.email ? 'error' : ''}`}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="nama@email.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>
              <div className="form-field">
                <label>Status Perkawinan</label>
                <CustomSelect
                  value={form.maritalStatus}
                  onChange={(v) => update('maritalStatus', v)}
                  options={[
                    { value: '', label: 'Tidak diisi' },
                    { value: 'single', label: 'Belum Menikah' },
                    { value: 'married', label: 'Menikah' },
                    { value: 'divorced', label: 'Cerai Hidup' },
                    { value: 'widowed', label: 'Cerai Mati' },
                  ]}
                  error={!!fieldErrors.maritalStatus}
                />
                {fieldErrors.maritalStatus && <span className="field-error">{fieldErrors.maritalStatus}</span>}
              </div>
              <div className="form-field">
                <label>Pekerjaan</label>
                <input
                  type="text"
                  placeholder="Contoh: Karyawan Swasta"
                  value={form.pekerjaan}
                  onChange={(e) => update('pekerjaan', e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep.key === 'alamat' && (
            <div className="form-row">
              <div className="form-field full">
                <label>Alamat Domisili</label>
                <textarea
                  placeholder="Alamat lengkap sesuai domisili saat ini"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Kelurahan</label>
                <input
                  type="text"
                  value={form.kelurahan}
                  onChange={(e) => update('kelurahan', e.target.value)}
                />
              </div>
              <div className={`form-field ${fieldErrors.kecamatan ? 'error' : ''}`}>
                <label>Kecamatan *</label>
                <input
                  type="text"
                  value={form.kecamatan}
                  onChange={(e) => update('kecamatan', e.target.value)}
                />
                {fieldErrors.kecamatan && <span className="field-error">{fieldErrors.kecamatan}</span>}
              </div>
              <div className={`form-field ${fieldErrors.city ? 'error' : ''}`}>
                <label>Kota / Kabupaten *</label>
                <input
                  type="text"
                  placeholder="Contoh: Bandung"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
                {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
              </div>
              <div className="form-field">
                <label>Provinsi</label>
                <input
                  type="text"
                  placeholder="Contoh: Jawa Barat"
                  value={form.province}
                  onChange={(e) => update('province', e.target.value)}
                />
              </div>
              <div className={`form-field ${fieldErrors.postalCode ? 'error' : ''}`}>
                <label>Kode Pos</label>
                <input
                  type="text"
                  placeholder="Contoh: 40123"
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                />
                {fieldErrors.postalCode && <span className="field-error">{fieldErrors.postalCode}</span>}
              </div>
            </div>
          )}

          {currentStep.key === 'wali' && isMinor && (
            <div className="form-row">
              <div className="form-field">
                <label>NIK Ibu</label>
                <input
                  type="text"
                  placeholder="16 digit NIK"
                  value={form.nikIbu}
                  onChange={(e) => update('nikIbu', e.target.value)}
                />
              </div>
              <div className={`form-field ${fieldErrors.namaWali ? 'error' : ''}`}>
                <label>Nama Wali *</label>
                <input
                  type="text"
                  value={form.namaWali}
                  onChange={(e) => update('namaWali', e.target.value)}
                />
                {fieldErrors.namaWali && <span className="field-error">{fieldErrors.namaWali}</span>}
              </div>
              <div className={`form-field ${fieldErrors.hubunganWali ? 'error' : ''}`}>
                <label>Hubungan Wali *</label>
                <CustomSelect
                  value={form.hubunganWali}
                  onChange={(v) => update('hubunganWali', v)}
                  options={[
                    { value: '', label: 'Pilih hubungan' },
                    { value: 'ibu', label: 'Ibu' },
                    { value: 'ayah', label: 'Ayah' },
                    { value: 'wali', label: 'Wali' },
                  ]}
                  error={!!fieldErrors.hubunganWali}
                />
                {fieldErrors.hubunganWali && <span className="field-error">{fieldErrors.hubunganWali}</span>}
              </div>
              <div className="form-field">
                <label>Anak ke-</label>
                <input
                  type="number"
                  min={1}
                  value={form.birthOrder}
                  onChange={(e) => update('birthOrder', e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep.key === 'marketing' && (
            <div className="form-row">
              <div className={`form-field full ${fieldErrors.sumberInformasi ? 'error' : ''}`}>
                <label>Sumber Informasi *</label>
                <CustomSelect
                  value={form.sumberInformasi}
                  onChange={(v) => update('sumberInformasi', v)}
                  options={SUMBER_OPTIONS}
                  error={!!fieldErrors.sumberInformasi}
                />
                {fieldErrors.sumberInformasi && <span className="field-error">{fieldErrors.sumberInformasi}</span>}
              </div>
              {form.sumberInformasi === 'lainnya' && (
                <div className={`form-field full ${fieldErrors.detailSumber ? 'error' : ''}`}>
                  <label>Detail Sumber *</label>
                  <input
                    type="text"
                    placeholder="Sebutkan sumber informasi"
                    value={form.detailSumber}
                    onChange={(e) => update('detailSumber', e.target.value)}
                  />
                  {fieldErrors.detailSumber && <span className="field-error">{fieldErrors.detailSumber}</span>}
                </div>
              )}
              <div className="form-field">
                <label>Kode Referral</label>
                <input
                  type="text"
                  value={form.kodeReferral}
                  onChange={(e) => update('kodeReferral', e.target.value)}
                />
              </div>
              <div className="form-field full wizard-autocomplete">
                <label>Direferensikan oleh Pasien Lain</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Cari nama atau No. RM pasien…"
                    value={form.referrerSearch}
                    onChange={(e) => {
                      update('referrerSearch', e.target.value);
                      if (form.referrerPatientId) update('referrerPatientId', null);
                    }}
                    style={{ flex: 1 }}
                  />
                  {form.referrerPatientId && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        update('referrerPatientId', null);
                        update('referrerSearch', '');
                        setReferrerResults([]);
                      }}
                      style={{ padding: '10px 14px', fontSize: '12.5px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {form.referrerPatientId && (
                  <div className="wizard-autocomplete-selected">
                    <span className="material-symbols-rounded">check_circle</span>
                    Pasien terpilih (ID #{form.referrerPatientId})
                  </div>
                )}
                {!form.referrerPatientId && form.referrerSearch && (
                  <div className="wizard-autocomplete-results">
                    {referrerLoading && <div className="wizard-autocomplete-item">Mencari…</div>}
                    {!referrerLoading && referrerResults.length === 0 && (
                      <div className="wizard-autocomplete-item">Tidak ditemukan</div>
                    )}
                    {!referrerLoading &&
                      referrerResults.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="wizard-autocomplete-item clickable"
                          onClick={() => {
                            update('referrerPatientId', p.id);
                            update('referrerSearch', `${p.name} (No.RM ${p.noRm})`);
                            setReferrerResults([]);
                          }}
                        >
                          {p.name} · No.RM {p.noRm}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep.key === 'medis' && (
            <div className="form-row">
              <div className="form-field">
                <label>Golongan Darah</label>
                <CustomSelect
                  value={form.golonganDarah}
                  onChange={(v) => update('golonganDarah', v)}
                  options={[
                    { value: '', label: 'Tidak diketahui' },
                    { value: 'A', label: 'A' },
                    { value: 'B', label: 'B' },
                    { value: 'AB', label: 'AB' },
                    { value: 'O', label: 'O' },
                  ]}
                  error={!!fieldErrors.golonganDarah}
                />
                {fieldErrors.golonganDarah && <span className="field-error">{fieldErrors.golonganDarah}</span>}
              </div>
              <div className="form-field">
                <label>Rhesus</label>
                <CustomSelect
                  value={form.rhesus}
                  onChange={(v) => update('rhesus', v)}
                  options={[
                    { value: '', label: 'Tidak diketahui' },
                    { value: 'positive', label: 'Positif (+)' },
                    { value: 'negative', label: 'Negatif (-)' },
                  ]}
                  error={!!fieldErrors.rhesus}
                />
                {fieldErrors.rhesus && <span className="field-error">{fieldErrors.rhesus}</span>}
              </div>
              <div className="form-field full wizard-switch-field">
                <label>Punya Alergi?</label>
                <button
                  type="button"
                  className={`wizard-switch ${form.punyaAlergi ? 'on' : ''}`}
                  onClick={() => update('punyaAlergi', !form.punyaAlergi)}
                >
                  <span className="wizard-switch-track" />
                </button>
              </div>
              {form.punyaAlergi && (
                <div className={`form-field full ${fieldErrors.catatanAlergi ? 'error' : ''}`}>
                  <label>Catatan Alergi *</label>
                  <textarea
                    placeholder="Sebutkan jenis alergi"
                    value={form.catatanAlergi}
                    onChange={(e) => update('catatanAlergi', e.target.value)}
                  />
                  {fieldErrors.catatanAlergi && <span className="field-error">{fieldErrors.catatanAlergi}</span>}
                </div>
              )}
            </div>
          )}

          {currentStep.key === 'preferensi' && (
            <div className="form-row">
              <div className="form-field">
                <label>Preferensi Kontak</label>
                <CustomSelect
                  value={form.preferensiKontak}
                  onChange={(v) => update('preferensiKontak', v)}
                  options={[
                    { value: '', label: 'Tidak diisi' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'telepon', label: 'Telepon' },
                    { value: 'email', label: 'Email' },
                  ]}
                  error={!!fieldErrors.preferensiKontak}
                />
                {fieldErrors.preferensiKontak && <span className="field-error">{fieldErrors.preferensiKontak}</span>}
              </div>
              <div className="form-field">
                <label>Preferensi Jam Kontak</label>
                <CustomSelect
                  value={form.preferensiJamKontak}
                  onChange={(v) => update('preferensiJamKontak', v)}
                  options={[
                    { value: '', label: 'Tidak diisi' },
                    { value: 'pagi', label: 'Pagi' },
                    { value: 'siang', label: 'Siang' },
                    { value: 'sore', label: 'Sore' },
                    { value: 'malam', label: 'Malam' },
                  ]}
                  error={!!fieldErrors.preferensiJamKontak}
                />
                {fieldErrors.preferensiJamKontak && <span className="field-error">{fieldErrors.preferensiJamKontak}</span>}
              </div>
              <div className="form-field full">
                <label>Catatan Preferensi</label>
                <textarea
                  value={form.catatanPreferensi}
                  onChange={(e) => update('catatanPreferensi', e.target.value)}
                />
              </div>
              <div className="form-field full wizard-switch-field">
                <label>Apakah Member?</label>
                <button
                  type="button"
                  className={`wizard-switch ${form.isMember ? 'on' : ''}`}
                  onClick={() => update('isMember', !form.isMember)}
                >
                  <span className="wizard-switch-track" />
                </button>
              </div>
              {form.isMember && (
                <div className={`form-field full ${fieldErrors.memberId ? 'error' : ''}`}>
                  <label>Member ID *</label>
                  <input
                    type="text"
                    value={form.memberId}
                    onChange={(e) => update('memberId', e.target.value)}
                  />
                  {fieldErrors.memberId && <span className="field-error">{fieldErrors.memberId}</span>}
                </div>
              )}
            </div>
          )}

          {currentStep.key === 'persetujuan' && (
            <div className="form-row">
              <div className={`form-field full wizard-consent-field ${fieldErrors.consentMarketing ? 'error' : ''}`}>
                <label className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={form.consentMarketing}
                    onChange={(e) => update('consentMarketing', e.target.checked)}
                  />
                  <span>
                    Saya menyetujui penggunaan data pribadi sesuai kebijakan privasi klinik.
                  </span>
                </label>
                {fieldErrors.consentMarketing && <span className="field-error">{fieldErrors.consentMarketing}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer wizard-footer">
          <div className="wizard-footer-left">
            <button type="button" className="btn-outline" onClick={onCancel}>
              Batalkan
            </button>
            {mode === 'create' && (
              <button type="button" className="btn-outline" onClick={handleSaveDraft}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  save
                </span>
                Save Draft
              </button>
            )}
          </div>
          <div className="wizard-footer-right">
            {stepIndex > 0 && (
              <button type="button" className="btn-outline" onClick={goPrev}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  arrow_back
                </span>
                Sebelumnya
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button type="button" className="btn-primary" onClick={goNext}>
                Selanjutnya
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  arrow_forward
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={handleSubmit}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                  save
                </span>
                {submitting ? 'Menyimpan…' : 'Submit Pasien'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
