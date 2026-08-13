'use client';

import { useCallback, useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { subscriptionPlanApi } from '@/lib/subscription';
import type { SubscriptionPlan } from '@/types/subscription';
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
}

const EMPTY_FORM: PlanForm = { name: '', durationDays: '', price: '', isActive: true };

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
            <p className="page-subtitle">Kelola paket bulanan, 3 bulan, dan tahunan.</p>
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
                <th>Durasi</th>
                <th>Harga</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="empty-row">Memuat...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={5} className="empty-row">Belum ada paket langganan.</td></tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id}>
                    <td style={{ fontWeight: 600 }}>{plan.name}</td>
                    <td>{plan.durationDays} hari</td>
                    <td>Rp {formatCurrency(plan.price)}</td>
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
                <label>Harga (Rp)</label>
                <input
                  type="text"
                  value={formatCurrency(form.price)}
                  onChange={(e) => setForm({ ...form, price: String(parseCurrency(e.target.value)) })}
                  placeholder="150.000"
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
