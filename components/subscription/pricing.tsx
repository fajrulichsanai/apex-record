'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { subscriptionPlanApi } from '@/lib/subscription';
import {
  DURATION_OPTIONS,
  type DurationDiscounts,
  type Payment,
  type PriceQuote,
  type SubscriptionPlan,
  type SubscriptionPlanTier,
} from '@/types/subscription';

/** Sama dengan bawaan server; dipakai sampai pengaturan Super Admin termuat. */
export const DEFAULT_DURATION_DISCOUNTS: DurationDiscounts = { 1: 0, 3: 5, 6: 10, 12: 17 };

export function formatPromoDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Persen hemat harga promo terhadap harga normal (dibulatkan). */
export function promoSavingPct(plan: SubscriptionPlan) {
  const price = Number(plan.price);
  if (!plan.promoActive || !price) return 0;
  return Math.round(((price - Number(plan.effectivePrice ?? plan.promoPrice)) / price) * 100);
}

/**
 * Paket bulanan satu tier. Lama langganan kini dipilih lewat 1/3/6/12 bulan,
 * jadi paket "tahunan" lama tidak dipakai lagi di halaman pembelian.
 */
export function monthlyPlanFor(plans: SubscriptionPlan[], tier: SubscriptionPlanTier) {
  return (
    plans.find((p) => p.tier === tier && p.billingCycle === 'monthly') ??
    plans.find((p) => p.tier === tier && !p.billingCycle) ??
    null
  );
}

export function useDurationDiscounts() {
  const [discounts, setDiscounts] = useState<DurationDiscounts>(DEFAULT_DURATION_DISCOUNTS);
  useEffect(() => {
    let active = true;
    subscriptionPlanApi
      .durationDiscounts()
      .then((d) => active && setDiscounts(d))
      .catch(() => {
        // keep the defaults — the server quote is what gets billed anyway
      });
    return () => {
      active = false;
    };
  }, []);
  return discounts;
}

/**
 * Rincian harga dari server untuk pilihan saat ini; `key` berubah setiap
 * kali paket, lama langganan, jumlah klinik, atau storage berubah.
 */
