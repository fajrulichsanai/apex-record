'use client';

import { useEffect, useRef, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { clinicApi, ClinicResponse } from '@/lib/clinic';
import { patientImportApi, PatientImportSummary } from '@/lib/patient-import';
import { ApiError } from '@/lib/api-client';
import '../../styles/super-admin.css';

export default function SuperAdminPatientMigrationPage() {
  const [clinics, setClinics] = useState<ClinicResponse[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicId, setClinicId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PatientImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clinicApi
      .listAll()
      .then(setClinics)
      .catch(() => setClinics([]))
      .finally(() => setLoadingClinics(false));
  }, []);

  const clinicOptions = clinics.map((c) => ({ value: String(c.id), label: c.name }));

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      await patientImportApi.downloadTemplate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengunduh template');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setSummary(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!clinicId) {
      setError('Pilih klinik tujuan terlebih dahulu');
      return;
    }
    if (!file) {
      setError('Pilih file spreadsheet terlebih dahulu');
      return;
    }
    setImporting(true);
    setError(null);
    setSummary(null);
    try {
      const result = await patientImportApi.importPatients(Number(clinicId), file);
      setSummary(result);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengimpor data pasien');
    } finally {
      setImporting(false);
    }
  };

  const failedRows = summary?.results.filter((r) => r.status === 'failed') ?? [];

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Migrasi Data Pasien</h1>
            </div>
            <p className="page-subtitle">
              Impor data pasien lama milik sebuah klinik dari spreadsheet yang mereka kirimkan setelah mendaftar.
            </p>
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <div className="card">
          <h3>1. Unduh Template</h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-sub)', marginBottom: 14, marginTop: -8 }}>
            Kirim file ini ke klinik yang mendaftar agar diisi dengan data pasien lama mereka.
          </p>
          <button type="button" className="btn-outline" onClick={handleDownloadTemplate} disabled={downloading}>
            {downloading ? 'Mengunduh...' : 'Unduh Template Spreadsheet'}
          </button>
        </div>

        <div className="card">
          <h3>2. Unggah Data Klinik</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              Klinik Tujuan
            </label>
            <CustomSelect
              value={clinicId}
              onChange={setClinicId}
              options={clinicOptions}
              placeholder={loadingClinics ? 'Memuat daftar klinik...' : 'Pilih klinik...'}
              disabled={loadingClinics || importing}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
              File Spreadsheet Terisi (dari klinik)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          <button type="button" className="btn-primary" onClick={handleImport} disabled={importing || !clinicId || !file}>
            {importing ? 'Mengimpor...' : 'Impor Data Pasien'}
          </button>
        </div>

        {summary && (
          <div className="card">
            <h3>Hasil Impor</h3>
            <div className="stat-grid" style={{ marginBottom: failedRows.length > 0 ? 20 : 0 }}>
              <div className="stat-card">
                <div className="stat-card-label">Total Baris</div>
                <div className="stat-card-value">{summary.totalRows}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Berhasil</div>
                <div className="stat-card-value" style={{ color: 'var(--green)' }}>
                  {summary.created}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Gagal</div>
                <div className="stat-card-value" style={{ color: 'var(--red)' }}>
                  {summary.failed}
                </div>
              </div>
            </div>

            {failedRows.length > 0 && (
              <div className="table-wrap">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Baris</th>
                      <th>Nama</th>
                      <th>Alasan Gagal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRows.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.name || '-'}</td>
                        <td>{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
