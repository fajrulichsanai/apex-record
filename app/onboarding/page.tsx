'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiCheck,
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
import { clinicApi } from '@/lib/clinic';
import { tarifApi } from '@/lib/tarif';
import { onboardingApi, type OnboardingStatus } from '@/lib/onboarding';
import { useToast } from '@/lib/toast-context';
import './onboarding.css';

const PLACEHOLDER_VALUES = new Set(['To be completed', '000000000']);
function stripPlaceholder(value?: string | null) {
  if (!value || PLACEHOLDER_VALUES.has(value)) return '';
  return value;
}

const STEPS = [
  { id: 1, label: 'Info Klinik', icon: FiHome },
  { id: 2, label: 'Tarif Layanan', icon: FiTag },
  { id: 3, label: 'Undang Dokter', icon: FiUserPlus },
] as const;

interface ClinicForm {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
}

const EMPTY_CLINIC_FORM: ClinicForm = {
  name: '',
  address: '',
  city: '',
  province: '',
  phone: '',
  email: '',
};

interface TarifRow {
  id: string;
  name: string;
  kategori: string;
  hargaJual: string;
}

function newTarifRow(): TarifRow {
  return { id: crypto.randomUUID(), name: '', kategori: '', hargaJual: '' };
}

interface InvitedDoctor {
  name: string;
  email: string;
  temporaryPassword: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

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
      const [clinic, onboarding, tarifs] = await Promise.all([
        clinicApi.get(),
        onboardingApi.getStatus(),
        tarifApi.list({ limit: 1 }),
      ]);
      setClinicForm({
        name: stripPlaceholder(clinic.name),
        address: stripPlaceholder(clinic.address),
        city: stripPlaceholder(clinic.city),
        province: stripPlaceholder(clinic.province),
        phone: stripPlaceholder(clinic.phone),
        email: clinic.email ?? '',
      });
      setStatus(onboarding);
      setExistingTarifCount(tarifs.meta?.total ?? 0);

      if (!onboarding.infoKlinik.complete) setStep(1);
      else if (!onboarding.tarif.complete) setStep(2);
      else if (!onboarding.dokter.complete) setStep(3);
      else setStep(1);
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

  async function handleSaveClinic() {
    if (!clinicForm.name || !clinicForm.address || !clinicForm.city || !clinicForm.province || !clinicForm.phone) {
      showError('Nama, alamat, kota, provinsi, dan telepon wajib diisi');
      return;
    }
    try {
      setSavingClinic(true);
      await clinicApi.update({
        name: clinicForm.name,
        address: clinicForm.address,
        city: clinicForm.city,
        province: clinicForm.province,
        phone: clinicForm.phone,
        email: clinicForm.email || undefined,
      });
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

  const allComplete = !!status?.allComplete;

  return (
    <DashboardLayout>
      <FeatureGuard feature="onboarding">
        <main className="content onboarding-page">
          <div className="onboarding-header">
            <div>
              <h1>Onboarding Klinik</h1>
              <p>Lengkapi 3 langkah ini supaya klinik Anda siap menerima pasien.</p>
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
                (s.id === 3 && status?.dokter.complete);
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
              <p>Info klinik, tarif layanan, dan dokter sudah lengkap.</p>
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
                    <label className="span-2">
                      Alamat Lengkap
                      <textarea value={clinicForm.address} onChange={(e) => setClinicForm((p) => ({ ...p, address: e.target.value }))} />
                    </label>
                    <label>
                      Kota
                      <input value={clinicForm.city} onChange={(e) => setClinicForm((p) => ({ ...p, city: e.target.value }))} />
                    </label>
                    <label>
                      Provinsi
                      <input value={clinicForm.province} onChange={(e) => setClinicForm((p) => ({ ...p, province: e.target.value }))} />
                    </label>
                    <label className="span-2">
                      Email Klinik (opsional)
                      <input type="email" value={clinicForm.email} onChange={(e) => setClinicForm((p) => ({ ...p, email: e.target.value }))} />
                    </label>
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
                        <button
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
                            <button type="button" onClick={() => handleCopyPassword(d.temporaryPassword)} title="Salin password">
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
                      <button type="button" className="btn-primary" onClick={() => router.push('/dashboard')}>
                        Selesai
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
