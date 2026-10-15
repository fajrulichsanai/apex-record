'use client';

import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { subscriptionPlanApi } from '@/lib/subscription';
import type { SubscriptionBillingCycle, SubscriptionPlan, SubscriptionPlanTier } from '@/types/subscription';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { formatCurrency, parseCurrency } from '@/lib/format';
import { useEscapeKey } from '@/lib/a11y';
import '../../styles/super-admin.css';
import { formatGb } from '@/lib/storage';
import { PageHeader } from '@/components/super-admin/ui';
import { formatPromoDate, promoSavingPct } from '@/components/subscription/pricing';

interface PlanForm {
  id?: number;
  name: string;
  durationDays: string;
  price: string;
  isActive: boolean;
  tier: '' | SubscriptionPlanTier;
  billingCycle: '' | SubscriptionBillingCycle;
  ownerFee: string;
  storageGb: string;
  maxUsers: string;
  promoPrice: string;
  promoUntil: string;
  promoOwnerFee: string;
}

const EMPTY_FORM: PlanForm = { name: '', durationDays: '', price: '', isActive: true, tier: '', billingCycle: '', ownerFee: '', storageGb: '', maxUsers: '', promoPrice: '', promoUntil: '', promoOwnerFee: '' };

// Bawaan bila paket tidak mengisi jatah storage (cerminan StorageQuotaService).
const DEFAULT_STORAGE_GB: Record<string, number> = { trial: 0.1, basic: 1, pro: 5, multi_klinik: 5 };
const DEFAULT_MAX_USERS: Record<string, number> = { trial: 5, basic: 5, pro: 25, multi_klinik: 25 };

const TIER_OPTIONS = [
  { value: '', label: '— Tanpa tier (legacy) —' },
  { value: 'trial', label: 'Free Trial' },
  { value: 'basic', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'multi_klinik', label: 'Multi Klinik' },
];

