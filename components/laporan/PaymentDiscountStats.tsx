'use client';

import type { FinancialDiscountStats, FinancialPaymentStats } from '@/lib/reports';

const rupiah = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

/**
 * How the period's bills were paid (lunas, DP, belum bayar, gratis) and how
 * much discount was given.
 */
export default function PaymentDiscountStats({
  payment,
  discount,
}: {
  payment: FinancialPaymentStats;
  discount?: FinancialDiscountStats;
}) {
  const { lunas, dp, unpaid, free } = payment;
  const total = lunas.count + dp.openCount + unpaid.count + free.count;
  const share = (n: number) => (total ? (n / total) * 100 : 0);
  const segments = [
    { key: 'lunas', label: 'Lunas', count: lunas.count },
    { key: 'dp', label: 'DP (belum lunas)', count: dp.openCount },
    { key: 'unpaid', label: 'Belum bayar', count: unpaid.count },
    { key: 'free', label: 'Gratis (Rp 0)', count: free.count },
  ];

  return (
    <div className="panel pay-stats-panel">
      <div className="panel-header">
        <h2>Statistik Pembayaran &amp; Diskon</h2>
        <span className="referral-panel-sub">{total} tagihan pada periode ini</span>
      </div>

      <div className="pay-stats-body">
        {total > 0 && (
          <div className="pay-stats-bar" aria-hidden="true">
            {segments.map((s) =>
              s.count ? <span key={s.key} className={s.key} style={{ width: `${share(s.count)}%` }} /> : null,
            )}
          </div>
        )}

        <div className="pay-stats-grid">
          <div className="pay-stat lunas">
            <span className="pay-stat-label">Lunas</span>
            <b>{lunas.count} tagihan</b>
            <span className="pay-stat-sub">{rupiah(lunas.amount)}</span>
          </div>
          <div className="pay-stat dp">
            <span className="pay-stat-label">Bayar DP</span>
            <b>{dp.count} tagihan</b>
            <span className="pay-stat-sub">Total DP {rupiah(dp.dpTotal)}</span>
            <span className="pay-stat-sub">
              {dp.settledCount} sudah dilunasi · {dp.openCount} masih DP
            </span>
          </div>
          <div className="pay-stat open">
            <span className="pay-stat-label">Sisa DP belum dilunasi</span>
            <b>{rupiah(dp.openOutstanding)}</b>
            <span className="pay-stat-sub">
              dari {dp.openCount} tagihan (sudah masuk {rupiah(dp.openPaid)})
            </span>
          </div>
          <div className="pay-stat unpaid">
            <span className="pay-stat-label">Belum bayar sama sekali</span>
            <b>{unpaid.count} tagihan</b>
            <span className="pay-stat-sub">{rupiah(unpaid.amount)}</span>
          </div>
          <div className="pay-stat free">
            <span className="pay-stat-label">Gratis (Rp 0)</span>
            <b>{free.count} kunjungan</b>
            <span className="pay-stat-sub">Kontrol yang sudah dibayar di awal, konsultasi gratis</span>
          </div>
          {discount && (
            <div className="pay-stat discount">
              <span className="pay-stat-label">Total diskon diberikan</span>
              <b>{rupiah(discount.totalDiscount)}</b>
              <span className="pay-stat-sub">
                {discount.billingsWithDiscount} dari {discount.billCount} tagihan · {discount.discountRate}% dari harga normal
              </span>
              <span className="pay-stat-sub">
                Per tindakan {rupiah(discount.itemDiscount)} · per tagihan {rupiah(discount.billDiscount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
