'use client';

import { useEffect, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { apiClient, ApiError } from '@/lib/api-client';
import { clinicApi, type ClinicResponse } from '@/lib/clinic';
import type { UserRole } from '@/types/user';
import { Modal } from './ui';

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  multi_clinic_owner: 'Multi-Klinik Owner',
  owner: 'Owner',
  manajer_cabang: 'Manajer Cabang',
  admin: 'Admin',
  dokter: 'Dokter',
  perawat: 'Perawat',
  pending: 'Menunggu peran',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'owner', label: 'Owner klinik' },
  { value: 'admin', label: 'Admin' },
  { value: 'dokter', label: 'Dokter' },
  { value: 'perawat', label: 'Perawat' },
  { value: 'manajer_cabang', label: 'Manajer Cabang' },
  { value: 'multi_clinic_owner', label: 'Multi-Klinik Owner' },
  { value: 'super_admin', label: 'Super Admin' },
];

const CLINICLESS: UserRole[] = ['super_admin', 'multi_clinic_owner'];

/**
 * "Undang pengguna" untuk Super Admin (PRD PG-02, MO-01): akun Super Admin,
 * Multi-Klinik Owner, atau akun klinik (wajib pilih klinik). Password
 * sementara dikirim ke email dan ditampilkan sekali di sini.
 */
export default function InviteUserModal({
  fixedRole,
  fixedClinicId,
  onClose,
  onCreated,
}: {
  fixedRole?: UserRole;
  fixedClinicId?: number;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(fixedRole ?? 'owner');
  const [clinicId, setClinicId] = useState(fixedClinicId ? String(fixedClinicId) : '');
  const [clinics, setClinics] = useState<ClinicResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string; emailSent?: boolean } | null>(null);
  const needsClinic = !CLINICLESS.includes(role);

  useEffect(() => {
    if (fixedClinicId || !needsClinic || clinics.length) return;
    clinicApi
      .listAll()
      .then(setClinics)
      .catch(() => setClinics([]));
  }, [fixedClinicId, needsClinic, clinics.length]);

  const valid = name.trim() && /\S+@\S+\.\S+/.test(email) && (!needsClinic || clinicId);

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.post<{ temporaryPassword: string; email: string; emailSent?: boolean }>('/users/invite', {
        name: name.trim(),
        email: email.trim(),
        role,
        ...(needsClinic ? { clinicId: Number(clinicId) } : {}),
      });
      setCreated(res);
      onCreated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal membuat akun');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={fixedRole === 'multi_clinic_owner' ? 'Buat akun Multi-Klinik Owner' : 'Undang pengguna'}
      onClose={onClose}
      busy={busy}
      footer={
        created ? (
          <button type="button" className="btn-primary" onClick={onClose}>
            Selesai
          </button>
        ) : (
          <>
            <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
              Batal
            </button>
            <button type="button" className="btn-primary" onClick={submit} disabled={!valid || busy}>
              {busy ? 'Membuat...' : 'Buat akun'}
            </button>
          </>
        )
      }
    >
      {created ? (
        <>
          <p className="sa-notice sa-notice-ok">
            Akun <strong>{created.email}</strong> dibuat.{' '}
            {created.emailSent
              ? 'Password sementara sudah dikirim ke email tersebut.'
              : 'Email gagal terkirim — bagikan password di bawah secara langsung.'}{' '}
            Pengguna wajib menggantinya saat login pertama.
          </p>
          <div className="sa-field">
            <label htmlFor="temp-pass">Password sementara</label>
            <input id="temp-pass" type="text" readOnly value={created.temporaryPassword} onFocus={(e) => e.target.select()} />
          </div>
        </>
      ) : (
        <>
          {error && <p className="sa-notice sa-notice-bad">{error}</p>}
          <div className="sa-field">
            <label htmlFor="invite-name">Nama</label>
            <input id="invite-name" type="text" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="sa-field">
            <label htmlFor="invite-email">Email</label>
            <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!fixedRole && (
            <div className="sa-field">
              <label>Peran</label>
              <CustomSelect value={role} onChange={(v) => setRole(v as UserRole)} options={ROLE_OPTIONS} />
            </div>
          )}
          {needsClinic && !fixedClinicId && (
            <div className="sa-field">
              <label>Klinik</label>
              <CustomSelect
                value={clinicId}
                onChange={setClinicId}
                options={clinics.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="Pilih klinik..."
              />
            </div>
          )}
          {role === 'multi_clinic_owner' && (
            <p className="text-sub">Setelah akun dibuat, hubungkan klinik-kliniknya di halaman Multi-Klinik Owner.</p>
          )}
        </>
      )}
    </Modal>
  );
}
