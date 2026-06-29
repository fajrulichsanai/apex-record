'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientWizard from '@/components/pasien/PatientWizard';
import { patientsApi, Patient, PatientPayload } from '@/lib/patients';
import { ApiError } from '@/lib/api-client';
import '../../../../styles/list-pasien.css';

export default function EditPasienPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = Number(params.id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setLoadError(null);
    patientsApi
      .get(patientId)
      .then((data) => setPatient(data))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data pasien');
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  const handleCancel = () => router.push('/list-pasien');

  const handleSubmit = async (payload: PatientPayload) => {
    if (!patient) return;
    setSaveError(null);
    setSaving(true);
    try {
      await patientsApi.update(patient.id, payload);
      router.push(`/list-pasien?patientId=${patient.id}`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Gagal memperbarui data pasien');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="content patient-form-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Edit Data Pasien</h1>
            </div>
            <p className="page-subtitle">Perbarui informasi pasien langkah demi langkah</p>
          </div>
        </div>

        {loading && <div className="patient-form-card modal-body">Memuat data pasien…</div>}

        {!loading && loadError && (
          <div className="patient-form-card modal-body">
            <div className="satusehat-empty">
              <span className="material-symbols-rounded">error</span>
              <div className="empty-title">Gagal memuat data</div>
              <div className="empty-sub">{loadError}</div>
            </div>
          </div>
        )}

        {!loading && !loadError && patient && (
          <PatientWizard
            mode="edit"
            initialPatient={patient}
            noRmDisplay={patient.noRm}
            submitting={saving}
            submitError={saveError}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </main>
    </DashboardLayout>
  );
}
