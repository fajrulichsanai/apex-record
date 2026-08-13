'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import { paymentApi, subscriptionPlanApi } from '@/lib/subscription';
import type { Payment, SubscriptionPlan } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import { useSubscriptionGate } from '@/lib/subscription-gate-context';
import './langganan.css';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
  const { subscription, refresh } = useSubscriptionGate();
  const { success, error: showError } = useToast();
  const canSubmit = !isFeatureViewOnly(user?.role, 'langganan');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
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

  const handleClaimPaid = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await paymentApi.create({ planId: selectedPlan.id, amount: selectedPlan.price });
      success('Klaim pembayaran terkirim. Menunggu konfirmasi Super Admin.');
      setSelectedPlan(null);
      loadHistory();
      refresh();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mengirim klaim pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = subscription?.status === 'active' && new Date(subscription.endDate) >= new Date(new Date().toDateString());

  return (
    <>
      <div className="langganan-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title"><h1>Langganan</h1></div>
            <p className="page-subtitle">Status langganan klinik dan riwayat pembayaran.</p>
          </div>
        </div>

        <div className="card status-card">
          {subscription ? (
            <>
              <span className={`tag ${isActive ? 'tag-active' : 'tag-expired'}`}>
                {isActive ? 'Aktif' : 'Kadaluarsa'}
              </span>
              <p>
                Paket <strong>{subscription.plan?.name}</strong> &middot; Berlaku sampai{' '}
                <strong>{formatDate(subscription.endDate)}</strong>
              </p>
            </>
          ) : (
            <>
              <span className="tag tag-expired">Belum Berlangganan</span>
              <p>Klinik Anda belum memiliki langganan aktif.</p>
            </>
          )}
        </div>

        {!canSubmit && (
          <div className="alert-info">
            Hanya Owner klinik yang dapat mengajukan pembayaran langganan. Hubungi Owner untuk memperpanjang.
          </div>
        )}

        {canSubmit && (
          <div className="card">
            <h3>Perpanjang Langganan</h3>
            {loading ? (
              <p>Memuat paket...</p>
            ) : !selectedPlan ? (
              <div className="plan-grid">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" className="plan-card" onClick={() => setSelectedPlan(plan)}>
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">Rp {formatCurrency(plan.price)}</div>
                    <div className="plan-duration">{plan.durationDays} hari</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="payment-step">
                <p>
                  Paket dipilih: <strong>{selectedPlan.name}</strong> — Rp {formatCurrency(selectedPlan.price)}
                </p>
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
                <div className="payment-actions">
                  <button type="button" className="btn-outline" onClick={() => setSelectedPlan(null)} disabled={submitting}>
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
                  <th>Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={4} className="empty-row">Belum ada riwayat pembayaran.</td></tr>
                ) : (
                  history.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>{p.plan?.name || '-'}</td>
                      <td>Rp {formatCurrency(p.amount)}</td>
                      <td>
                        <span className={`tag ${p.status === 'confirmed' ? 'tag-confirmed' : p.status === 'rejected' ? 'tag-rejected' : 'tag-pending'}`}>
                          {p.status === 'confirmed' ? 'Dikonfirmasi' : p.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                        </span>
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
