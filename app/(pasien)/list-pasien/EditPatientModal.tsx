'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { Patient, PatientPayload, MaritalStatus } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';

type UiGender = 'laki-laki' | 'perempuan';

function apiGenderToUiGender(gender: Patient['gender']): UiGender {
  return gender === 'male' ? 'laki-laki' : 'perempuan';
}

function uiGenderToApi(gender: UiGender): 'male' | 'female' {
  return gender === 'laki-laki' ? 'male' : 'female';
}

interface EditPatientModalProps {
  patient: Patient;
  onClose: () => void;
  onSave: (payload: Partial<PatientPayload>) => Promise<void>;
}

export default function EditPatientModal({ patient, onClose, onSave }: EditPatientModalProps) {
  const [form, setForm] = useState({
    name: patient.name,
    gender: apiGenderToUiGender(patient.gender),
    nik: patient.nik || '',
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    phone: patient.phone || '',
    email: patient.email || '',
    address: patient.address || '',
    city: patient.city || '',
    province: patient.province || '',
    postalCode: patient.postalCode || '',
    maritalStatus: (patient.maritalStatus || '') as '' | MaritalStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name,
        gender: uiGenderToApi(form.gender),
        nik: form.nik || undefined,
        dateOfBirth: form.birthDate || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        postalCode: form.postalCode || undefined,
        maritalStatus: form.maritalStatus || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memperbarui data pasien');
      setSaving(false);
    }
  };

  return (
    <div className="list-pasien-modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <span className="material-symbols-rounded">edit</span>
            </div>
            <div>
              <h2>Edit Data Pasien</h2>
              <p>Perbarui informasi demografis pasien</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="satusehat-empty">{error}</div>}
            <div className="form-row">
              <div className="form-field full">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Jenis Kelamin</label>
                <CustomSelect
                  value={form.gender}
                  onChange={(value) => setForm({ ...form, gender: value as UiGender })}
                  options={[
                    { value: 'laki-laki', label: 'Laki-laki' },
                    { value: 'perempuan', label: 'Perempuan' },
                  ]}
                />
              </div>
              <div className="form-field">
                <label>Tanggal Lahir</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>NIK</label>
                <input
                  type="text"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Nomor Telepon</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Status Perkawinan</label>
                <CustomSelect
                  value={form.maritalStatus}
                  onChange={(value) =>
                    setForm({ ...form, maritalStatus: value as '' | MaritalStatus })
                  }
                  options={[
                    { value: '', label: 'Tidak diisi' },
                    { value: 'single', label: 'Belum Menikah' },
                    { value: 'married', label: 'Menikah' },
                    { value: 'divorced', label: 'Cerai Hidup' },
                    { value: 'widowed', label: 'Cerai Mati' },
                  ]}
                />
              </div>
              <div className="form-field full">
                <label>Alamat Domisili</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Kota / Kabupaten</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Provinsi</label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Kode Pos</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline" onClick={onClose}>
              Batalkan
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                save
              </span>
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