const CYCLE_OPTIONS = [
  { value: '', label: '— Tanpa siklus —' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

function tierLabel(tier?: SubscriptionPlanTier | null) {
  if (tier === 'trial') return 'Free Trial';
  if (tier === 'basic') return 'Starter';
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
  useEscapeKey(() => setModalOpen(false), modalOpen);
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
      storageGb: plan.storageGb != null ? String(plan.storageGb) : '',
      maxUsers: plan.maxUsers != null ? String(plan.maxUsers) : '',
      promoPrice: plan.promoPrice != null ? String(Number(plan.promoPrice)) : '',
      promoUntil: plan.promoUntil ? plan.promoUntil.slice(0, 10) : '',
      promoOwnerFee: plan.promoOwnerFee != null ? String(Number(plan.promoOwnerFee)) : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.durationDays || !form.price) {
      showError('Lengkapi semua field');
      return;
    }
    const hasPromo = form.promoPrice !== '' && Number(form.promoPrice) > 0;
    if (hasPromo && !form.promoUntil) {
      showError('Isi tanggal akhir promo');
      return;
    }
    if (hasPromo && Number(form.promoPrice) >= Number(form.price)) {
      showError('Harga promo harus lebih murah dari harga normal');
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
        storageGb: form.storageGb !== '' ? Number(form.storageGb) : undefined,
        maxUsers: form.maxUsers !== '' ? Number(form.maxUsers) : undefined,
        // Kosongkan harga promo untuk menghapus promo.
        promoPrice: hasPromo ? Number(form.promoPrice) : null,
        promoUntil: hasPromo ? form.promoUntil : null,
        promoOwnerFee: hasPromo && form.tier === 'multi_klinik' && form.promoOwnerFee !== '' ? Number(form.promoOwnerFee) : null,
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
        <PageHeader
          title="Paket Langganan"
          count={plans.length}
          subtitle="Kelola paket Free Trial, Starter, Pro, dan Multi Klinik. Harga diisi per bulan; klinik memilih lama langganan 1/3/6/12 bulan dengan diskon dari Pengaturan Platform."
          actions={
            <button type="button" className="btn-primary" onClick={openCreate}>
              + Tambah Paket
            </button>
          }
        />

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tier / Siklus</th>
                <th>Durasi</th>
                <th>Harga</th>
                <th>Fee Owner</th>
                <th>Storage</th>
                <th>Akun</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="empty-row">Memuat...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">Belum ada paket langganan.</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="cell-strong">{plan.name}</td>
                    <td>{tierLabel(plan.tier)} · {cycleLabel(plan.billingCycle)}</td>
                    <td>{plan.durationDays} hari</td>
                    <td>
                      {plan.promoActive ? (
                        <>
                          <s className="text-muted">Rp {formatCurrency(plan.price)}</s>
                          <br />
                          <strong>Rp {formatCurrency(Number(plan.effectivePrice))}</strong>
                          <br />
                          <small>
                            promo s.d. {formatPromoDate(plan.promoUntil!)} · hemat {promoSavingPct(plan)}%
                          </small>
                        </>
                      ) : (
                        <>
                          Rp {formatCurrency(plan.price)}
                          {plan.promoPrice != null && plan.promoUntil && (
                            <>
                              <br />
                              <small className="text-muted">promo berakhir {formatPromoDate(plan.promoUntil)}</small>
                            </>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {plan.ownerFee ? `Rp ${formatCurrency(plan.ownerFee)}` : '-'}
                      {plan.promoActive && plan.promoOwnerFee != null && (
                        <>
                          <br />
                          <small className="text-muted">promo Rp {formatCurrency(Number(plan.promoOwnerFee))}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {plan.storageGb != null
                        ? formatGb(Number(plan.storageGb))
                        : `${formatGb((plan.tier && DEFAULT_STORAGE_GB[plan.tier]) || 1)} (bawaan)`}
                      {plan.tier === 'multi_klinik' && ' / cabang'}
                    </td>
                    <td>
                      {plan.maxUsers != null
                        ? `${plan.maxUsers} akun`
                        : `${(plan.tier && DEFAULT_MAX_USERS[plan.tier]) || 5} akun (bawaan)`}
                      {plan.tier === 'multi_klinik' && ' / cabang'}
                    </td>
                    <td>
                      <span className={`tag ${plan.isActive ? 'tag-active' : 'tag-neutral'}`}>
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="cell-actions">
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
                <label>Harga normal (Rp){form.tier === 'multi_klinik' ? ' — per klinik' : ''}</label>
                <input
                  type="text"
                  value={formatCurrency(form.price)}
                  onChange={(e) => setForm({ ...form, price: String(parseCurrency(e.target.value)) })}
                  placeholder="199.000"
                />
              </div>
              <div className="sa-field">
                <label>Harga promo (Rp, opsional) — tampil dengan harga normal dicoret</label>
                <input
                  type="text"
                  value={form.promoPrice ? formatCurrency(form.promoPrice) : ''}
                  onChange={(e) => {
                    const v = parseCurrency(e.target.value);
                    setForm({ ...form, promoPrice: v ? String(v) : '' });
                  }}
                  placeholder="Kosong = tanpa promo"
                />
              </div>
              {form.promoPrice !== '' && form.tier === 'multi_klinik' && (
                <div className="sa-field">
                  <label>Biaya admin owner saat promo (Rp, opsional)</label>
                  <input
                    type="text"
                    value={form.promoOwnerFee ? formatCurrency(form.promoOwnerFee) : ''}
                    onChange={(e) => {
                      const v = e.target.value.trim() === '' ? '' : String(parseCurrency(e.target.value));
                      setForm({ ...form, promoOwnerFee: v });
                    }}
                    placeholder="Kosong = biaya admin normal"
                  />
                </div>
              )}
              {form.promoPrice !== '' && (
                <div className="sa-field">
                  <label>Promo berlaku s.d. (inklusif)</label>
                  <input type="date" value={form.promoUntil} onChange={(e) => setForm({ ...form, promoUntil: e.target.value })} />
                </div>
              )}
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
              <div className="sa-field">
                <label>Batas akun aktif{form.tier === 'multi_klinik' ? ' per cabang, dihitung bersama' : ''}</label>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder={`Kosong = bawaan ${(form.tier && DEFAULT_MAX_USERS[form.tier]) || 5} akun`}
                />
              </div>
              <div className="sa-field">
                <label>Jatah storage (GB, boleh desimal){form.tier === 'multi_klinik' ? ' per cabang, dipakai bersama' : ''}</label>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={form.storageGb}
                  step={0.1}
                  onChange={(e) => setForm({ ...form, storageGb: e.target.value.replace(/[^0-9.]/g, '') })}
                  placeholder={`Kosong = bawaan ${formatGb((form.tier && DEFAULT_STORAGE_GB[form.tier]) || 1)} (0.1 = 100 MB)`}
                />
              </div>
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
