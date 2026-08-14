'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang, type StokTransaksiType } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';
import '../../styles/gudang.css';

const TYPE_TABS: { value: StokTransaksiType; label: string }[] = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'expired', label: 'Expired' },
];

export default function TransaksiForm() {
  const router = useRouter();
  const { success, error } = useToast();
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [loadingBarang, setLoadingBarang] = useState(true);

  const [type, setType] = useState<StokTransaksiType>('in');
  const [barangId, setBarangId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [noFaktur, setNoFaktur] = useState('');
  const [noBatch, setNoBatch] = useState('');
  const [tanggalExpiry, setTanggalExpiry] = useState('');
  const [alasan, setAlasan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        setLoadingBarang(true);
        const res = await gudangApi.listBarang({ limit: 500, isActive: true });
        setBarangList(res.data);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Gagal memuat daftar barang';
        error(message);
      } finally {
        setLoadingBarang(false);
      }
    })();
  }, [error]);

  const selectedBarang = barangList.find((b) => String(b.id) === barangId);
  const needsAlasan = type === 'out' || type === 'adjustment' || type === 'expired';
  const needsExpiry = selectedBarang?.trackExpiry;

  const handleCancel = () => router.push('/gudang/transaksi');

  const validate = () => {
    const next: Record<string, string> = {};
    if (!barangId) next.barangId = 'Barang wajib dipilih';
    if (!tanggal) next.tanggal = 'Tanggal wajib diisi';
    const qtyNum = Number(qty);
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) next.qty = 'Qty harus lebih dari 0';
    if (needsAlasan && !alasan.trim()) next.alasan = 'Alasan wajib diisi';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await gudangApi.createTransaksi({
        barangId: Number(barangId),
        type,
        qty: Number(qty),
        hargaBeli: hargaBeli ? Number(hargaBeli) : undefined,
        noFaktur: noFaktur.trim() || undefined,
        noBatch: noBatch.trim() || undefined,
        tanggalExpiry: tanggalExpiry || undefined,
        alasan: alasan.trim() || undefined,
        tanggal,
      });
      success('Transaksi stok telah disimpan');
      router.push('/gudang/transaksi');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi stok';
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
            <Link href="/gudang/transaksi">Transaksi Stok</Link>
            <span className="material-symbols-rounded">chevron_right</span>
            <span className="breadcrumb-current">Tambah Transaksi</span>
          </div>

          <div className="form-header">
            <h1>Tambah Transaksi Stok</h1>
            <p className="page-subtitle">Catat stock in, stock out, adjustment, atau expired untuk sebuah barang.</p>
          </div>

          <form onSubmit={handleSubmit} className="form-panel">
            <div className="gudang-type-tabs">
              {TYPE_TABS.map((t) => (
                <button key={t.value} type="button" className={`gudang-type-tab${type === t.value ? ' active' : ''}`} onClick={() => setType(t.value)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="form-fields">
              <div className="form-field">
                <label>Barang <span className="required">*</span></label>
                <CustomSelect
                  value={barangId}
                  onChange={setBarangId}
                  options={barangList.map((b) => ({ value: String(b.id), label: `${b.name} (stok: ${b.stokSaatIni} ${b.satuanPakai})` }))}
                  placeholder={loadingBarang ? 'Memuat barang...' : 'Pilih barang...'}
                  error={!!errors.barangId}
                  disabled={loadingBarang}
                />
                {errors.barangId && <span className="gudang-modal-error-text">{errors.barangId}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="tanggal">Tanggal <span className="required">*</span></label>
                <input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                {errors.tanggal && <span className="gudang-modal-error-text">{errors.tanggal}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="qty">Qty {selectedBarang ? `(${selectedBarang.satuanPakai})` : ''} <span className="required">*</span></label>
                <input id="qty" type="number" min={1} placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} />
                {errors.qty && <span className="gudang-modal-error-text">{errors.qty}</span>}
              </div>

              {type === 'in' && (
                <>
                  <div className="form-field">
                    <label htmlFor="hargaBeli">Harga Beli</label>
                    <input id="hargaBeli" type="number" min={0} placeholder="0" value={hargaBeli} onChange={(e) => setHargaBeli(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="noFaktur">No. Faktur</label>
                    <input id="noFaktur" type="text" placeholder="Opsional" value={noFaktur} onChange={(e) => setNoFaktur(e.target.value)} />
                  </div>
                </>
              )}

              {(type === 'in' || needsExpiry) && (
                <div className="form-field">
                  <label htmlFor="noBatch">No. Batch</label>
                  <input id="noBatch" type="text" placeholder="Opsional" value={noBatch} onChange={(e) => setNoBatch(e.target.value)} />
                </div>
              )}

              {needsExpiry && (
                <div className="form-field">
                  <label htmlFor="tanggalExpiry">Tanggal Expiry</label>
                  <input id="tanggalExpiry" type="date" value={tanggalExpiry} onChange={(e) => setTanggalExpiry(e.target.value)} />
                </div>
              )}

              {needsAlasan && (
                <div className="form-field">
                  <label htmlFor="alasan">Alasan <span className="required">*</span></label>
                  <input
                    id="alasan"
                    type="text"
                    placeholder={type === 'out' ? 'Contoh: rusak, hilang, sample' : 'Alasan penyesuaian/expired'}
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                  />
                  {errors.alasan && <span className="gudang-modal-error-text">{errors.alasan}</span>}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-outline" onClick={handleCancel} disabled={submitting}>Batal</button>
              <button type="submit" className="btn-primary" disabled={submitting || loadingBarang}>
                {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </form>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
