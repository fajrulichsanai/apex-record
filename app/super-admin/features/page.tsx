'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { featuresApi, type CustomFeature } from '@/lib/features';
import { useToast } from '@/lib/toast-context';
import '../../styles/super-admin.css';
import '@/components/features/features.css';

/**
 * Super admin: daftar fitur custom. Fitur custom mati secara bawaan; nyalakan
 * per klinik (Klinik → detail → Fitur Klinik), lalu owner memilih user-nya.
 */
export default function SuperAdminFeaturesPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CustomFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await featuresApi.listCustom());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat fitur custom', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await featuresApi.createCustom({
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      showToast('Fitur custom ditambahkan', 'success');
      setForm({ key: '', name: '', description: '' });
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menambah fitur', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(f: CustomFeature) {
    if (!window.confirm(`Hapus fitur "${f.name}"? Pengaturannya di semua klinik & user ikut terhapus.`)) return;
    try {
      await featuresApi.deleteCustom(f.id);
      showToast('Fitur custom dihapus', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus', 'error');
    }
  }

  return (
    <SuperAdminLayout>
      <div className="sa-page">
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Fitur Custom</h1>
            </div>
            <p className="page-subtitle">
              Fitur khusus yang hanya muncul untuk klinik dan user tertentu. Setelah didaftarkan, nyalakan di halaman
              detail klinik; owner klinik lalu memilih user yang mendapatkannya.
            </p>
          </div>
        </div>

        <div className="card">
          <h3>Tambah fitur custom</h3>
          <form className="ft-form" onSubmit={submit}>
            <label>
              Kunci
              <div className="ft-key">
                <span>custom:</span>
                <input
                  required
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="mis. laporan-bpjs"
                  maxLength={49}
                />
              </div>
              <small>Huruf kecil, angka, tanda hubung. Dipakai di kode untuk menampilkan fiturnya.</small>
            </label>
            <label>
              Nama
              <input
                required
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="mis. Laporan BPJS"
              />
            </label>
            <label className="ft-span-2">
              Deskripsi
              <input
                value={form.description}
                maxLength={500}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="opsional"
              />
            </label>
            <div className="ft-span-2">
              <button type="submit" className="btn-primary" disabled={saving || form.key.length < 2 || !form.name.trim()}>
                {saving ? 'Menyimpan…' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>

        <div className="table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Kunci</th>
                <th>Nama</th>
                <th>Deskripsi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="empty-row">Memuat...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="empty-row">Belum ada fitur custom.</td></tr>
              ) : (
                items.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{f.key}</td>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td>{f.description || '-'}</td>
                    <td>
                      <button type="button" className="btn-outline btn-sm" onClick={() => remove(f)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
