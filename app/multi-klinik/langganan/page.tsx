'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MultiClinicLayout from '@/components/layout/MultiClinicLayout';
import { multiClinicApi, type BranchBillingMode, type OwnedClinic } from '@/lib/multi-clinic';
import { subscriptionPlanApi } from '@/lib/subscription';
import type { Payment, SubscriptionBillingCycle, SubscriptionPlan } from '@/types/subscription';
import { ApiError, apiFileUrl } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import '@/app/langganan/langganan.css';
import '../../styles/multi-klinik.css';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CYCLE_LABEL: Record<SubscriptionBillingCycle, string> = { monthly: 'Bulanan', yearly: 'Tahunan' };

const MODE_OPTIONS: { value: BranchBillingMode; label: string; hint: string }[] = [
  { value: 'owner', label: 'Ditanggung owner', hint: 'Ikut tagihan gabungan di halaman ini.' },
  { value: 'self', label: 'Bayar sendiri', hint: 'Cabang membayar dari akunnya, tetap harga cabang Multi Klinik.' },
  { value: 'stopped', label: 'Berhenti', hint: 'Tidak lagi ditanggung; cabang berlangganan sendiri seperti klinik biasa.' },
];

export default function MultiClinicLanggananPage() {
  const { success, error: showError } = useToast();

  const [clinics, setClinics] = useState<OwnedClinic[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<SubscriptionBillingCycle>('monthly');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingMode, setSavingMode] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await multiClinicApi.listMyPayments({ limit: 10 });
      setHistory(res.data);
    } catch {
      // silent — history is supplementary, not critical to the page's purpose
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clinicList, planList] = await Promise.all([
          multiClinicApi.myClinics(),
          subscriptionPlanApi.list(),
          loadHistory(),
        ]);
        setClinics(clinicList);
        setPlans(planList.filter((p) => p.isActive && p.tier === 'multi_klinik'));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : 'Gagal memuat data langganan');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadHistory, showError]);

  const plan = useMemo(() => plans.find((p) => p.billingCycle === cycle) || null, [plans, cycle]);
  // Only branches the owner pays for are on this bill (PRD MK-05/MK-06).
  const billedClinics = clinics.filter((c) => (c.billingMode ?? 'owner') === 'owner');
  const clinicCount = billedClinics.length;
  const ownerFee = Number(plan?.ownerFee || 0);
  const unitTotal = plan ? Number(plan.price) * clinicCount : 0;
  const totalPrice = unitTotal + ownerFee;

  const changeMode = async (clinic: OwnedClinic, mode: BranchBillingMode) => {
    setSavingMode(clinic.id);
    try {
      await multiClinicApi.setBillingMode(clinic.id, mode);
      setClinics((prev) => prev.map((c) => (c.id === clinic.id ? { ...c, billingMode: mode } : c)));
      success(`Cara bayar ${clinic.name} diubah. Berlaku mulai periode berikutnya.`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengubah cara bayar');
    } finally {
      setSavingMode(null);
    }
  };

  const handleClaimPaid = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      await multiClinicApi.claimPayment({ planId: plan.id }, proofFile || undefined);
      success('Klaim pembayaran terkirim. Menunggu konfirmasi Super Admin.');
      setProofFile(null);
      loadHistory();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengirim klaim pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MultiClinicLayout>
      <div className="langganan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title"><h1>Langganan</h1></div>
            <p className="page-subtitle">Bayar sekali untuk memperpanjang semua cabang yang Anda tanggung. Atur cara bayar tiap cabang di bawah.</p>
          </div>
        </div>

        {!loading && clinics.length > 0 && (
          <div className="mk-scope">
            <div className="mk-card">
              <div className="mk-card-head">
                <h2>Cara bayar tiap cabang</h2>
                <span className="mk-muted">Perubahan berlaku mulai periode berikutnya, tanpa prorata.</span>
              </div>
              <div className="mk-table-wrap">
                <table className="mk-table">
                  <thead>
                    <tr>
                      <th>Cabang</th>
                      <th>Cara bayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clinics.map((c) => {
                      const mode = c.billingMode ?? 'owner';
                      return (
                        <tr key={c.id}>
                          <td className="name">{c.name}</td>
                          <td>
                            <label className="mk-field">
                              <span className="sr-only">Cara bayar {c.name}</span>
                              <select
                                value={mode}
                                disabled={savingMode === c.id}
                                onChange={(e) => changeMode(c, e.target.value as BranchBillingMode)}
                              >
                                {MODE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <span className="mk-muted">{MODE_OPTIONS.find((o) => o.value === mode)?.hint}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mk-hint">
                Cabang yang berhenti ditanggung tetap berjalan sampai akhir periode yang sudah dibayar, lalu masa tenggang 3
                hari, lalu hanya-baca sampai owner kliniknya berlangganan sendiri.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card"><p>Memuat...</p></div>
        ) : clinics.length === 0 ? (
          <div className="card">
            <p className="pricing-loading">Belum ada klinik yang dihubungkan ke akun Anda. Hubungi Super Admin untuk menghubungkan klinik terlebih dahulu.</p>
          </div>
        ) : clinicCount === 0 ? (
          <div className="card">
            <p className="pricing-loading">Tidak ada cabang yang ditanggung owner saat ini. Ubah cara bayar cabang menjadi &ldquo;Ditanggung owner&rdquo; untuk membayar dari sini.</p>
          </div>
        ) : !plan ? (
          <div className="card">
            <p className="pricing-loading">Paket Multi Klinik untuk siklus {CYCLE_LABEL[cycle]} belum tersedia. Hubungi Super Admin.</p>
          </div>
        ) : (
          <div className="card pricing-card">
            <div className="pricing-header">
              <h3>Ringkasan Pembayaran</h3>
              <div className="cycle-toggle">
                <button type="button" className={cycle === 'monthly' ? 'active' : ''} onClick={() => setCycle('monthly')}>
                  Bulanan
                </button>
                <button type="button" className={cycle === 'yearly' ? 'active' : ''} onClick={() => setCycle('yearly')}>
                  Tahunan
                  <span className="save-badge">Hemat 2 Bulan</span>
                </button>
              </div>
            </div>

            <div className="checkout-step">
              <div className="checkout-summary">
                <div className="checkout-plan-name">Multi Klinik &middot; {CYCLE_LABEL[cycle]}</div>

                <div className="price-breakdown">
                  <div className="breakdown-row">
                    <span>{clinicCount} cabang ditanggung &times; Rp {formatCurrency(plan.price)}</span>
                    <span>Rp {formatCurrency(unitTotal)}</span>
                  </div>
                  {ownerFee > 0 && (
                    <div className="breakdown-row">
                      <span>Biaya admin owner</span>
                      <span>Rp {formatCurrency(ownerFee)}</span>
                    </div>
                  )}
                  <div className="breakdown-row total">
                    <span>Total Tagihan</span>
                    <span>Rp {formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="qr-box">
                <img
                  src="/payment-qr.png"
                  alt="QR Pembayaran"
                  className="qr-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="qr-hint">Scan QR di atas menggunakan aplikasi e-wallet atau mobile banking Anda.</p>
              </div>
              <div className="proof-upload">
                <label htmlFor="proof-upload-input" className="proof-upload-label">
                  {proofFile ? proofFile.name : 'Unggah Bukti Transfer (opsional)'}
                </label>
                <input
                  id="proof-upload-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <p className="qr-hint">Mempercepat proses verifikasi oleh Super Admin. Format JPG/PNG/WEBP/PDF, maks 5MB.</p>
              </div>
              <div className="payment-actions">
                <button type="button" className="btn-primary" onClick={handleClaimPaid} disabled={submitting}>
                  {submitting ? 'Mengirim...' : 'Saya Sudah Bayar'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <h3>Riwayat Pembayaran</h3>
          <div className="table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Paket</th>
                  <th>Kuantitas</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Bukti</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">Belum ada riwayat pembayaran.</td></tr>
                ) : (
                  history.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>{p.plan?.name || '-'}</td>
                      <td>{p.quantity > 1 ? `${p.quantity} klinik` : '-'}</td>
                      <td>Rp {formatCurrency(p.amount)}</td>
                      <td>
                        <span className={`tag ${p.status === 'confirmed' ? 'tag-confirmed' : p.status === 'rejected' ? 'tag-rejected' : 'tag-pending'}`}>
                          {p.status === 'confirmed' ? 'Dikonfirmasi' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </td>
                      <td>
                        {p.proofUrl ? (
                          <a href={apiFileUrl(p.proofUrl)} target="_blank" rel="noopener noreferrer">
                            Lihat
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MultiClinicLayout>
  );
}