export function useQuote<T = PriceQuote>(fetcher: (() => Promise<T>) | null, key: string) {
  const [quote, setQuote] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!fetcher) return;
    let active = true;
    const timer = setTimeout(() => {
      fetcher()
        .then((q) => {
          if (!active) return;
          setQuote(q);
          setFailed(false);
        })
        .catch(() => active && setFailed(true));
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // The fetcher is rebuilt every render; `key` describes what it fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = fetcher && quote ? quote : null;
  return { quote: current, failed };
}

export function DurationPicker({
  months,
  onChange,
  discounts,
  disabled,
}: {
  months: number;
  onChange: (months: number) => void;
  discounts: DurationDiscounts;
  disabled?: boolean;
}) {
  return (
    <div className="cycle-toggle duration-toggle" role="radiogroup" aria-label="Lama langganan">
      {DURATION_OPTIONS.map((m) => {
        const pct = discounts[m] ?? 0;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={months === m}
            className={months === m ? 'active' : ''}
            disabled={disabled}
            onClick={() => onChange(m)}
          >
            {m === 12 ? '1 tahun' : `${m} bulan`}
            {pct > 0 && <span className="save-badge">−{pct}%</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Harga coret + harga promo + badge, lalu total untuk lama langganan terpilih. */
export function PlanPrice({
  plan,
  months,
  discountPct,
  perClinic,
}: {
  plan: SubscriptionPlan;
  months: number;
  discountPct: number;
  perClinic?: boolean;
}) {
  const effective = Number(plan.effectivePrice ?? plan.price);
  const saving = promoSavingPct(plan);
  const periodTotal = Math.round(effective * months * (1 - discountPct / 100));
  return (
    <>
      {plan.promoActive && (
        <div className="tier-price-old">
          <s>Rp {formatCurrency(Number(plan.price))}</s>
          <span className="promo-badge">
            Promo{plan.promoUntil ? ` s.d. ${formatPromoDate(plan.promoUntil)}` : ''} · hemat {saving}%
          </span>
        </div>
      )}
      <div className="tier-price">
        <span className="tier-price-amount">Rp {formatCurrency(effective)}</span>
        <span className="tier-price-unit">/{perClinic ? 'klinik/' : ''}bulan</span>
      </div>
      {months > 1 && (
        <div className="tier-savings">
          {months === 12 ? '1 tahun' : `${months} bulan`}: Rp {formatCurrency(periodTotal)}
          {perClinic ? '/klinik' : ''}
          {discountPct > 0 ? ` · hemat ${discountPct}% lagi` : ''}
        </div>
      )}
    </>
  );
}

/** Rincian tagihan persis seperti yang akan ditagihkan server. */
export function QuoteBreakdown({ quote, unitLabel = 'klinik' }: { quote: PriceQuote; unitLabel?: string }) {
  const monthsLabel = quote.months === 1 ? '1 bulan' : `${quote.months} bulan`;
  const planList = quote.listUnitPrice * quote.quantity * quote.months;
  const saved = quote.promoDiscount + quote.durationDiscount;
  return (
    <div className="price-breakdown">
      <div className="breakdown-row">
        <span>
          {quote.quantity > 1 || (quote.listOwnerFee ?? quote.ownerFee) > 0 ? `${quote.quantity} ${unitLabel} × ` : ''}
          Rp {formatCurrency(quote.listUnitPrice)} × {monthsLabel}
          {quote.promoActive ? ' (harga normal)' : ''}
        </span>
        <span>Rp {formatCurrency(planList)}</span>
      </div>
      {quote.ownerFee > 0 && (
        <div className="breakdown-row">
          <span>Biaya admin owner × {monthsLabel}</span>
          <span>Rp {formatCurrency((quote.listOwnerFee ?? quote.ownerFee) * quote.months)}</span>
        </div>
      )}
      {quote.promoDiscount > 0 && (
        <div className="breakdown-row discount">
          <span>
            Potongan promo (Rp {formatCurrency(quote.unitPrice)}/bulan
            {quote.listOwnerFee && quote.ownerFee < quote.listOwnerFee
              ? ` + admin owner Rp ${formatCurrency(quote.ownerFee)}`
              : ''}
            {quote.promoUntil ? ` s.d. ${formatPromoDate(quote.promoUntil)}` : ''})
          </span>
          <span>− Rp {formatCurrency(quote.promoDiscount)}</span>
        </div>
      )}
      {quote.durationDiscount > 0 && (
        <div className="breakdown-row discount">
          <span>
            Diskon langganan {monthsLabel} ({quote.durationDiscountPct}%)
          </span>
          <span>− Rp {formatCurrency(quote.durationDiscount)}</span>
        </div>
      )}
      {quote.extraStorageGb > 0 && (
        <div className="breakdown-row">
          <span>
            Storage tambahan {quote.extraStorageGb} GB × {monthsLabel}
          </span>
          <span>Rp {formatCurrency(quote.storageAmount)}</span>
        </div>
      )}
      <div className="breakdown-row total">
        <span>Total Tagihan</span>
        <span>Rp {formatCurrency(quote.total)}</span>
      </div>
      {saved > 0 && <p className="breakdown-saved">Anda hemat Rp {formatCurrency(saved)}.</p>}
    </div>
  );
}

/** Ringkas: jumlah klinik, lama langganan, dan total potongan satu pembayaran. */
export function paymentDetail(p: Payment) {
  const parts: string[] = [];
  if (p.kind === 'upgrade') return 'Naik paket (selisih sisa hari)';
  if (p.quantity > 1) parts.push(`${p.quantity} klinik`);
  if ((p.months ?? 1) > 1) parts.push(`${p.months} bulan`);
  const saved = Number(p.promoDiscount ?? 0) + Number(p.durationDiscount ?? 0);
  if (saved > 0) parts.push(`hemat Rp ${formatCurrency(saved)}`);
  return parts.length ? parts.join(' · ') : '-';
}
