import { apiClient, ApiError } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type BillingStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'refunded';
export type DiscountType = 'nominal' | 'percent';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'insurance' | 'bpjs';

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
  additionalFee: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: BillingStatus;
  notes?: string;
  items: BillingItem[];
  payments: Payment[];
  patient?: { id: number; name: string; noRm?: string; phone?: string };
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
  additionalFee?: number;
  notes?: string;
}

export interface UpdateBillingPayload {
  items?: CreateBillingItemPayload[];
  totalDiscount?: number;
  totalDiscountType?: DiscountType;
  additionalFee?: number;
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

  update: (id: number, payload: UpdateBillingPayload) =>
    apiClient.patch<BillingDetail>(`/billings/${id}`, payload),

  cancel: (id: number) => apiClient.patch<BillingDetail>(`/billings/${id}/cancel`, {}),

  createPayment: (id: number, payload: CreatePaymentPayload) =>
    apiClient.post<CreatePaymentResponse>(`/billings/${id}/payments`, payload),

  downloadInvoicePdf: async (id: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${API_URL}/billings/${id}/invoice`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      throw new ApiError('Gagal mengunduh invoice PDF', res.status);
    }
    const blob = await res.blob();
    const filename = `invoice-${id}.pdf`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },
};
