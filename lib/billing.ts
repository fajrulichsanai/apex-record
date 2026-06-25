import { apiClient } from './api-client';

export type BillingStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'refunded';
export type DiscountType = 'nominal' | 'percent';
export type PaymentMethod = 'cash' | 'transfer' | 'insurance' | 'bpjs';

export interface BillingListItem {
  billingId: number;
  encounterId: number;
  invoiceNumber: string;
  patientName?: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillingStatus;
  createdAt: string;
}

export interface BillingListResponse {
  data: BillingListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BillingItem {
  id: number;
  tarifId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: DiscountType;
  subtotal: number;
}

export interface Payment {
  id: number;
  receiptNumber: string;
  method: PaymentMethod;
  amount: number;
  note?: string;
  paidAt: string;
}

export interface BillingDetail {
  id: number;
  clinicId: number;
  encounterId: number;
  patientId: number;
  invoiceNumber: string;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillingStatus;
  notes?: string;
  items: BillingItem[];
  payments: Payment[];
  patient?: { id: number; name: string; noRm?: string };
}

export interface CreateBillingItemPayload {
  tarifId?: number;
  name: string;
  quantity?: number;
  unitPrice: number;
  discount?: number;
  discountType?: DiscountType;
}

export interface CreateBillingPayload {
  encounterId: number;
  items: CreateBillingItemPayload[];
  totalDiscount?: number;
  totalDiscountType?: DiscountType;
  notes?: string;
}

export interface CreatePaymentPayload {
  method: PaymentMethod;
  amount: number;
  note?: string;
}

export interface CreatePaymentResponse {
  paymentId: number;
  receiptNumber: string;
  paidAmount: number;
  outstandingAmount: number;
  billingStatus: BillingStatus;
}

export const billingApi = {
  list: (query?: {
    status?: BillingStatus;
    dateFrom?: string;
    dateTo?: string;
    patientId?: number;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<BillingListResponse>(
      '/billings' +
        (query
          ? '?' +
            new URLSearchParams(
              Object.entries(query).reduce((acc, [k, v]) => {
                if (v !== undefined && v !== null && v !== '') acc[k] = String(v);
                return acc;
              }, {} as Record<string, string>),
            ).toString()
          : ''),
    ),

  getOne: (id: number) => apiClient.get<BillingDetail>(`/billings/${id}`),

  create: (payload: CreateBillingPayload) => apiClient.post<BillingDetail>('/billings', payload),

  createPayment: (id: number, payload: CreatePaymentPayload) =>
    apiClient.post<CreatePaymentResponse>(`/billings/${id}/payments`, payload),
};
