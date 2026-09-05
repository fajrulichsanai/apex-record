export type SubscriptionStatus = 'active' | 'expired';
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

export interface SubscriptionPlan {
  id: number;
  name: string;
  durationDays: number;
  price: number;
  isActive: boolean;
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
  clinicId: number;
  clinicName?: string;
  subscriptionId: number | null;
  planId: number;
  plan?: SubscriptionPlan;
  amount: number;
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
