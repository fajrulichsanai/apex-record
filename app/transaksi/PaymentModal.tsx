'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { useEscapeKey } from '@/lib/a11y';
import { ApiError } from '@/lib/api-client';
import { billingApi, type CreatePaymentResponse, type PaymentMethod } from '@/lib/billing';
import './PaymentModal.css';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer Bank' },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  insurance: 'Asuransi',
  bpjs: 'BPJS',
};

const rupiah = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export interface PayableBilling {
  id: number;
  invoiceNumber: string;
  patientName?: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
}

/**
 * Records one payment on a bill: a DP, an instalment, or the settlement
 * (pelunasan) of what's left. Defaults to the full remaining amount.
 */
export default function PaymentModal({
  billing,
  onClose,
  onPaid,
}: {
  billing: PayableBilling;
  onClose: () => void;
  onPaid: (result: CreatePaymentResponse) => void;
}) {
  const outstanding = Math.round(Number(billing.outstandingAmount) || 0);
  const paid = Math.round(Number(billing.paidAmount) || 0);
  const isSettlement = paid > 0;
  const [amountText, setAmountText] = useState(String(outstanding));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEscapeKey(() => {
    if (!saving) onClose();
  });

  const amount = Math.round(Number(amountText.replace(/\D/g, '')) || 0);
  const remainingAfter = Math.max(0, outstanding - amount);
  // Nothing left to pay (a Rp 0 bill): Rp 0 simply marks it settled.
  const invalid =
    amount <= 0 && outstanding > 0
      ? 'Masukkan jumlah yang dibayar.'
      : amount > outstanding
        ? `Maksimal ${rupiah(outstanding)} (sisa tagihan).`
        : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return setError(invalid);
    setSaving(true);
    setError('');
    try {
      const result = await billingApi.createPayment(billing.id, { method, amount, note: note.trim() || undefined });
      onPaid(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mencatat pembayaran');
      setSaving(false);
    }
  };

  return (
    <div className="pay-modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form className="pay-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="pay-modal-title">
        <div className="pay-modal-head">
          <h2 id="pay-modal-title">{isSettlement ? 'Pelunasan' : 'Catat Pembayaran'}</h2>
          <p>
            {billing.invoiceNumber}
            {billing.patientName ? ` · ${billing.patientName}` : ''}
          </p>
        </div>

        <div className="pay-modal-body">
          <div className="pay-summary">
            <div>
              <span>Total tagihan</span>
              <b>{rupiah(billing.grandTotal)}</b>
            </div>
            <div>
              <span>Sudah dibayar</span>
              <b>{rupiah(paid)}</b>
            </div>
            <div className="due">
              <span>Sisa tagihan</span>
              <b>{rupiah(outstanding)}</b>
            </div>
          </div>

          <label className="pay-field">
            <span>Jumlah dibayar sekarang</span>
            <div className="pay-amount">
              <em>Rp</em>
              <input
                inputMode="numeric"
                value={amount ? amount.toLocaleString('id-ID') : ''}
                onChange={(e) => {
                  setAmountText(e.target.value);
                  setError('');
                }}
                placeholder="0"
                autoFocus
                aria-invalid={!!invalid}
              />
            </div>
          </label>
          <div className="pay-chips">
            <button type="button" className={amount === outstanding ? 'on' : ''} onClick={() => setAmountText(String(outstanding))}>
              Lunasi sisa ({rupiah(outstanding)})
            </button>
            {outstanding >= 20000 && (
              <button
                type="button"
                className={amount === Math.round(outstanding / 2) ? 'on' : ''}
                onClick={() => setAmountText(String(Math.round(outstanding / 2)))}
              >
                Setengah ({rupiah(Math.round(outstanding / 2))})
              </button>
            )}
          </div>

          <div className="pay-field">
            <span>Metode pembayaran</span>
            <CustomSelect value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={PAYMENT_METHOD_OPTIONS} />
          </div>

          <label className="pay-field">
            <span>Catatan (opsional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="mis. DP via transfer BCA" />
          </label>

          {!invalid && (
            <div className={`pay-after ${remainingAfter === 0 ? 'done' : 'partial'}`}>
              {outstanding === 0
                ? 'Tagihan ini Rp 0 (mis. kontrol yang sudah dibayar di awal, konsultasi gratis) — simpan untuk menandai lunas.'
                : remainingAfter === 0
                ? 'Setelah pembayaran ini, tagihan LUNAS.'
                : `Setelah pembayaran ini masih ada sisa ${rupiah(remainingAfter)} — bisa dilunasi nanti lewat tombol Pelunasan.`}
            </div>
          )}
          {error && <div className="pay-error">{error}</div>}
        </div>

        <div className="pay-modal-foot">
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !!invalid}>
            {saving ? 'Menyimpan…' : outstanding === 0 ? 'Tandai Lunas (Rp 0)' : remainingAfter === 0 && !invalid ? 'Simpan & Lunas' : 'Simpan Pembayaran'}
          </button>
        </div>
      </form>
    </div>
  );
}
