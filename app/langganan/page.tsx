'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import { clinicSubscriptionApi, paymentApi, subscriptionPlanApi } from '@/lib/subscription';
import type { InEffectSubscription, Payment, SubscriptionPlan, SubscriptionPlanTier, UpgradeQuote } from '@/types/subscription';
import { apiClient, ApiError, openProtectedFile } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import { useSubscriptionGate } from '@/lib/subscription-gate-context';
import SettingsTabs from '@/components/settings/SettingsTabs';
import './langganan.css';
import StorageUsageCard from '@/components/storage/StorageUsageCard';
import type { StorageQuota } from '@/lib/storage';
import { clinicDataApi, type RetentionStatus } from '@/lib/super-admin';
import {
  DurationPicker,
  PlanPrice,
  QuoteBreakdown,
  monthlyPlanFor,
  paymentDetail,
  useDurationDiscounts,
  useQuote,
} from '@/components/subscription/pricing';

/** Masa coba 14 hari: 7 hari pertama batas Starter, lalu otomatis batas Pro. */
function trialInfo(startDate: string) {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  const proFrom = new Date(start);
  proFrom.setDate(proFrom.getDate() + 7);
  const today = new Date(new Date().toDateString());
  return today < proFrom
    ? `Minggu pertama memakai batas Starter (5 akun); mulai ${formatDate(proFrom.toISOString())} otomatis naik ke batas Pro (25 akun).`
    : 'Minggu kedua: batas akun sudah naik ke Pro (25 akun).';
}

/** Urutan paket untuk naik/turun paket (Multi Klinik lewat akun owner). */
const TIER_RANK: Record<string, number> = { trial: 0, basic: 1, pro: 2 };

