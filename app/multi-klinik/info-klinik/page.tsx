'use client';

import { useEffect, useState } from 'react';
import MultiClinicLayout from '@/components/layout/MultiClinicLayout';
import CustomSelect from '@/components/form/CustomSelect';
import ClinicInfoForm from '@/components/clinic/ClinicInfoForm';
import { multiClinicApi, type OwnedClinic } from '@/lib/multi-clinic';
import { ApiError } from '@/lib/api-client';
import '../../styles/super-admin.css';

export default function MultiClinicInfoKlinikPage() {
  const [clinics, setClinics] = useState<OwnedClinic[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await multiClinicApi.myClinics();
        setClinics(data);
        if (data.length > 0) setSelectedId(String(data[0].id));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar klinik');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const clinicOptions = clinics.map((c) => ({ value: String(c.id), label: c.name }));
  const selectedClinic = clinics.find((c) => String(c.id) === selectedId);

  return (
    <MultiClinicLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Info Klinik</h1>
            </div>
            <p className="page-subtitle">Pilih salah satu klinik Anda untuk melihat atau mengubah informasinya.</p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <p>Memuat...</p>
        ) : clinics.length === 0 ? (
          <div className="alert-error" style={{ background: '#F5F6FA', color: '#6B7A99', border: '1px solid #E8ECF4' }}>
            Belum ada klinik yang dihubungkan ke akun Anda. Hubungi Super Admin untuk menghubungkan klinik.
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 20, maxWidth: 360 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                Klinik
              </label>
              <CustomSelect
                value={selectedId}
                onChange={setSelectedId}
                options={clinicOptions}
                placeholder="Pilih klinik..."
              />
            </div>

            {selectedClinic && (
              <ClinicInfoForm
                key={selectedClinic.id}
                title={`Info Klinik — ${selectedClinic.name}`}
                canEdit
                fetchClinic={() => multiClinicApi.getClinic(selectedClinic.id)}
                updateClinic={(payload) => multiClinicApi.updateClinic(selectedClinic.id, payload)}
                uploadLogo={(file) => multiClinicApi.uploadClinicLogo(selectedClinic.id, file)}
              />
            )}
          </>
        )}
      </div>
    </MultiClinicLayout>
  );
}
