'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { receiptApi } from '@/lib/super-admin';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';
import { COMPANY } from '@/lib/company';
import type { Receipt } from '@/types/subscription';
import '../../styles/super-admin.css';

function rp(n: number) {
  return `Rp ${formatCurrency(n)}`;
}

/**
 * Kuitansi pembayaran yang sudah dikonfirmasi ("Lunas, dikonfirmasi"). Bisa
 * dicetak atau disimpan sebagai PDF dari browser (Cetak › Simpan sebagai PDF).
 * Dibuka owner klinik, Multi-Klinik Owner, atau Super Admin.
 */
export default function KuitansiPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const paymentId = Number(id);
    (user.role === 'multi_clinic_owner' ? receiptApi.forOwner(paymentId) : receiptApi.forClinic(paymentId))
      .then(setReceipt)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Kuitansi tidak ditemukan'));
  }, [id, user, authLoading]);

  if (error) return <p className="receipt">{error}</p>;
  if (!receipt) return <p className="receipt">Memuat kuitansi...</p>;

  const upgrade = receipt.kind === 'upgrade';
  const months = receipt.months > 1 ? ` × ${receipt.months} bulan` : '';
  const qty = receipt.quantity > 1 ? ` × ${receipt.quantity} klinik` : '';
  const planTotal = receipt.amount + receipt.promoDiscount + receipt.durationDiscount - receipt.storageAmount;

  return (
    <main className="receipt-screen">
      <div className="receipt-actions">
        <button
          type="button"
          className="receipt-btn"
          onClick={() =>
            receiptApi
              .downloadPdf(Number(id), user?.role === 'multi_clinic_owner')
              .catch((err) => setError(err instanceof ApiError ? err.message : 'Gagal mengunduh PDF'))
          }
        >
          Unduh PDF
        </button>
        <button type="button" className="receipt-btn receipt-btn-outline" onClick={() => window.print()}>
          Cetak
        </button>
      </div>
      <article className="receipt">
        <header className="receipt-head">
          <div>
            <h1>Kuitansi</h1>
            <div>No. {receipt.number}</div>
            <div>Tanggal {receipt.confirmedAt ? new Date(receipt.confirmedAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</div>
          </div>
          <div className="receipt-from">
            <strong>{COMPANY.brand}</strong>
            <div>{COMPANY.legalName}</div>
            <span className="receipt-paid">{receipt.status.toUpperCase()}</span>
          </div>
        </header>

        <p>
          Telah diterima dari <strong>{receipt.billedTo?.name ?? '-'}</strong>
          {receipt.billedTo?.email ? ` (${receipt.billedTo.email})` : ''} untuk langganan ApexRecord:
        </p>

        <table>
          <tbody>
            <tr>
              <td>
                {upgrade ? (
                  <>Naik paket ke {receipt.planName} (selisih sisa masa aktif)</>
                ) : (
                  <>
                    {receipt.planName ?? 'Langganan'}
                    {qty}
                    {months}
                  </>
                )}
              </td>
              <td>{rp(planTotal)}</td>
            </tr>
            {receipt.promoDiscount > 0 && (
              <tr>
                <td>Potongan promo</td>
                <td>− {rp(receipt.promoDiscount)}</td>
              </tr>
            )}
            {receipt.durationDiscount > 0 && (
              <tr>
                <td>Diskon langganan {receipt.months} bulan</td>
                <td>− {rp(receipt.durationDiscount)}</td>
              </tr>
            )}
            {receipt.storageAmount > 0 && (
              <tr>
                <td>Storage tambahan {receipt.extraStorageGb} GB</td>
                <td>{rp(receipt.storageAmount)}</td>
              </tr>
            )}
            <tr className="total">
              <td>Total dibayar</td>
              <td>{rp(receipt.amount)}</td>
            </tr>
          </tbody>
        </table>

        {receipt.clinics.length > 0 && (
          <p>
            {upgrade ? 'Paket dinaikkan untuk' : 'Langganan diperpanjang untuk'}: {receipt.clinics.map((c) => c.name).join(', ')}.
          </p>
        )}
        <p className="receipt-note">
          Harga sudah final; {COMPANY.brand} belum berstatus PKP sehingga tidak memungut PPN. Kuitansi ini dibuat otomatis
          dan sah tanpa tanda tangan.
        </p>
      </article>
    </main>
  );
}
