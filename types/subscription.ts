export type SubscriptionStatus = 'active' | 'expired';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';
export type SubscriptionPlanTier = 'trial' | 'basic' | 'pro' | 'multi_klinik';
export type SubscriptionBillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: number;
  name: string;
  durationDays: number;
  // BASIC/PRO: flat price for the cycle. MULTI_KLINIK: price PER CLINIC —
  // the actual amount charged multiplies this by the quantity chosen at
  // checkout, then adds ownerFee once.
  price: number;
  isActive: boolean;
  tier?: SubscriptionPlanTier | null;
  billingCycle?: SubscriptionBillingCycle | null;
  ownerFee?: number | null;
  /** Jatah storage (GB); null = bawaan tier (Starter 1, Pro 5, Multi Klinik 5 per cabang). */
  storageGb?: number | null;
  /** Batas akun aktif; null = bawaan tier (Starter 5, Pro 25, Multi Klinik 25 per cabang). */
  maxUsers?: number | null;
  /** Harga promo per bulan (per klinik untuk Multi Klinik); `price` = harga normal. */
  promoPrice?: number | null;
  /** Promo berlaku s.d. tanggal ini (YYYY-MM-DD, inklusif). */
  promoUntil?: string | null;
  /** Dihitung server: promo berlaku hari ini. */
  promoActive?: boolean;
  /** Dihitung server: harga per bulan yang berlaku hari ini. */
  effectivePrice?: number;
}

/** Lama langganan yang bisa dipilih (bulan). */
export const DURATION_OPTIONS = [1, 3, 6, 12] as const;
export type DurationMonths = (typeof DURATION_OPTIONS)[number];

/** Diskon lama langganan dalam persen, per jumlah bulan. */
export type DurationDiscounts = Record<number, number>;

/** Rincian harga dari server (GET .../quote), sama dengan yang ditagihkan saat klaim. */
export interface PriceQuote {
  planId: number;
  planName: string;
  clinicCount?: number;
  months: number;
  quantity: number;
  listUnitPrice: number;
  unitPrice: number;
  promoActive: boolean;
  promoUntil: string | null;
  ownerFee: number;
  listSubtotal: number;
  promoDiscount: number;
  durationDiscountPct: number;
  durationDiscount: number;
  extraStorageGb: number;
  storageAmount: number;
  total: number;
}

export interface ClinicSubscription {
  id: number;
  clinicId: number;
  clinicName?: string;
  planId: number;
  plan?: SubscriptionPlan;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  extendedBy: number | null;
  extendedByName?: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  clinicId: number | null;
  clinicName?: string;
  // Set instead of clinicId for a Multi-Klinik Owner's own consolidated
  // payment — covers every clinic in coveredClinicIds, frozen at claim time.
  ownerId?: number | null;
  ownerName?: string | null;
  coveredClinicIds?: number[] | null;
  subscriptionId: number | null;
  planId: number;
  plan?: SubscriptionPlan;
  quantity: number;
  amount: number;
  months?: number;
  promoDiscount?: number;
  durationDiscount?: number;
  extraStorageGb?: number;
  storageAmount?: number;
  status: PaymentStatus;
  confirmedBy: number | null;
  confirmedByName?: string | null;
  confirmedAt: string | null;
  notes: string | null;
  proofUrl: string | null;
  createdAt: string;
}

export interface ClinicSubscriptionSummary {
  clinicId: number;
  clinicName: string;
  subscription: ClinicSubscription | null;
}

export interface OwnerCode {
  id: number;
  code: string;
  isUsed: boolean;
  usedBy: number | null;
  usedAt: string | null;
  createdAt: string;
}

export interface SuperAdminReportSummary {
  totalClinics: number;
  activeClinics: number;
  expiredClinics: number;
  pendingConfirmations: number;
  mrr: number;
  totalRevenue: number;
  revenueByPeriod: { period: string; revenue: number }[];
  newClinicsByPeriod: { period: string; count: number }[];
  planDistribution: { planId: number; planName: string; count: number }[];
}
