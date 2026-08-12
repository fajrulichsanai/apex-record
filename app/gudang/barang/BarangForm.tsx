'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { gudangApi, type Barang, type CreateBarangPayload } from '@/lib/gudang';
import { ApiError } from '@/lib/api-client';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import '../../styles/gudang.css';

interface BarangFormProps {
  mode: 'create' | 'edit';
  initial?: Barang;
}

export default function BarangForm({ mode, initial }: BarangFormProps) {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(initial?.name || '');
  const [sku, setSku] = useState(initial?.sku || '');
  const [kategori, setKategori] = useState(initial?.kategori || '');
  const [satuanBeli, setSatuanBeli] = useState(initial?.satuanBeli || '');
  const [satuanPakai, setSatuanPakai] = useState(initial?.satuanPakai || '');
  const [konversiQty, setKonversiQty] = useState(String(initial?.konversiQty ?? 1));
  const [supplierName, setSupplierName] = useState(initial?.supplierName || '');
  const [hargaBeli, setHargaBeli] = useState(String(initial?.hargaBeli ?? ''));
  const [stokMinimum, setStokMinimum] = useState(String(initial?.stokMinimum ?? ''));
  const [trackExpiry, setTrackExpiry] = useState(initial?.trackExpiry ?? false);
  const [lokasiSimpan, setLokasiSimpan] = useState(initial?.lokasiSimpan || '');

  const handleCancel = () => router.push('/gudang/barang');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sku.trim() || !satuanBeli.trim() || !satuanPakai.trim()) {
      warning('Nama, SKU, satuan beli, dan satuan pakai wajib diisi');
      return;
    }

    const payload: CreateBarangPayload = {
      name: name.trim(),
      sku: sku.trim(),
      kategori: kategori.trim() || undefined,
      satuanBeli: satuanBeli.trim(),
      satuanPakai: satuanPakai.trim(),
      konversiQty: parseInt(konversiQty, 10) || 1,
      supplierName: supplierName.trim() || undefined,
      hargaBeli: parseCurrency(hargaBeli),
      stokMinimum: parseInt(stokMinimum, 10) || 0,
      trackExpiry,
      lokasiSimpan: lokasiSimpan.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await gudangApi.createBarang(payload);
        success(`Barang "${name}" telah ditambahkan.`);
      } else if (initial) {
        await gudangApi.updateBarang(initial.id, payload);
        success(`Barang "${name}" telah diperbarui.`);
      }
      router.push('/gudang/barang');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan barang';
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="gudang" requireWrite>
      <main className="content gudang-page">
        <div className="breadcrumb">
          <Link href="/gudang">Gudang & Stok</Link>
          <span className="material-symbols-rounded">chevron_right</span>
          <Link href="/gudang/barang">Master Barang</Link>
          <span className="material-symbols-rounded">chevron_right</span>
          <span className="breadcrumb-current">{mode === 'create' ? 'Tambah Baru' : 'Edit'}</span>
        </div>

        <div className="form-header">
          <h1>{mode === 'create' ? 'Tambah Barang Baru' : `Edit ${initial?.name}`}</h1>
          <p className="page-subtitle">Kelola master barang gudang, satuan, harga beli, dan stok minimum.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-panel">
          <div className="form-fields">
            <div className="form-field">
              <label htmlFor="name">Nama Barang <span className="required">*</span></label>
              <input id="name" type="text" placeholder="Contoh: Komposit Resin" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="sku">SKU <span className="required">*</span></label>
              <input id="sku" type="text" placeholder="Contoh: BHN-001" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="kategori">Kategori</label>
              <input id="kategori" type="text" placeholder="Contoh: Bahan Habis Pakai" value={kategori} onChange={(e) => setKategori(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="lokasi">Lokasi Simpan</label>
              <input id="lokasi" type="text" placeholder="Contoh: Rak A1" value={lokasiSimpan} onChange={(e) => setLokasiSimpan(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="satuanBeli">Satuan Beli <span className="required">*</span></label>
              <input id="satuanBeli" type="text" placeholder="Contoh: Box" value={satuanBeli} onChange={(e) => setSatuanBeli(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="satuanPakai">Satuan Pakai <span className="required">*</span></label>
              <input id="satuanPakai" type="text" placeholder="Contoh: Pcs" value={satuanPakai} onChange={(e) => setSatuanPakai(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="konversi">Konversi (1 satuan beli = ? satuan pakai)</label>
              <input id="konversi" type="number" min={1} placeholder="1" value={konversiQty} onChange={(e) => setKonversiQty(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="supplier">Supplier</label>
              <input id="supplier" type="text" placeholder="Nama supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="hargaBeli">Harga Beli (per satuan pakai)</label>
              <input id="hargaBeli" type="text" placeholder="0" value={formatCurrencyInput(hargaBeli)} onChange={(e) => setHargaBeli(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="form-field">
              <label htmlFor="stokMinimum">Stok Minimum</label>
              <input id="stokMinimum" type="number" min={0} placeholder="0" value={stokMinimum} onChange={(e) => setStokMinimum(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="trackExpiry">Lacak Expiry</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <input id="trackExpiry" type="checkbox" checked={trackExpiry} onChange={(e) => setTrackExpiry(e.target.checked)} />
                Aktifkan pelacakan tanggal kedaluwarsa & no. batch
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={handleCancel} disabled={submitting}>Batal</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : mode === 'create' ? 'Simpan Barang' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
