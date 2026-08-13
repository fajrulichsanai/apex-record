'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { clinicSubscriptionApi, subscriptionPlanApi } from '@/lib/subscription';
import type { ClinicSubscription, SubscriptionPlan } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency } from '@/lib/format';
import '../../../styles/super-admin.css';

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SuperAdminClinicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clinicId = Number(params?.id);
  const { success, error: showError } = useToast();

  const [history, setHistory] = useState<ClinicSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, planList] = await Promise.all([
        clinicSubscriptionApi.getForClinic(clinicId),
        subscriptionPlanApi.list(),
      ]);
      setHistory(hist);
      setPlans(planList.filter((p) => p.isActive));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat data klinik');
    } finally {
      setLoading(false);
    }
  }, [clinicId, showError]);

  useEffect(() => {
    if (clinicId) load();
  }, [clinicId, load]);

  const current = history[0] || null;
  const clinicName = current?.clinicName;

  const handleExtend = async () => {
    if (!selectedPlanId) {
      showError('Pilih paket langganan terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      await clinicSubscriptionApi.manualExtend({
        clinicId,
        planId: Number(selectedPlanId),
        notes: notes || undefined,
      });
      success('Langganan klinik berhasil diperpanjang');
      setModalOpen(false);
      setSelectedPlanId('');
      setNotes('');
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memperpanjang langganan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>{clinicName || `Klinik #${clinicId}`}</h1>
              {current && (
                <span className={`tag ${current.status === 'active' ? 'tag-active' : 'tag-expired'}`}>
                  {current.status === 'active' ? 'Aktif' : 'Kadaluarsa'}
                </span>
              )}
            </div>
            <p className="page-subtitle">Riwayat langganan dan perpanjangan manual.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-outline" onClick={() => router.push('/super-admin/clinics')}>
              &larr; Kembali
            </button>
            <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
              Perpanjang Manual
            </button>
          </div>
        </div>

        {current && (
          <div className="card">
            <h3>Langganan Saat Ini</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-sub)' }}>
              Paket <strong>{current.plan?.name}</strong> &middot; Berlaku {formatDate(current.startDate)} s/d {formatDate(current.endDate)}
            </p>
          </div>
        )}

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Paket</th>
                <th>Mulai</th>
                <th>Berakhir</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty-row">Memuat...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={5} className="empty-row">Klinik ini belum pernah berlangganan.</td></tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.plan?.name}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(row.endDate)}</td>
                    <td>
                      <span className={`tag ${row.status === 'active' ? 'tag-active' : 'tag-expired'}`}>
                        {row.status === 'active' ? 'Aktif' : 'Kadaluarsa'}
                      </span>
                    </td>
                    <td>{row.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="sa-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <h2>Perpanjang Langganan</h2>
              <button type="button" className="sa-modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-field">
                <label>Paket Langganan</label>
                <CustomSelect
                  value={selectedPlanId}
                  onChange={setSelectedPlanId}
                  options={plans.map((p) => ({ value: String(p.id), label: `${p.name} — Rp ${formatCurrency(p.price)} / ${p.durationDays} hari` }))}
                  placeholder="Pilih paket"
                />
              </div>
              <div className="sa-field">
                <label>Catatan (opsional)</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: konfirmasi transfer manual via WA" />
              </div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
              <button type="button" className="btn-primary" onClick={handleExtend} disabled={submitting}>
                {submitting ? 'Memproses...' : 'Perpanjang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
