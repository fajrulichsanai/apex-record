'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientWizard from '@/components/pasien/PatientWizard';
import { patientsApi, PatientPayload } from '@/lib/patients';
import { reservationsApi } from '@/lib/reservations';
import { encounterApi } from '@/lib/encounter';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import '../../../styles/list-pasien.css';

export default function TambahPasienPage() {
  return (
    <Suspense fallback={null}>
      <TambahPasienPageInner />
    </Suspense>
  );
}

function TambahPasienPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const reservationId = searchParams.get('reservationId');
  const prefill = {
    name: searchParams.get('nama') || undefined,
    phone: searchParams.get('telp') || undefined,
    nik: searchParams.get('nik') || undefined,
  };

  const handleSubmit = async (payload: PatientPayload) => {
    setSubmitting(true);
    try {
      const created = await patientsApi.create(payload);

      if (reservationId) {
        const reservation = await reservationsApi.linkPatient(Number(reservationId), created.id);
        if (reservation.practitionerId) {
          const encounter = await encounterApi.create({
            patientId: created.id,
            practitionerId: reservation.practitionerId,
            reservationId: reservation.id,
            chiefComplaint: reservation.notes || undefined,
          });
          router.push(`/list-kunjungan?encounterId=${encounter.id}`);
        } else {
          toast.success('Pasien terdaftar. Pilih dokter untuk menyelesaikan check-in.');
          router.push(`/list-kunjungan?openAddVisit=1&reservationId=${reservation.id}`);
        }
        return;
      }

      router.push(`/list-pasien?patientId=${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan data pasien');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => router.push(reservationId ? '/reservasi' : '/list-pasien');

  return (
    <DashboardLayout>
      <main className="content patient-form-page">
        <PatientWizard
          mode="create"
          prefill={prefill}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </main>
    </DashboardLayout>
  );
}
