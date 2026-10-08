'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiCheck,
  FiCloud,
  FiCopy,
  FiHome,
  FiPlus,
  FiTag,
  FiTrash2,
  FiUserPlus,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError, apiClient } from '@/lib/api-client';
import { clinicApi, type ClinicResponse } from '@/lib/clinic';
import { tarifApi } from '@/lib/tarif';
import { onboardingApi, type OnboardingStatus } from '@/lib/onboarding';
import { useToast } from '@/lib/toast-context';
import { useFeatures } from '@/lib/features-context';
import { AddressFields, cleanAddress, missingAddress } from '@/components/satusehat/AddressFields';
import {
  FACILITY_TYPE_LABELS,
  onboardingApi as satusehatOnboardingApi,
  type FacilityProfile,
  type FacilityType,
} from '@/lib/satusehat';
import SatusehatStep from './SatusehatStep';
import './onboarding.css';

const PLACEHOLDER_VALUES = new Set(['To be completed', '000000000']);
function stripPlaceholder(value?: string | null) {
  if (!value || PLACEHOLDER_VALUES.has(value)) return '';
  return value;
}

const ALL_STEPS = [
  { id: 1, label: 'Info Klinik', icon: FiHome },
  { id: 2, label: 'Tarif Layanan', icon: FiTag },
  { id: 3, label: 'Undang Dokter', icon: FiUserPlus },
  { id: 4, label: 'SATUSEHAT', icon: FiCloud },
] as const;

/**
 * Info klinik + profil fasyankes SATUSEHAT dalam satu form: alamat dipilih
 * dari master wilayah sekali, dipakai untuk data klinik dan SATUSEHAT.
 */
interface ClinicForm extends FacilityProfile {
  name: string;
  phone: string;
  email: string;
}

const EMPTY_CLINIC_FORM: ClinicForm = {
  name: '',
  phone: '',
  email: '',
  facilityType: null,
};

/** Data klinik + profil SATUSEHAT (alamat berkode wilayah bila sudah ada) → form */
function toClinicForm(clinic: ClinicResponse, profile?: FacilityProfile | null): ClinicForm {
  return {
    name: stripPlaceholder(clinic.name),
    phone: stripPlaceholder(clinic.phone) || profile?.phone || '',
    email: clinic.email ?? profile?.email ?? '',
    facilityType: profile?.facilityType ?? null,
    line: profile?.line ?? stripPlaceholder(clinic.address),
    provinceCode: profile?.provinceCode ?? null,
    provinceName: profile?.provinceName ?? null,
    cityCode: profile?.cityCode ?? null,
    cityName: profile?.cityName ?? null,
    districtCode: profile?.districtCode ?? null,
    districtName: profile?.districtName ?? null,
    villageCode: profile?.villageCode ?? null,
    villageName: profile?.villageName ?? null,
    rt: profile?.rt ?? null,
    rw: profile?.rw ?? null,
    postalCode: profile?.postalCode ?? clinic.postalCode ?? null,
    latitude: profile?.latitude ?? null,
    longitude: profile?.longitude ?? null,
  };
}

interface TarifRow {
  id: string;
  name: string;
  kategori: string;
  hargaJual: string;
}

// Only a React key for the row — crypto.randomUUID() needs iOS 15.4+, so
// older iPhones get a counter-based id instead.
let tarifRowSeq = 0;
function newTarifRow(): TarifRow {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `row-${Date.now()}-${++tarifRowSeq}`;
  return { id, name: '', kategori: '', hargaJual: '' };
}

interface InvitedDoctor {
  name: string;
  email: string;
  temporaryPassword: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { can } = useFeatures();
  const [satusehatDone, setSatusehatDone] = useState(false);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [step, setStep] = useState(1);

  const [clinicForm, setClinicForm] = useState<ClinicForm>(EMPTY_CLINIC_FORM);
  const [savingClinic, setSavingClinic] = useState(false);

  const [existingTarifCount, setExistingTarifCount] = useState(0);
  const [tarifRows, setTarifRows] = useState<TarifRow[]>([newTarifRow()]);
  const [savingTarif, setSavingTarif] = useState(false);

