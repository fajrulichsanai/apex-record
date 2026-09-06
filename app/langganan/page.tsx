'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import { paymentApi, subscriptionPlanApi } from '@/lib/subscription';
import type { Payment, SubscriptionBillingCycle, SubscriptionPlan, SubscriptionPlanTier } from '@/types/subscription';
import { ApiError, apiFileUrl } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import { useSubscriptionGate } from '@/lib/subscription-gate-context';
import './langganan.css';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface TierMeta {
  tier: SubscriptionPlanTier;
  label: string;
  tagline: string;
  icon: string;
  features: string[];
  highlight?: boolean;
  perClinic?: boolean;
}

const TIERS: TierMeta[] = [
  {
    tier: 'basic',
    label: 'Basic',
    tagline: 'Untuk klinik yang baru memulai',
    icon: '🩺',
    features: [
      'Manajemen pasien & kunjungan',
      'Transaksi & tarif layanan',
      'Rekam medis digital lengkap',
      'Laporan keuangan & kunjungan',
      '1 klinik',
    ],
  },
  {
    tier: 'pro',
    label: 'Pro',
    tagline: 'Untuk klinik yang terus berkembang',
    icon: '⭐',
    highlight: true,
    features: [
      'Semua fitur Basic',
      'User management multi-role',
      'Dukungan prioritas',
      'Backup data berkala',
      '1 klinik',
    ],
  },
  {
    tier: 'multi_klinik',
    label: 'Multi Klinik',
    tagline: 'Untuk jaringan atau grup klinik',
    icon: '🏥',
    perClinic: true,
    features: [
      'Semua fitur Pro di tiap klinik',
      'Harga per klinik tambahan',
      '1x biaya admin owner',
      'Aktivasi dibantu tim ApexRecord',
    ],
  },
];

const CYCLE_LABEL: Record<SubscriptionBillingCycle, string> = { monthly: 'Bulanan', yearly: 'Tahunan' };

export default function LanggananPage() {
  return (
    <DashboardLayout>
      <FeatureGuard feature="langganan">
        <LanggananPageInner />
      </FeatureGuard>
    </DashboardLayout>
  );
}

