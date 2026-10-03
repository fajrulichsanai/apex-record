'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import SettingsTabs from '@/components/settings/SettingsTabs';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { COMPANY } from '@/lib/company';
import {
  dataRequestsApi,
  DATA_REQUEST_STATUS_LABEL,
  DATA_REQUEST_TYPE_LABEL,
  type DataRequest,
  type DataRequestType,
} from '@/lib/data-requests';
import '../../styles/data-privasi.css';

const CLOSE_CONFIRM_TEXT = 'TUTUP AKUN';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DataPrivasiPage() {
  const { success, error } = useToast();
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DataRequestType | null>(null);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setRequests(await dataRequestsApi.list());
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat riwayat permintaan');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const openRequest = (type: DataRequestType) => requests.find((r) => r.type === type && (r.status === 'pending' || r.status === 'in_progress'));

  const startForm = (type: DataRequestType) => {
    setForm(type);
    setReason('');
    setConfirmText('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form === 'close_account' && confirmText.trim().toUpperCase() !== CLOSE_CONFIRM_TEXT) return;
    setSubmitting(true);
    try {
      await dataRequestsApi.create(form, reason.trim());
      success(
        form === 'export'
          ? 'Permintaan ekspor data terkirim. Kami akan menghubungi Anda paling lambat 3 x 24 jam.'
          : 'Permintaan tutup akun terkirim. Kami akan menghubungi Anda untuk konfirmasi.',
      );
      setForm(null);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengirim permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  const openExport = openRequest('export');
  const openClose = openRequest('close_account');

  return (
    <DashboardLayout>
      <FeatureGuard feature="data-privasi">
        <main className="content data-privasi-page">
          <SettingsTabs />
          <div className="dp-panel">
            <h1>Data &amp; Privasi</h1>
            <p className="dp-subtitle">
              Sesuai UU Pelindungan Data Pribadi, klinik berhak meminta salinan seluruh datanya dan menutup akun. Baca{' '}
              <Link href="/kebijakan-privasi" target="_blank">
                Kebijakan Privasi
              </Link>{' '}
              untuk rinciannya.
            </p>

            <div className="dp-options">
              <section className="dp-card">
                <h2>Minta salinan data klinik</h2>
                <p>
                  Kami kirimkan file berisi data pasien, rekam medis, kunjungan, transaksi, dan pengaturan klinik ke email
                  pemilik. Akun tetap aktif seperti biasa.
                </p>
                {openExport ? (
                  <p className="dp-open">
                    Permintaan sedang {DATA_REQUEST_STATUS_LABEL[openExport.status].toLowerCase()} sejak{' '}
                    {formatDate(openExport.createdAt)}.
                  </p>
                ) : (
                  <button type="button" className="btn-outline" onClick={() => startForm('export')} disabled={form === 'export'}>
                    Minta ekspor data
                  </button>
                )}
              </section>

              <section className="dp-card danger">
                <h2>Tutup akun &amp; hapus data</h2>
                <p>
                  Langganan dihentikan dan semua pengguna klinik tidak bisa login lagi. Sebelum dihapus, kami mengirim salinan
                  seluruh data agar klinik tetap bisa memenuhi kewajiban menyimpan rekam medis minimal 25 tahun.
                </p>
                {openClose ? (
                  <p className="dp-open">
                    Permintaan sedang {DATA_REQUEST_STATUS_LABEL[openClose.status].toLowerCase()} sejak{' '}
                    {formatDate(openClose.createdAt)}.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => startForm('close_account')}
                    disabled={form === 'close_account'}
                  >
                    Ajukan tutup akun
                  </button>
                )}
              </section>
            </div>

            {form && (
              <form className={`dp-card dp-form${form === 'close_account' ? ' danger' : ''}`} onSubmit={submit}>
                <h2>{DATA_REQUEST_TYPE_LABEL[form]}</h2>
                <label htmlFor="dpReason">Alasan atau catatan (opsional)</label>
                <textarea
                  id="dpReason"
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={form === 'export' ? 'mis. pindah ke sistem lain, arsip tahunan' : 'mis. klinik berhenti beroperasi'}
                />
                {form === 'close_account' && (
                  <>
                    <label htmlFor="dpConfirm">
                      Ketik <b>{CLOSE_CONFIRM_TEXT}</b> untuk mengonfirmasi
                    </label>
                    <input
                      id="dpConfirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      autoComplete="off"
                    />
                  </>
                )}
                <p className="dp-note">
                  Tim {COMPANY.brand} akan menanggapi paling lambat 3 x 24 jam melalui email pemilik klinik.
                </p>
                <div className="dp-actions">
                  <button type="button" className="btn-outline" onClick={() => setForm(null)} disabled={submitting}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={form === 'close_account' ? 'btn-danger' : 'btn-primary'}
                    disabled={
                      submitting ||
                      (form === 'close_account' && confirmText.trim().toUpperCase() !== CLOSE_CONFIRM_TEXT)
                    }
                  >
                    {submitting ? 'Mengirim…' : 'Kirim permintaan'}
                  </button>
                </div>
              </form>
            )}

            <section className="dp-card">
              <h2>Riwayat permintaan</h2>
              {loading ? (
                <p>Memuat…</p>
              ) : requests.length === 0 ? (
                <p>Belum ada permintaan.</p>
              ) : (
                <ul className="dp-history">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <div>
                        <b>{DATA_REQUEST_TYPE_LABEL[r.type]}</b>
                        <span>Diajukan {formatDate(r.createdAt)}</span>
                        {r.adminNote && <span className="dp-admin-note">Catatan tim: {r.adminNote}</span>}
                      </div>
                      <span className={`dp-status ${r.status}`}>{DATA_REQUEST_STATUS_LABEL[r.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="dp-foot">
              Pasien yang meminta akses, perbaikan, atau penghapusan datanya ditangani oleh klinik. Data pasien bisa
              diperbaiki langsung di menu Pasien. Pasien tanpa riwayat kunjungan bisa dihapus, sedangkan pasien yang sudah
              punya riwayat tidak bisa dihapus karena rekam medis wajib disimpan. Pertanyaan lain:{' '}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
            </p>
          </div>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
