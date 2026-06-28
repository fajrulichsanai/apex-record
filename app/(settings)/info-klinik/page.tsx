'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import {
  clinicApi,
  daysToOperationalHours,
  operationalHoursToDays,
  type ClinicDayHours,
} from '@/lib/clinic';
import '../../styles/info-klinik.css';

interface ClinicInfo {
  nama: string;
  telepon: string;
  email: string;
  website: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  nomorSip: string;
}

type DayHours = ClinicDayHours;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const EMPTY_INFO: ClinicInfo = {
  nama: '',
  telepon: '',
  email: '',
  website: '',
  alamat: '',
  kota: '',
  provinsi: '',
  kodePos: '',
  nomorSip: '',
};

function FieldEditWrap({
  isEditing,
  icon,
  value,
  placeholder,
  onChange,
  type = 'text',
  isTextarea = false,
}: {
  isEditing: boolean;
  icon: ReactNode;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: string;
  isTextarea?: boolean;
}) {
  const hasValue = !!value;

  if (!isEditing) {
    return (
      <div className={`field-display${isTextarea ? ' textarea-display' : ''}${!hasValue ? ' placeholder-val' : ''}`}>
        {icon}
        <span>{hasValue ? value : placeholder}</span>
      </div>
    );
  }

  if (isTextarea) {
    return (
      <textarea
        className="field-input-real textarea-real"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className="field-input-real"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TimePicker({
  active,
  hVal,
  mVal,
  onHChange,
  onMChange,
}: {
  active: boolean;
  hVal: string;
  mVal: string;
  onHChange: (v: string) => void;
  onMChange: (v: string) => void;
}) {
  return (
    <div className={`time-picker${active ? ' active' : ''}`}>
      <div className="tp-select">
        <CustomSelect
          disabled={!active}
          value={hVal}
          onChange={onHChange}
          options={[
            { value: '', label: '--' },
            ...HOURS.map((h) => ({ value: h, label: h })),
          ]}
        />
      </div>
      <span className="tp-colon">:</span>
      <div className="tp-select tp-select-min">
        <CustomSelect
          disabled={!active}
          value={mVal || '00'}
          onChange={onMChange}
          options={MINUTES.map((m) => ({ value: m, label: m }))}
        />
      </div>
    </div>
  );
}

export default function InfoKlinikPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<ClinicInfo>(EMPTY_INFO);
  const [days, setDays] = useState<DayHours[]>(operationalHoursToDays());

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, isOpen: false }));

  const loadClinic = useCallback(async () => {
    try {
      setLoading(true);
      const clinic = await clinicApi.get();
      setInfo({
        nama: clinic.name ?? '',
        telepon: clinic.phone ?? '',
        email: clinic.email ?? '',
        website: clinic.website ?? '',
        alamat: clinic.address ?? '',
        kota: clinic.city ?? '',
        provinsi: clinic.province ?? '',
        kodePos: clinic.postalCode ?? '',
        nomorSip: clinic.sipNumber ?? '',
      });
      setDays(operationalHoursToDays(clinic.operationalHours));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat info klinik';
      setFeedback({ isOpen: true, type: 'error', title: 'Gagal Memuat Data', message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClinic();
  }, [loadClinic]);

  function updateInfo(field: keyof ClinicInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
  }

  function updateDay(id: string, patch: Partial<DayHours>) {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handleToggleEdit() {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      setSaving(true);
      await clinicApi.update({
        name: info.nama,
        address: info.alamat,
        city: info.kota,
        province: info.provinsi,
        postalCode: info.kodePos || undefined,
        phone: info.telepon,
        email: info.email || undefined,
        website: info.website || undefined,
        sipNumber: info.nomorSip || undefined,
        operationalHours: daysToOperationalHours(days),
      });
      setFeedback({
        isOpen: true,
        type: 'success',
        title: 'Berhasil',
        message: 'Profil klinik berhasil diperbarui',
      });
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan info klinik';
      setFeedback({ isOpen: true, type: 'error', title: 'Gagal Menyimpan', message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <main className="content">
        <div className="info-klinik-page">
          <div className="page-content">
            <div className="page-title-row">
              <div className="page-title-group">
                <div className="page-title-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <div className="page-title-text">
                  <h1>Info Klinik</h1>
                  <p>Informasi dan pengaturan klinik</p>
                </div>
              </div>
              <button
                className={`main-btn ${isEditing ? 'mode-save' : 'mode-edit'}`}
                onClick={handleToggleEdit}
                disabled={loading || saving}
              >
                {isEditing ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
                <span>{saving ? 'Menyimpan...' : isEditing ? 'Simpan' : 'Edit'}</span>
              </button>
            </div>

            <div className="grid-two">
              {/* LEFT COLUMN */}
              <div>
                {/* Informasi Dasar */}
                <div className="card">
                  <div className="card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    Informasi Dasar
                  </div>
                  <div className="card-body">
                    <div className="field">
                      <label className="field-label">Nama Klinik</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                        }
                        value={info.nama}
                        onChange={(v) => updateInfo('nama', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Nomor Telepon</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                          </svg>
                        }
                        value={info.telepon}
                        type="tel"
                        onChange={(v) => updateInfo('telepon', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Email Klinik</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        }
                        value={info.email}
                        type="email"
                        onChange={(v) => updateInfo('email', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Website (opsional)</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                          </svg>
                        }
                        value={info.website}
                        type="url"
                        placeholder="https://www.klinik.com"
                        onChange={(v) => updateInfo('website', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Nomor SIP (opsional)</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        }
                        value={info.nomorSip}
                        placeholder="Nomor Surat Izin Praktik"
                        onChange={(v) => updateInfo('nomorSip', v)}
                      />
                    </div>
                  </div>
                </div>

                {/* Alamat */}
                <div className="card">
                  <div className="card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Alamat
                  </div>
                  <div className="card-body">
                    <div className="field">
                      <label className="field-label">Alamat Lengkap</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        isTextarea
                        icon={
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginTop: 2 }}
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        }
                        value={info.alamat}
                        onChange={(v) => updateInfo('alamat', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Kota</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        }
                        value={info.kota}
                        onChange={(v) => updateInfo('kota', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Provinsi</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        }
                        value={info.provinsi}
                        onChange={(v) => updateInfo('provinsi', v)}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Kode Pos (opsional)</label>
                      <FieldEditWrap
                        isEditing={isEditing}
                        icon={
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                        }
                        value={info.kodePos}
                        onChange={(v) => updateInfo('kodePos', v)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div>
                <div className="card">
                  <div className="card-header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Jam Operasional
                  </div>

                  <div className="info-banner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Aktifkan hari dan atur jam buka–tutup klinik.
                  </div>

                  <div className="hours-list">
                    {days.map((d) => {
                      const canEdit = isEditing && d.active;
                      return (
                        <div
                          key={d.id}
                          className={`hours-row${d.active ? '' : ' day-off'}${isEditing ? ' can-toggle' : ''}`}
                        >
                          <div className="day-label">
                            <label className={`toggle${isEditing ? '' : ' locked'}`}>
                              <input
                                type="checkbox"
                                checked={d.active}
                                disabled={!isEditing}
                                onChange={(e) => updateDay(d.id, { active: e.target.checked })}
                              />
                              <span className="toggle-track" />
                            </label>
                            {d.label}
                          </div>

                          <TimePicker
                            active={canEdit}
                            hVal={d.buka}
                            mVal={d.bukaM}
                            onHChange={(v) => updateDay(d.id, { buka: v })}
                            onMChange={(v) => updateDay(d.id, { bukaM: v })}
                          />

                          <span className="hours-sep">–</span>

                          <TimePicker
                            active={canEdit}
                            hVal={d.tutup}
                            mVal={d.tutupM}
                            onHChange={(v) => updateDay(d.id, { tutup: v })}
                            onMChange={(v) => updateDay(d.id, { tutupM: v })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <FeedbackModal
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        actionButton={{ label: 'OK', onClick: closeFeedback }}
      />
    </DashboardLayout>
  );
}
