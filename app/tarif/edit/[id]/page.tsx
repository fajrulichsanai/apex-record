'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CustomSelect from '@/components/form/CustomSelect';
import { tarifApi, Tarif } from '@/lib/tarif';
import { ApiError } from '@/lib/api-client';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import '../../../styles/tarif.css';

export default function EditTarifPage() {
  const router = useRouter();
  const params = useParams();
  const tarifId = Number(params.id);
  const { success, error: toastError, warning } = useToast();

  const [tarif, setTarif] = useState<Tarif | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [kategori, setKategori] = useState('');
  const [hargaPokok, setHargaPokok] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!tarifId) return;
    setLoading(true);
    setLoadError(null);
    tarifApi
      .get(tarifId)
      .then((data) => {
        setTarif(data);
        setName(data.name);
        setKategori(data.kategori);
        setHargaPokok((data.hargaPokok || 0).toString());
        setHargaJual((data.hargaJual || 0).toString());
        setDeskripsi(data.deskripsi || '');
        setIsActive(data.isActive);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat data tarif');
      })
      .finally(() => setLoading(false));
  }, [tarifId]);

  const margin = (parseCurrency(hargaJual) || 0) - (parseCurrency(hargaPokok) || 0);

  const handleCancel = () => router.push('/tarif');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tarif) return;
    if (!name.trim() || !kategori.trim() || !hargaJual.trim()) {
      warning('Title, Category, dan Harga Jual harus diisi');
      return;
    }

    setSubmitting(true);
    try {
      await tarifApi.update(tarif.id, {
        name,
        kategori,
        deskripsi: deskripsi || undefined,
        hargaPokok: parseCurrency(hargaPokok),
        hargaJual: parseCurrency(hargaJual),
        isActive,
      });
      success(`Tarif "${name}" telah diperbarui.`);
      router.push('/tarif');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan tarif';
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="content tarif-page">
        <div className="breadcrumb">
          <Link href="/tarif">Master Data</Link>
          <span className="material-symbols-rounded">chevron_right</span>
          <Link href="/tarif">Tarif</Link>
          <span className="material-symbols-rounded">chevron_right</span>
          <span className="breadcrumb-current">Edit</span>
        </div>

        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Tarif Setting</h1>
            </div>
            <p className="page-subtitle">Kelola tarif layanan klinik dan dasar laporan keuangan.</p>
          </div>
        </div>

        <div className="panel">
          {loading && <div className="modal-body">Memuat data tarif…</div>}

          {!loading && loadError && (
            <div className="modal-body">
              <div className="satusehat-empty">
                <span className="material-symbols-rounded">error</span>
                <div className="empty-title">Gagal memuat data</div>
                <div className="empty-sub">{loadError}</div>
              </div>
            </div>
          )}

          {!loading && !loadError && tarif && (
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-field full">
                    <label>Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Category</label>
                    <input
                      type="text"
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Harga Modal</label>
                    <input
                      type="text"
                      value={formatCurrencyInput(hargaPokok)}
                      onChange={(e) => setHargaPokok(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Harga Jual</label>
                    <input
                      type="text"
                      value={formatCurrencyInput(hargaJual)}
                      onChange={(e) => setHargaJual(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Margin</label>
                    <input type="text" value={`Rp ${margin.toLocaleString('id-ID')}`} readOnly disabled />
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <CustomSelect
                      value={isActive ? 'active' : 'inactive'}
                      onChange={(value) => setIsActive(value === 'active')}
                      options={[
                        { value: 'active', label: 'Aktif' },
                        { value: 'inactive', label: 'Nonaktif' },
                      ]}
                    />
                  </div>
                  <div className="form-field full">
                    <label>Deskripsi</label>
                    <textarea
                      placeholder="Deskripsi tarif (opsional)"
                      value={deskripsi}
                      onChange={(e) => setDeskripsi(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={handleCancel} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <span className="material-symbols-rounded">save</span>
                  {submitting ? 'Menyimpan…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
