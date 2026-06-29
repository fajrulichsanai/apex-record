'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { tarifApi } from '@/lib/tarif';
import { ApiError } from '@/lib/api-client';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import '../../styles/tarif.css';

interface TarifItem {
  id: string;
  kategori: string;
  hargaPokok: string;
  hargaJual: string;
  deskripsi: string;
}

export default function CreateTarifPage() {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [items, setItems] = useState<TarifItem[]>([
    { id: '1', kategori: '', hargaPokok: '', hargaJual: '', deskripsi: '' }
  ]);

  const handleCancel = () => router.push('/tarif');

  const updateItem = (id: string, field: keyof TarifItem, value: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    const newId = Date.now().toString();
    setItems([...items, {
      id: newId,
      kategori: '',
      hargaPokok: '',
      hargaJual: '',
      deskripsi: ''
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const getMargin = (pokok: string, jual: string) => {
    return (parseCurrency(jual) || 0) - (parseCurrency(pokok) || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      warning('Nama layanan harus diisi');
      return;
    }

    const validItems = items.filter(item => item.kategori.trim() && item.hargaJual.trim());
    if (validItems.length === 0) {
      warning('Tambahkan minimal 1 kategori dengan harga jual');
      return;
    }

    setSubmitting(true);
    try {
      for (const item of validItems) {
        await tarifApi.create({
          name: `${name} - ${item.kategori}`,
          kategori: item.kategori,
          deskripsi: item.deskripsi || undefined,
          hargaPokok: parseCurrency(item.hargaPokok),
          hargaJual: parseCurrency(item.hargaJual),
        });
      }
      success(`${validItems.length} tarif untuk "${name}" telah ditambahkan.`);
      router.push('/tarif');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan tarif';
      error(message);
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
          <span className="breadcrumb-current">Tambah Baru</span>
        </div>

        <div className="form-header">
          <h1>Tambah Tarif Baru</h1>
          <p className="page-subtitle">Buat tarif layanan dengan beberapa variasi kategori dan harga.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-panel">
          <div className="form-fields">
            <div className="form-field full">
              <label htmlFor="name">Nama Layanan <span className="required">*</span></label>
              <input
                id="name"
                type="text"
                placeholder="Contoh: Scaling, Filling, Cabut Gigi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="items-section">
            <div className="items-header">
              <h3>Kategori & Harga</h3>
              <p>Tambahkan satu atau lebih variasi kategori dengan harganya</p>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div key={item.id} className="item-card">
                  <div className="item-number">{index + 1}</div>

                  <div className="item-fields">
                    <div className="item-field">
                      <label>Kategori <span className="required">*</span></label>
                      <input
                        type="text"
                        placeholder="Contoh: Brows, Lips, Eyeliner"
                        value={item.kategori}
                        onChange={(e) => updateItem(item.id, 'kategori', e.target.value)}
                      />
                    </div>

                    <div className="item-prices">
                      <div className="item-field">
                        <label>Harga Modal</label>
                        <input
                          type="text"
                          placeholder="0"
                          value={formatCurrencyInput(item.hargaPokok)}
                          onChange={(e) =>
                            updateItem(item.id, 'hargaPokok', e.target.value.replace(/\D/g, ''))
                          }
                        />
                      </div>

                      <div className="item-field">
                        <label>Harga Jual <span className="required">*</span></label>
                        <input
                          type="text"
                          placeholder="0"
                          value={formatCurrencyInput(item.hargaJual)}
                          onChange={(e) =>
                            updateItem(item.id, 'hargaJual', e.target.value.replace(/\D/g, ''))
                          }
                        />
                      </div>

                      <div className="item-field margin-compact">
                        <label>Margin</label>
                        <div className="margin-badge">
                          Rp {getMargin(item.hargaPokok, item.hargaJual).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <div className="item-field full">
                      <label>Deskripsi</label>
                      <textarea
                        placeholder="Catatan atau detail tentang kategori ini (opsional)"
                        value={item.deskripsi}
                        onChange={(e) => updateItem(item.id, 'deskripsi', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeItem(item.id)}
                      title="Hapus kategori ini"
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-add-item"
              onClick={addItem}
            >
              <span className="material-symbols-rounded">add</span>
              Tambah Kategori
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={handleCancel} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <span className="material-symbols-rounded">save</span>
              {submitting ? 'Menyimpan…' : 'Simpan Semua Tarif'}
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}
