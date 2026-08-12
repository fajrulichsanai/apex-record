'use client';

import { useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang, type StokTransaksiType } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';

interface TransaksiFormModalProps {
  barangList: Barang[];
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_TABS: { value: StokTransaksiType; label: string }[] = [
  { value: 'in', label: 'Stock In' },
  { value: 'out', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'expired', label: 'Expired' },
];

export default function TransaksiFormModal({ barangList, onClose, onSaved }: TransaksiFormModalProps) {
  const { success, error } = useToast();
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

  const selectedBarang = barangList.find((b) => String(b.id) === barangId);
  const needsAlasan = type === 'out' || type === 'adjustment' || type === 'expired';
  const needsExpiry = selectedBarang?.trackExpiry;

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

  const handleSubmit = async () => {
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
      onSaved();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi stok';
      error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="gudang-modal-overlay" onClick={onClose} />
      <div className="gudang-modal-box">
        <div className="gudang-modal-header">
          <h2>Transaksi Stok</h2>
          <button type="button" className="gudang-modal-close" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="gudang-modal-body">
          <div className="gudang-type-tabs">
            {TYPE_TABS.map((t) => (
              <button key={t.value} type="button" className={`gudang-type-tab${type === t.value ? ' active' : ''}`} onClick={() => setType(t.value)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className={`gudang-modal-field ${errors.barangId ? 'error' : ''}`}>
            <label>Barang <span className="required">*</span></label>
            <CustomSelect
              value={barangId}
              onChange={setBarangId}
              options={barangList.map((b) => ({ value: String(b.id), label: `${b.name} (stok: ${b.stokSaatIni} ${b.satuanPakai})` }))}
              placeholder="Pilih barang..."
              error={!!errors.barangId}
            />
            {errors.barangId && <span className="gudang-modal-error-text">{errors.barangId}</span>}
          </div>

          <div className={`gudang-modal-field ${errors.tanggal ? 'error' : ''}`}>
            <label>Tanggal <span className="required">*</span></label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            {errors.tanggal && <span className="gudang-modal-error-text">{errors.tanggal}</span>}
          </div>

          <div className={`gudang-modal-field ${errors.qty ? 'error' : ''}`}>
            <label>Qty {selectedBarang ? `(${selectedBarang.satuanPakai})` : ''} <span className="required">*</span></label>
            <input type="number" min={1} placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} />
            {errors.qty && <span className="gudang-modal-error-text">{errors.qty}</span>}
          </div>

          {type === 'in' && (
            <>
              <div className="gudang-modal-field">
                <label>Harga Beli</label>
                <input type="number" min={0} placeholder="0" value={hargaBeli} onChange={(e) => setHargaBeli(e.target.value)} />
              </div>
              <div className="gudang-modal-field">
                <label>No. Faktur</label>
                <input type="text" placeholder="Opsional" value={noFaktur} onChange={(e) => setNoFaktur(e.target.value)} />
              </div>
            </>
          )}

          {(type === 'in' || needsExpiry) && (
            <div className="gudang-modal-field">
              <label>No. Batch</label>
              <input type="text" placeholder="Opsional" value={noBatch} onChange={(e) => setNoBatch(e.target.value)} />
            </div>
          )}

          {needsExpiry && (
            <div className="gudang-modal-field">
              <label>Tanggal Expiry</label>
              <input type="date" value={tanggalExpiry} onChange={(e) => setTanggalExpiry(e.target.value)} />
            </div>
          )}

          {needsAlasan && (
            <div className={`gudang-modal-field ${errors.alasan ? 'error' : ''}`}>
              <label>Alasan <span className="required">*</span></label>
              <input
                type="text"
                placeholder={type === 'out' ? 'Contoh: rusak, hilang, sample' : 'Alasan penyesuaian/expired'}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              />
              {errors.alasan && <span className="gudang-modal-error-text">{errors.alasan}</span>}
            </div>
          )}
        </div>

        <div className="gudang-modal-footer">
          <button className="btn-outline" type="button" onClick={onClose} disabled={submitting}>Batal</button>
          <button className="btn-primary" type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </>
  );
}
