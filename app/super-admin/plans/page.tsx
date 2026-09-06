'use client';

import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { subscriptionPlanApi } from '@/lib/subscription';
import type { SubscriptionBillingCycle, SubscriptionPlan, SubscriptionPlanTier } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency, parseCurrency } from '@/lib/format';
import '../../styles/super-admin.css';

interface PlanForm {
  id?: number;
  name: string;
  durationDays: string;
  price: string;
  isActive: boolean;
  tier: '' | SubscriptionPlanTier;
  billingCycle: '' | SubscriptionBillingCycle;
  ownerFee: string;
}

const EMPTY_FORM: PlanForm = { name: '', durationDays: '', price: '', isActive: true, tier: '', billingCycle: '', ownerFee: '' };

const TIER_OPTIONS = [
  { value: '', label: '— Tanpa tier (legacy) —' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'multi_klinik', label: 'Multi Klinik' },
];

const CYCLE_OPTIONS = [
  { value: '', label: '— Tanpa siklus —' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

function tierLabel(tier?: SubscriptionPlanTier | null) {
  if (tier === 'basic') return 'Basic';
  if (tier === 'pro') return 'Pro';
  if (tier === 'multi_klinik') return 'Multi Klinik';
  return '-';
}

function cycleLabel(cycle?: SubscriptionBillingCycle | null) {
  if (cycle === 'monthly') return 'Bulanan';
  if (cycle === 'yearly') return 'Tahunan';
  return '-';
}

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await subscriptionPlanApi.list());
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat paket langganan');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setForm({
      id: plan.id,
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
      isActive: plan.isActive,
      tier: plan.tier || '',
      billingCycle: plan.billingCycle || '',
      ownerFee: plan.ownerFee ? String(plan.ownerFee) : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.durationDays || !form.price) {
      showError('Lengkapi semua field');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        durationDays: Number(form.durationDays),
        price: parseCurrency(form.price),
        isActive: form.isActive,
        tier: form.tier || undefined,
        billingCycle: form.billingCycle || undefined,
        ownerFee: form.ownerFee ? parseCurrency(form.ownerFee) : undefined,
      };
      if (form.id) {
        await subscriptionPlanApi.update(form.id, payload);
        success('Paket berhasil diperbarui');
      } else {
        await subscriptionPlanApi.create(payload);
        success('Paket berhasil dibuat');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan paket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (plan: SubscriptionPlan) => {
    try {
      await subscriptionPlanApi.remove(plan.id);
      success('Paket dinonaktifkan');
      load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menonaktifkan paket');
    }
  };

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Paket Langganan</h1>
              <span className="badge-count">{plans.length}</span>
            </div>
            <p className="page-subtitle">Kelola paket Basic, Pro, dan Multi Klinik untuk siklus bulanan &amp; tahunan.</p>
          </div>
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Tambah Paket
          </button>
        </div>

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tier / Siklus</th>
                <th>Durasi</th>
                <th>Harga</th>
                <th>Fee Owner</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty-row">Memuat...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={7} className="empty-row">Belum ada paket langganan.</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id}>
                    <td style={{ fontWeight: 600 }}>{plan.name}</td>
                    <td>{tierLabel(plan.tier)} · {cycleLabel(plan.billingCycle)}</td>
                    <td>{plan.durationDays} hari</td>
                    <td>Rp {formatCurrency(plan.price)}</td>
                    <td>{plan.ownerFee ? `Rp ${formatCurrency(plan.ownerFee)}` : '-'}</td>
                    <td>
                      <span className={`tag ${plan.isActive ? 'tag-active' : 'tag-neutral'}`}>
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn-outline btn-sm" onClick={() => openEdit(plan)}>
                        Ubah
                      </button>
                      {plan.isActive && (
                        <button type="button" className="btn-danger btn-sm" onClick={() => handleDeactivate(plan)}>
                          Nonaktifkan
                        </button>
                      )}
                    </td>
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
              <h2>{form.id ? 'Ubah Paket' : 'Tambah Paket'}</h2>
              <button type="button" className="sa-modal-close" onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="sa-modal-body">
              <div className="sa-field">
                <label>Nama Paket</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Bulanan" />
              </div>
              <div className="sa-field">
                <label>Durasi (hari)</label>
                <input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="30" />
              </div>
              <div className="sa-field">
                <label>Harga (Rp) {form.tier === 'multi_klinik' ? '— per klinik' : ''}</label>
                <input
                  type="text"
                  value={formatCurrency(form.price)}
                  onChange={(e) => setForm({ ...form, price: String(parseCurrency(e.target.value)) })}
                  placeholder="150.000"
                />
              </div>
              <div className="sa-field">
                <label>Tier</label>
                <CustomSelect
                  value={form.tier}
                  onChange={(v) => setForm({ ...form, tier: v as PlanForm['tier'] })}
                  options={TIER_OPTIONS}
                />
              </div>
              <div className="sa-field">
                <label>Siklus Penagihan</label>
                <CustomSelect
                  value={form.billingCycle}
                  onChange={(v) => setForm({ ...form, billingCycle: v as PlanForm['billingCycle'] })}
                  options={CYCLE_OPTIONS}
                />
              </div>
              {form.tier === 'multi_klinik' && (
                <div className="sa-field">
                  <label>Biaya Admin Owner (Rp, sekali per periode)</label>
                  <input
                    type="text"
                    value={formatCurrency(form.ownerFee)}
                    onChange={(e) => setForm({ ...form, ownerFee: String(parseCurrency(e.target.value)) })}
                    placeholder="99.000"
                  />
                </div>
              )}
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Batal</button>
              <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
