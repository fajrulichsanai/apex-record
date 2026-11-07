'use client';

import { useRef, useState } from 'react';
import { patientImportApi, type PatientImportSummary } from '@/lib/patient-import';
import { ApiError } from '@/lib/api-client';
import { StatCard } from './ui';

/** Tab Migrasi Pasien di detail klinik (PRD KL-05): impor pasien lama klinik ini. */
export default function PatientMigrationPanel({ clinicId, clinicName }: { clinicId: number; clinicName?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PatientImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImport = async () => {
    if (!file) {
      setError('Pilih file spreadsheet terlebih dahulu');
      return;
    }
    setImporting(true);
    setError(null);
    setSummary(null);
    try {
      setSummary(await patientImportApi.importPatients(clinicId, file));
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
    <>
      {error && <div className="alert-error">{error}</div>}

      <div className="sa-grid-2">
        <div className="card">
          <h3>1. Unduh template</h3>
          <p className="text-sub card-text">Kirim file ini ke klinik agar diisi dengan data pasien lama mereka.</p>
          <button type="button" className="btn-outline" onClick={handleDownloadTemplate} disabled={downloading}>
            {downloading ? 'Mengunduh...' : 'Unduh template spreadsheet'}
          </button>
        </div>

        <div className="card">
          <h3>2. Unggah data {clinicName ?? 'klinik'}</h3>
          <div className="sa-field card-text">
            <label htmlFor="migration-file">File spreadsheet terisi (.xlsx atau .csv)</label>
            <input
              id="migration-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setSummary(null);
                setError(null);
              }}
              disabled={importing}
            />
          </div>
          <button type="button" className="btn-primary" onClick={handleImport} disabled={importing || !file}>
            {importing ? 'Mengimpor...' : 'Impor data pasien'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="card">
          <h3>Hasil impor</h3>
          <div className="stat-grid card-text">
            <StatCard label="Total baris" value={summary.totalRows} />
            <StatCard label="Berhasil" value={summary.created} />
            <StatCard label="Gagal" value={summary.failed} />
          </div>
          {failedRows.length > 0 && (
            <div className="table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>Nama</th>
                    <th>Alasan gagal</th>
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
    </>
  );
}
