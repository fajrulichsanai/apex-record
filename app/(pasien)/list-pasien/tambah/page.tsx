'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientWizard, { PATIENT_DRAFT_KEY } from '@/components/pasien/PatientWizard';
import { patientsApi, PatientPayload } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';
import '../../../styles/list-pasien.css';

export default function TambahPasienPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (payload: PatientPayload) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await patientsApi.create(payload);
      localStorage.removeItem(PATIENT_DRAFT_KEY);
      router.push(`/list-pasien?patientId=${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal menyimpan data pasien');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => router.push('/list-pasien');

  return (
    <DashboardLayout>
      <main className="content patient-form-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Registrasi Pasien Baru</h1>
            </div>
            <p className="page-subtitle">Lengkapi data pasien langkah demi langkah</p>
          </div>
        </div>

        <PatientWizard
          mode="create"
          submitting={submitting}
          submitError={submitError}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </main>
    </DashboardLayout>
  );
}