function LanggananPageInner() {
  const { user } = useAuth();
  const { subscription, daysUntilExpiry, refresh } = useSubscriptionGate();
  const { success, error: showError } = useToast();
  const canSubmit = !isFeatureViewOnly(user?.role, 'langganan');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<SubscriptionBillingCycle>('monthly');
  const [selectedTier, setSelectedTier] = useState<SubscriptionPlanTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await paymentApi.listMine({ limit: 10 });
      setHistory(res.data);
    } catch {
      // silent — history is supplementary, not critical to the page's purpose
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [planList] = await Promise.all([subscriptionPlanApi.list(), loadHistory()]);
        setPlans(planList.filter((p) => p.isActive));
      } catch (err) {
        showError(err instanceof ApiError ? err.message : 'Gagal memuat data langganan');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadHistory, showError]);

  const plansByTier = useMemo(() => {
    const map = new Map<SubscriptionPlanTier, Partial<Record<SubscriptionBillingCycle, SubscriptionPlan>>>();
    for (const plan of plans) {
      if (!plan.tier || !plan.billingCycle) continue;
      const entry = map.get(plan.tier) || {};
      entry[plan.billingCycle] = plan;
      map.set(plan.tier, entry);
    }
    return map;
  }, [plans]);

  const selectedPlan = selectedTier ? plansByTier.get(selectedTier)?.[cycle] : null;
  const effectiveQuantity = selectedTier === 'multi_klinik' ? Math.max(1, quantity) : 1;
  const ownerFee = Number(selectedPlan?.ownerFee || 0);
  const unitTotal = selectedPlan ? Number(selectedPlan.price) * effectiveQuantity : 0;
  const totalPrice = unitTotal + ownerFee;

  const selectTier = (tier: SubscriptionPlanTier) => {
    setSelectedTier(tier);
    setQuantity(1);
  };

  const handleClaimPaid = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await paymentApi.create(
        { planId: selectedPlan.id, quantity: selectedTier === 'multi_klinik' ? effectiveQuantity : undefined },
        proofFile || undefined,
      );
      success('Klaim pembayaran terkirim. Menunggu konfirmasi Super Admin.');
      setSelectedTier(null);
      setQuantity(1);
      setProofFile(null);
      loadHistory();
      refresh();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengirim klaim pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = subscription?.status === 'active' && new Date(subscription.endDate) >= new Date(new Date().toDateString());
  const urgent = isActive && daysUntilExpiry !== null && daysUntilExpiry <= 7;

  return (
    <>
      <div className="langganan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title"><h1>Langganan</h1></div>
            <p className="page-subtitle">Status langganan klinik dan riwayat pembayaran.</p>
          </div>
        </div>

        <div className={`card status-card${urgent ? ' urgent' : ''}`}>
          <div className="status-icon">{isActive ? '✅' : '⏰'}</div>
          <div className="status-body">
            {subscription ? (
              <>
                <div className="status-top-row">
                  <span className={`tag ${isActive ? 'tag-active' : 'tag-expired'}`}>{isActive ? 'Aktif' : 'Kadaluarsa'}</span>
                  <span className="status-plan-name">{subscription.plan?.name || '-'}</span>
                </div>
                <p className="status-period">
                  Berlaku sampai <strong>{formatDate(subscription.endDate)}</strong>
                  {urgent && <span className="status-days-left"> · {daysUntilExpiry} hari lagi</span>}
                </p>
              </>
            ) : (
              <>
                <span className="tag tag-expired">Belum Berlangganan</span>
                <p className="status-period">Klinik Anda belum memiliki langganan aktif.</p>
              </>
            )}
          </div>
        </div>

        {!canSubmit && (
          <div className="alert-info">
            Hanya Owner klinik yang dapat mengajukan pembayaran langganan. Hubungi Owner untuk memperpanjang.
          </div>
        )}

        {canSubmit && (
          <div className="card pricing-card">
            <div className="pricing-header">
              <h3>Pilih Paket</h3>
              <div className="cycle-toggle">
                <button
                  type="button"
                  className={cycle === 'monthly' ? 'active' : ''}
                  onClick={() => setCycle('monthly')}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  className={cycle === 'yearly' ? 'active' : ''}
                  onClick={() => setCycle('yearly')}
                >
                  Tahunan
                  <span className="save-badge">Hemat 2 Bulan</span>
                </button>
              </div>
            </div>

            {loading ? (
              <p className="pricing-loading">Memuat paket...</p>
            ) : !selectedTier ? (
              <div className="tier-grid">
                {TIERS.map((meta) => {
                  const plan = plansByTier.get(meta.tier)?.[cycle];
                  if (!plan) return null;
                  const monthlyEquivalentPlan = plansByTier.get(meta.tier)?.monthly;
                  const savings =
                    cycle === 'yearly' && monthlyEquivalentPlan
                      ? Number(monthlyEquivalentPlan.price) * 12 - Number(plan.price) * 10
                      : 0;
                  return (
                    <div key={meta.tier} className={`tier-card${meta.highlight ? ' highlight' : ''}`}>
                      {meta.highlight && <div className="tier-ribbon">Paling Direkomendasikan</div>}
                      <div className="tier-icon">{meta.icon}</div>
                      <div className="tier-name">{meta.label}</div>
                      <div className="tier-tagline">{meta.tagline}</div>
                      <div className="tier-price">
                        <span className="tier-price-amount">Rp {formatCurrency(plan.price)}</span>
                        <span className="tier-price-unit">
                          /{meta.perClinic ? 'klinik' : ''}
                          {CYCLE_LABEL[cycle] === 'Bulanan' ? 'bulan' : 'tahun'}
                        </span>
                      </div>
                      {meta.perClinic && Number(plan.ownerFee) > 0 && (
                        <div className="tier-owner-fee">+ Rp {formatCurrency(Number(plan.ownerFee))} admin owner (sekali per periode)</div>
                      )}
                      {cycle === 'yearly' && savings > 0 && (
                        <div className="tier-savings">Hemat ~Rp {formatCurrency(savings)}/tahun</div>
                      )}
                      <ul className="tier-features">
                        {meta.features.map((f) => (
                          <li key={f}>
                            <span className="tier-check">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <button type="button" className="btn-primary tier-select-btn" onClick={() => selectTier(meta.tier)}>
                        Pilih Paket
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="checkout-step">
                <div className="checkout-summary">
                  <div className="checkout-plan-name">
                    {TIERS.find((t) => t.tier === selectedTier)?.label} · {CYCLE_LABEL[cycle]}
                  </div>

                  {selectedTier === 'multi_klinik' && (
                    <div className="quantity-field">
                      <label>Jumlah Klinik</label>
                      <div className="stepper">
                        <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={submitting}>
                          −
                        </button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => setQuantity((q) => q + 1)} disabled={submitting}>
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="price-breakdown">
                    {selectedTier === 'multi_klinik' && selectedPlan && (
                      <div className="breakdown-row">
                        <span>
                          {effectiveQuantity} klinik &times; Rp {formatCurrency(selectedPlan.price)}
                        </span>
                        <span>Rp {formatCurrency(unitTotal)}</span>
                      </div>
                    )}
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
                  <button type="button" className="btn-outline" onClick={() => setSelectedTier(null)} disabled={submitting}>
                    Ganti Paket
                  </button>
                  <button type="button" className="btn-primary" onClick={handleClaimPaid} disabled={submitting}>
                    {submitting ? 'Mengirim...' : 'Saya Sudah Bayar'}
                  </button>
                </div>
              </div>
            )}
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
    </>
  );
}