  const [doctorName, setDoctorName] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [invitingDoctor, setInvitingDoctor] = useState(false);
  const [invitedDoctors, setInvitedDoctors] = useState<InvitedDoctor[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [clinic, onboarding, tarifs, ssStatus] = await Promise.all([
        clinicApi.get(),
        onboardingApi.getStatus(),
        tarifApi.list({ limit: 1 }),
        // Klinik tanpa fitur SATUSEHAT: ditolak (403) → abaikan
        satusehatOnboardingApi.status().catch(() => null),
      ]);
      setClinicForm(toClinicForm(clinic, ssStatus?.profile));
      setStatus(onboarding);
      setExistingTarifCount(tarifs.meta?.total ?? 0);

      if (!onboarding.infoKlinik.complete) setStep(1);
      else if (!onboarding.tarif.complete) setStep(2);
      else if (!onboarding.dokter.complete) setStep(3);
      else setStep(ssStatus ? 4 : 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat data onboarding';
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const satusehatOn = can('satusehat');
  const STEPS = satusehatOn ? ALL_STEPS : ALL_STEPS.slice(0, 3);

  async function handleSaveClinic() {
    const missing = [
      !clinicForm.name.trim() && 'nama klinik',
      !clinicForm.phone.trim() && 'telepon',
      satusehatOn && !clinicForm.facilityType && 'jenis fasyankes',
      ...missingAddress(clinicForm),
    ].filter(Boolean);
    if (missing.length) {
      showError(`Lengkapi ${missing.join(', ')}`);
      return;
    }
    try {
      setSavingClinic(true);
      await clinicApi.update({
        name: clinicForm.name.trim(),
        address: clinicForm.line!.trim(),
        city: clinicForm.cityName ?? '',
        province: clinicForm.provinceName ?? '',
        postalCode: clinicForm.postalCode || undefined,
        phone: clinicForm.phone.trim(),
        email: clinicForm.email.trim() || undefined,
      });
      if (satusehatOn) {
        await satusehatOnboardingApi.saveProfile({
          ...(cleanAddress(clinicForm) ?? {}),
          facilityType: clinicForm.facilityType,
          phone: clinicForm.phone.trim() || null,
          email: clinicForm.email.trim() || null,
          latitude: clinicForm.latitude ?? null,
          longitude: clinicForm.longitude ?? null,
        });
      }
      success('Info klinik tersimpan');
      setStatus((prev) => (prev ? { ...prev, infoKlinik: { complete: true } } : prev));
      setStep(2);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan info klinik';
      showError(message);
    } finally {
      setSavingClinic(false);
    }
  }

  function updateTarifRow(id: string, patch: Partial<TarifRow>) {
    setTarifRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeTarifRow(id: string) {
    setTarifRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleSaveTarif() {
    const validRows = tarifRows.filter((r) => r.name.trim() && r.kategori.trim() && r.hargaJual.trim());
    if (validRows.length === 0 && existingTarifCount === 0) {
      showError('Tambahkan minimal 1 tarif (nama, kategori, dan harga jual wajib diisi)');
      return;
    }
    try {
      setSavingTarif(true);
      for (const row of validRows) {
        await tarifApi.create({
          name: row.name,
          kategori: row.kategori,
          hargaJual: Number(row.hargaJual),
        });
      }
      success(validRows.length > 0 ? `${validRows.length} tarif berhasil ditambahkan` : 'Tarif sudah lengkap');
      setExistingTarifCount((prev) => prev + validRows.length);
      setTarifRows([newTarifRow()]);
      setStatus((prev) => (prev ? { ...prev, tarif: { complete: true, count: prev.tarif.count + validRows.length } } : prev));
      setStep(3);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan tarif';
      showError(message);
    } finally {
      setSavingTarif(false);
    }
  }

  async function handleInviteDoctor() {
    if (!doctorName.trim() || !doctorEmail.trim()) {
      showError('Nama dan email dokter wajib diisi');
      return;
    }
    try {
      setInvitingDoctor(true);
      const res = await apiClient.post<{ temporaryPassword: string; email: string }>('/users/invite', {
        name: doctorName,
        email: doctorEmail,
        role: 'dokter',
      });
      setInvitedDoctors((prev) => [...prev, { name: doctorName, email: doctorEmail, temporaryPassword: res.temporaryPassword }]);
      setStatus((prev) => (prev ? { ...prev, dokter: { complete: true, count: prev.dokter.count + 1 } } : prev));
      setDoctorName('');
      setDoctorEmail('');
      success('Dokter berhasil diundang');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal mengundang dokter';
      showError(message);
    } finally {
      setInvitingDoctor(false);
    }
  }

  function handleCopyPassword(password: string) {
    navigator.clipboard?.writeText(password).then(
      () => success('Password disalin'),
      () => showError('Gagal menyalin password'),
    );
  }

  const allComplete = !!status?.allComplete && (!satusehatOn || satusehatDone);

  return (
    <DashboardLayout>
      <FeatureGuard feature="onboarding">
        <main className="content onboarding-page">
          <div className="onboarding-header">
            <div>
              <h1>Onboarding Klinik</h1>
              <p>Lengkapi {STEPS.length} langkah ini supaya klinik Anda siap menerima pasien.</p>
            </div>
            <button type="button" className="btn-outline" onClick={() => router.push('/dashboard')}>
              Lewati untuk sekarang
            </button>
          </div>

          <div className="onboarding-steps">
            {STEPS.map((s) => {
              const complete =
                (s.id === 1 && status?.infoKlinik.complete) ||
                (s.id === 2 && status?.tarif.complete) ||
                (s.id === 3 && status?.dokter.complete) ||
                (s.id === 4 && satusehatDone);
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`onboarding-step ${step === s.id ? 'active' : ''} ${complete ? 'complete' : ''}`}
                  onClick={() => setStep(s.id)}
                >
                  <span className="onboarding-step-icon">{complete ? <FiCheck /> : <Icon />}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="onboarding-card">Memuat...</div>
          ) : allComplete ? (
            <div className="onboarding-card onboarding-done">
              <FiCheck className="onboarding-done-icon" />
              <h2>Klinik Anda sudah siap!</h2>
              <p>
                Info klinik, tarif layanan, dan dokter sudah lengkap
                {satusehatOn ? ', dan klinik sudah terhubung ke SATUSEHAT' : ''}.
              </p>
              <button type="button" className="btn-primary" onClick={() => router.push('/dashboard')}>
                Ke Dashboard
              </button>
            </div>
          ) : (
            <div className="onboarding-card">
              {step === 1 && (
                <div className="onboarding-step-body">
                  <h2>Info Klinik</h2>
                  <p className="onboarding-step-desc">Data dasar klinik Anda — akan tampil di dokumen &amp; halaman booking publik.</p>
                  <div className="onboarding-form-grid">
                    <label>
                      Nama Klinik
                      <input value={clinicForm.name} onChange={(e) => setClinicForm((p) => ({ ...p, name: e.target.value }))} />
                    </label>
                    <label>
                      Nomor Telepon
                      <input value={clinicForm.phone} onChange={(e) => setClinicForm((p) => ({ ...p, phone: e.target.value }))} />
                    </label>
                    <label>
                      Email Klinik (opsional)
                      <input type="email" value={clinicForm.email} onChange={(e) => setClinicForm((p) => ({ ...p, email: e.target.value }))} />
                    </label>
                    {satusehatOn && (
                      <label>
                        Jenis Fasyankes
                        <select
                          aria-label="Jenis fasyankes"
                          value={clinicForm.facilityType ?? ''}
                          onChange={(e) =>
                            setClinicForm((p) => ({ ...p, facilityType: (e.target.value || null) as FacilityType | null }))
                          }
                        >
                          <option value="">Pilih jenis fasyankes</option>
                          {Object.entries(FACILITY_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="span-2 onboarding-address">
                      <AddressFields value={clinicForm} onChange={(a) => setClinicForm((p) => ({ ...p, ...a }))} />
                    </div>
                  </div>
                  <div className="onboarding-actions">
                    <button type="button" className="btn-primary" onClick={handleSaveClinic} disabled={savingClinic}>
                      {savingClinic ? 'Menyimpan...' : 'Simpan & Lanjut'}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="onboarding-step-body">
                  <h2>Tarif Layanan</h2>
                  <p className="onboarding-step-desc">
                    Tambahkan minimal 1 layanan/tindakan yang klinik Anda tawarkan.
                    {existingTarifCount > 0 && ` Saat ini sudah ada ${existingTarifCount} tarif.`}
                  </p>
                  <div className="onboarding-tarif-rows">
                    {tarifRows.map((row) => (
                      <div key={row.id} className="onboarding-tarif-row">
                        <input
                          placeholder="Nama tindakan (mis. Konsultasi Umum)"
                          value={row.name}
                          onChange={(e) => updateTarifRow(row.id, { name: e.target.value })}
                        />
                        <input
                          placeholder="Kategori (mis. Konsultasi)"
                          value={row.kategori}
                          onChange={(e) => updateTarifRow(row.id, { kategori: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Harga jual"
                          value={row.hargaJual}
                          onChange={(e) => updateTarifRow(row.id, { hargaJual: e.target.value })}
                        />
                        <button aria-label="Hapus baris tarif"
                          type="button"
                          className="onboarding-row-remove"
                          onClick={() => removeTarifRow(row.id)}
                          disabled={tarifRows.length === 1}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="onboarding-add-row" onClick={() => setTarifRows((prev) => [...prev, newTarifRow()])}>
                    <FiPlus /> Tambah Baris
                  </button>
                  <div className="onboarding-actions">
                    <button type="button" className="btn-outline" onClick={() => setStep(1)}>
                      Kembali
                    </button>
                    <button type="button" className="btn-primary" onClick={handleSaveTarif} disabled={savingTarif}>
                      {savingTarif ? 'Menyimpan...' : 'Simpan & Lanjut'}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="onboarding-step-body">
                  <h2>Undang Dokter</h2>
                  <p className="onboarding-step-desc">Undang minimal 1 dokter agar klinik dapat menangani kunjungan pasien.</p>
                  <div className="onboarding-form-grid">
                    <label>
                      Nama Dokter
                      <input placeholder="Dr. Jane Smith" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                    </label>
                    <label>
                      Email Dokter
                      <input type="email" placeholder="dokter@klinik.com" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} />
                    </label>
                  </div>
                  <div className="onboarding-actions">
                    <button type="button" className="btn-primary" onClick={handleInviteDoctor} disabled={invitingDoctor}>
                      {invitingDoctor ? 'Mengundang...' : 'Undang Dokter'}
                    </button>
                  </div>

                  {invitedDoctors.length > 0 && (
                    <div className="onboarding-invited-list">
                      {invitedDoctors.map((d, idx) => (
                        <div key={idx} className="onboarding-invited-item">
                          <div>
                            <strong>{d.name}</strong>
                            <span>{d.email}</span>
                          </div>
                          <div className="onboarding-invited-password">
                            <span>Password sementara: <code>{d.temporaryPassword}</code></span>
                            <button aria-label="Salin password" type="button" onClick={() => handleCopyPassword(d.temporaryPassword)} title="Salin password">
                              <FiCopy />
                            </button>
                          </div>
                          <p className="onboarding-invited-hint">Bagikan password ini ke dokter agar bisa login pertama kali.</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {status?.dokter.complete && (
                    <div className="onboarding-actions">
                      <button type="button" className="btn-outline" onClick={() => setStep(2)}>
                        Kembali
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => (satusehatOn ? setStep(4) : router.push('/dashboard'))}
                      >
                        {satusehatOn ? 'Lanjut' : 'Selesai'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {step === 4 && satusehatOn && <SatusehatStep onChanged={setSatusehatDone} />}
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