function nextDay(date: string) {
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

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
    label: 'Starter',
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
      'Semua fitur Starter',
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
  const { user, branch } = useAuth();
  const { subscription, daysUntilExpiry, refresh } = useSubscriptionGate();
  const { success, error: showError } = useToast();
  const canSubmit = !isFeatureViewOnly(user?.role, 'langganan');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(1);
  const discounts = useDurationDiscounts();
  const [selectedTier, setSelectedTier] = useState<SubscriptionPlanTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Cabang multiklinik: siapa yang membayar (PRD Multi-Klinik MK-06).
  const [branchBilling, setBranchBilling] = useState<'owner' | 'self' | 'stopped' | null>(null);

  useEffect(() => {
    apiClient
      .get<{ billingMode: 'owner' | 'self' | 'stopped' } | null>('/clinic-links/current')
      .then((link) => setBranchBilling(link && typeof link === 'object' && 'billingMode' in link ? link.billingMode : null))
      .catch(() => setBranchBilling(null));
  }, []);
  const selfPayingBranch = branchBilling === 'self';
  // Langganan berhenti: tanggal data dihapus (lihat Data & Privasi).
  const [retention, setRetention] = useState<RetentionStatus | null>(null);
  useEffect(() => {
    clinicDataApi
      .retention()
      .then(setRetention)
      .catch(() => setRetention(null));
  }, []);

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

  // One monthly plan per tier; the duration (1/3/6/12 bulan) is chosen here.
  const plansByTier = useMemo(() => {
    const map = new Map<SubscriptionPlanTier, SubscriptionPlan>();
    for (const meta of TIERS) {
      const plan = monthlyPlanFor(plans, meta.tier);
      if (plan) map.set(meta.tier, plan);
    }
    return map;
  }, [plans]);

  const selectedPlan = selectedTier ? plansByTier.get(selectedTier) ?? null : null;
  // A self-paying branch pays for itself only, without the owner fee
  // (the backend prices it the same way).
  const effectiveQuantity = selectedTier === 'multi_klinik' && !selfPayingBranch ? Math.max(1, quantity) : 1;
  // Storage tambahan ikut tagihan yang sama (PRD Super Admin BL-06); the
  // server quote includes it, so refetch whenever it changes.
  const [storage, setStorage] = useState<StorageQuota | null>(null);
  const { quote, failed: quoteFailed } = useQuote(
    selectedPlan ? () => paymentApi.quote({ planId: selectedPlan.id, months, quantity: effectiveQuantity }) : null,
    `${selectedPlan?.id}:${months}:${effectiveQuantity}:${storage?.extraGb}:${storage?.billableExtraGb}`,
  );
  // Whoever pays for the storage may buy more: the clinic's owner, or the
  // Multi-Klinik Owner inside one of their branches (shared pool).
  const canBuyStorage = user?.role === 'owner' && (branchBilling === null || !!branch);

  // Naik/turun paket: paket yang berlaku hari ini dan akhir masa aktif.
  const [inEffect, setInEffect] = useState<InEffectSubscription | null>(null);
  useEffect(() => {
    clinicSubscriptionApi
      .inEffect()
      .then(setInEffect)
      .catch(() => setInEffect(null));
  }, [subscription?.id]);
  const currentTier = inEffect?.subscription?.plan?.tier ?? null;
  const paidTier = currentTier && TIER_RANK[currentTier] !== undefined && currentTier !== 'trial' ? currentTier : null;
  const changeOf = (tier: SubscriptionPlanTier): 'renew' | 'upgrade' | 'downgrade' | null => {
    if (!paidTier || TIER_RANK[tier] === undefined) return null;
    if (tier === paidTier) return 'renew';
    return TIER_RANK[tier] > TIER_RANK[paidTier] ? 'upgrade' : 'downgrade';
  };
  const [upgrading, setUpgrading] = useState(false);
  const { quote: upgradeQuote, failed: upgradeFailed } = useQuote<UpgradeQuote>(
    upgrading && selectedPlan ? () => paymentApi.upgradeQuote(selectedPlan.id) : null,
    `upgrade:${upgrading}:${selectedPlan?.id}`,
  );

  const selectTier = (tier: SubscriptionPlanTier, upgrade = false) => {
    setSelectedTier(tier);
    setUpgrading(upgrade);
    setQuantity(1);
  };

  const handleClaimPaid = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await paymentApi.create(
        upgrading
          ? { planId: selectedPlan.id, kind: 'upgrade' }
          : { planId: selectedPlan.id, months, quantity: selectedTier === 'multi_klinik' ? effectiveQuantity : undefined },
        proofFile || undefined,
      );
      success(
        upgrading
          ? 'Klaim naik paket terkirim. Paket baru berlaku setelah dikonfirmasi Super Admin.'
          : 'Klaim pembayaran terkirim. Menunggu konfirmasi Super Admin.',
      );
      setSelectedTier(null);
      setUpgrading(false);
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
      <main className="content langganan-page">
        <SettingsTabs />
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
                  {isActive && subscription.plan?.tier === 'trial' && (
                    <span className="tag tag-trial">Free Trial</span>
                  )}
                  <span className="status-plan-name">{subscription.plan?.name || '-'}</span>
                </div>
                <p className="status-period">
                  Berlaku sampai <strong>{formatDate(subscription.endDate)}</strong>
                  {urgent && <span className="status-days-left"> · {daysUntilExpiry} hari lagi</span>}
                </p>
                {isActive && subscription.plan?.tier === 'trial' && (
                  <p className="status-period">
                    {trialInfo(subscription.startDate)} Storage masa coba maks. 100 MB. Upgrade kapan saja sebelum masa coba
                    berakhir agar data klinik tidak terkunci.
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="tag tag-expired">Belum Berlangganan</span>
                <p className="status-period">Klinik Anda belum memiliki langganan aktif.</p>
              </>
            )}
          </div>
        </div>

        {retention?.deleteAfter && !retention.purgedAt && (
          <div className="alert-danger" role="alert">
            Langganan sudah berakhir. Data klinik bisa diunduh sampai{' '}
            <strong>{formatDate(retention.deleteAfter)}</strong>, lalu dihapus permanen.{' '}
            <Link href="/data-privasi">Unduh semua data</Link> atau perpanjang di bawah agar data tetap tersimpan.
          </div>
        )}

        <StorageUsageCard canPurchase={canBuyStorage} onChange={setStorage} />

        {branchBilling === 'owner' && (
          <div className="alert-info">
            Langganan klinik ini ditanggung owner multiklinik dan diperpanjang dari akunnya. Anda tidak perlu membayar dari sini.
          </div>
        )}

        {!canSubmit && (
          <div className="alert-info">
            Hanya Owner klinik yang dapat mengajukan pembayaran langganan. Hubungi Owner untuk memperpanjang.
          </div>
        )}

        {canSubmit && (
          <div className="card pricing-card">
            <div className="pricing-header">
              <h3>Pilih Paket</h3>
              {!upgrading && (
                <DurationPicker months={months} onChange={setMonths} discounts={discounts} disabled={submitting} />
              )}
            </div>

            {loading ? (
              <p className="pricing-loading">Memuat paket...</p>
            ) : !selectedTier ? (
              <div className="tier-grid">
                {TIERS.map((meta) => {
                  const plan = plansByTier.get(meta.tier);
                  if (!plan) return null;
                  return (
                    <div key={meta.tier} className={`tier-card${meta.highlight ? ' highlight' : ''}`}>
                      {meta.highlight && <div className="tier-ribbon">Paling Direkomendasikan</div>}
                      <div className="tier-icon">{meta.icon}</div>
                      <div className="tier-name">{meta.label}</div>
                      <div className="tier-tagline">{meta.tagline}</div>
                      {changeOf(meta.tier) === 'renew' && <div className="tier-current">Paket Anda sekarang</div>}
                      <PlanPrice plan={plan} months={months} discountPct={discounts[months] ?? 0} perClinic={meta.perClinic} />
                      {meta.perClinic && selfPayingBranch && (
                        <div className="tier-owner-fee">Harga cabang multiklinik, tanpa biaya admin owner</div>
                      )}
                      {meta.perClinic && !selfPayingBranch && Number(plan.ownerFee) > 0 && (
                        <div className="tier-owner-fee">
                          + Rp {formatCurrency(Number(plan.effectiveOwnerFee ?? plan.ownerFee))} admin owner per bulan
                          {plan.promoActive && Number(plan.effectiveOwnerFee) < Number(plan.ownerFee) && (
                            <> (normal <s>Rp {formatCurrency(Number(plan.ownerFee))}</s>)</>
                          )}
                        </div>
                      )}
                      <ul className="tier-features">
                        {meta.features.map((f) => (
                          <li key={f}>
                            <span className="tier-check">✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      {changeOf(meta.tier) === 'upgrade' ? (
                        <>
                          <button type="button" className="btn-primary tier-select-btn" onClick={() => selectTier(meta.tier, true)}>
                            Naik ke {meta.label} sekarang
                          </button>
                          <button type="button" className="btn-link tier-alt-btn" onClick={() => selectTier(meta.tier)}>
                            atau mulai periode berikutnya
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn-primary tier-select-btn" onClick={() => selectTier(meta.tier)}>
                          {changeOf(meta.tier) === 'renew'
                            ? 'Perpanjang'
                            : changeOf(meta.tier) === 'downgrade'
                              ? `Turun ke ${meta.label}`
                              : 'Pilih Paket'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="checkout-step">
                <div className="checkout-summary">
                  <div className="checkout-plan-name">
                    {upgrading
                      ? `Naik ke ${TIERS.find((t) => t.tier === selectedTier)?.label}`
                      : `${TIERS.find((t) => t.tier === selectedTier)?.label} · ${months === 12 ? '1 tahun' : `${months} bulan`}`}
                  </div>

                  {!upgrading && selectedTier && changeOf(selectedTier) === 'downgrade' && inEffect?.paidUntil && (
                    <div className="alert-info">
                      Turun paket berlaku mulai periode berikutnya ({formatDate(nextDay(inEffect.paidUntil))}). Sampai{' '}
                      {formatDate(inEffect.paidUntil)} klinik tetap memakai paket{' '}
                      {inEffect.subscription?.plan?.name}. Klaim ditolak bila akun aktif atau storage melebihi batas paket
                      tujuan.
                    </div>
                  )}
                  {!upgrading && selectedTier && changeOf(selectedTier) === 'upgrade' && inEffect?.paidUntil && (
                    <div className="alert-info">
                      Paket ini mulai berlaku {formatDate(nextDay(inEffect.paidUntil))}, setelah masa aktif sekarang.
                    </div>
                  )}

                  {selectedTier === 'multi_klinik' && !selfPayingBranch && (
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

                  {upgrading ? (
                    upgradeQuote ? (
                      upgradeQuote.allowed ? (
                        <div className="price-breakdown">
                          <div className="breakdown-row">
                            <span>
                              Selisih {upgradeQuote.fromPlanName} → {upgradeQuote.toPlanName}
                            </span>
                            <span>Rp {formatCurrency(upgradeQuote.monthlyDifference)} / bulan</span>
                          </div>
                          <div className="breakdown-row">
                            <span>
                              Sisa masa aktif {upgradeQuote.remainingDays} hari (s.d. {formatDate(upgradeQuote.until ?? undefined)})
                            </span>
                            <span>× {upgradeQuote.remainingDays}/30</span>
                          </div>
                          <div className="breakdown-row total">
                            <span>Total Tagihan</span>
                            <span>Rp {formatCurrency(upgradeQuote.amount)}</span>
                          </div>
                          <p className="breakdown-saved">
                            {upgradeQuote.toPlanName} langsung berlaku setelah dikonfirmasi; masa aktif tidak berubah.
                          </p>
                        </div>
                      ) : (
                        <div className="alert-info">{upgradeQuote.reason}</div>
                      )
                    ) : (
                      <p className="pricing-loading">{upgradeFailed ? 'Gagal menghitung selisih. Coba lagi.' : 'Menghitung selisih...'}</p>
                    )
                  ) : quote ? (
                    <QuoteBreakdown quote={quote} />
                  ) : (
                    <p className="pricing-loading">{quoteFailed ? 'Gagal menghitung tagihan. Coba lagi.' : 'Menghitung tagihan...'}</p>
                  )}
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
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleClaimPaid}
                    disabled={submitting || (upgrading ? !upgradeQuote?.allowed : !quote)}
                  >
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
                  <th>Rincian</th>
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
                      <td>{paymentDetail(p)}</td>
                      <td>
                        Rp {formatCurrency(p.amount)}
                        {p.status === 'confirmed' && (
                          <Link href={`/kuitansi/${p.id}`} target="_blank" className="receipt-link">
                            Kuitansi
                          </Link>
                        )}
                      </td>
                      <td>
                        <span className={`tag ${p.status === 'confirmed' ? 'tag-confirmed' : p.status === 'rejected' ? 'tag-rejected' : 'tag-pending'}`}>
                          {p.status === 'confirmed' ? 'Lunas, dikonfirmasi' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </td>
                      <td>
                        {p.proofUrl ? (
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent, #367D2F)', textDecoration: 'underline', cursor: 'pointer' }}
                            onClick={() => openProtectedFile(p.proofUrl!).catch(() => showError('Gagal memuat bukti pembayaran'))}
                          >
                            Lihat
                          </button>
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
      </main>
    </>
  );
}
