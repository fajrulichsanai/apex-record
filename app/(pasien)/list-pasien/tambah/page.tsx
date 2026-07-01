'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientWizard from '@/components/pasien/PatientWizard';
import { patientsApi, PatientPayload } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../styles/list-pasien.css';

export default function TambahPasienPage() {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: PatientPayload) => {
    setSubmitting(true);
    try {
      const created = await patientsApi.create(payload);
      router.push(`/list-pasien?patientId=${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan data pasien');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => router.push('/list-pasien');

  return (
    <DashboardLayout>
      <main className="content patient-form-page">
        <PatientWizard
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </main>
    </DashboardLayout>
  );
}
