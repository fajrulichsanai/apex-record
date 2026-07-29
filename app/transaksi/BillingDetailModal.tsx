'use client';

import { useEffect, useRef, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { ApiError } from '@/lib/api-client';
import { billingApi, BillingDetail, DiscountType } from '@/lib/billing';
import { Tarif } from '@/lib/tarif';
import { useToast } from '@/lib/toast-context';
import './BillingDetailModal.css';

interface BillingDetailModalProps {
  billingId: number;
  tarifs: Tarif[];
  onClose: () => void;
  onUpdated: () => void;
}

interface EditItemRow {
  key: number;
  tarifId: number | '';
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
}

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: BillingDetail['status']) {
  switch (status) {
    case 'paid':
      return 'Lunas';
    case 'partial':
      return 'Sebagian';
    case 'cancelled':
      return 'Dibatalkan';
    case 'refunded':
      return 'Refund';
    default:
      return 'Belum Bayar';
  }
}

let rowKeySeq = 0;

export default function BillingDetailModal({ billingId, tarifs, onClose, onUpdated }: BillingDetailModalProps) {
  const { success, error: showError } = useToast();
  const isMounted = useRef(true);
  const [detail, setDetail] = useState<BillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<EditItemRow[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadDetail = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await billingApi.getOne(billingId);
      if (!isMounted.current) return;
      setDetail(data);
    } catch (err) {
      if (!isMounted.current) return;
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat detail transaksi');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  function startEdit() {
    if (!detail) return;
    setItems(
      detail.items.map((i) => ({
        key: ++rowKeySeq,
        tarifId: i.tarifId ?? '',
        name: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        discount: i.discount,
        discountType: i.discountType,
      })),
    );
    setTotalDiscount(Number(detail.totalDiscount || 0));
    setAdditionalFee(Number(detail.additionalFee || 0));
    setNotes(detail.notes || '');
    setEditing(true);
  }

  function updateRow(key: number, patch: Partial<EditItemRow>) {
    setItems((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function handleTarifSelect(key: number, tarifId: string) {
    const tarif = tarifs.find((t) => t.id === Number(tarifId));
    updateRow(key, {
      tarifId: tarif ? tarif.id : '',
      name: tarif ? tarif.name : '',
      unitPrice: tarif ? Math.max(0, tarif.hargaJual) : 0,
    });
  }

  const editSubtotal = items.reduce((sum, r) => {
    const discNominal = r.discountType === 'percent' ? (r.unitPrice * r.discount) / 100 : r.discount;
    return sum + (r.unitPrice - discNominal) * r.quantity;
  }, 0);
  const editGrandTotal = Math.max(0, editSubtotal - totalDiscount + additionalFee);

  async function handleSave() {
    const validItems = items.filter((r) => r.name);
    if (validItems.length === 0) {
      showError('Tambahkan minimal satu tindakan');
      return;
    }

    setSaving(true);
    try {
      const updated = await billingApi.update(billingId, {
        items: validItems.map((r) => ({
          tarifId: r.tarifId || undefined,
          name: r.name,
          quantity: Math.max(1, r.quantity),
          unitPrice: Math.max(0, r.unitPrice),
          discount: Math.max(0, r.discount),
          discountType: r.discountType,
        })),
        totalDiscount: totalDiscount > 0 ? totalDiscount : undefined,
        totalDiscountType: totalDiscount > 0 ? 'nominal' : undefined,
        additionalFee: additionalFee > 0 ? additionalFee : undefined,
        notes: notes || undefined,
      });
      if (!isMounted.current) return;
      setDetail(updated);
      setEditing(false);
      success('Invoice berhasil diperbarui');
      onUpdated();
    } catch (err) {
      if (!isMounted.current) return;
      showError(err instanceof ApiError ? err.message : 'Gagal memperbarui invoice');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  const canEdit = detail && detail.status !== 'cancelled' && detail.status !== 'refunded';

  return (
    <div className="billing-modal-overlay" onClick={handleOverlayClick}>
      <div className="billing-modal-box">
        <div className="billing-modal-header">
          <div>
            <h2>{editing ? 'Edit Transaksi' : 'Detail Transaksi'}</h2>
            {detail && <div className="billing-modal-subtitle">{detail.invoiceNumber}</div>}
          </div>
          <button type="button" className="billing-modal-close" onClick={onClose} disabled={saving} aria-label="Tutup">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {loading ? (
          <div className="billing-modal-loading">Memuat detail...</div>
        ) : loadError ? (
          <div className="billing-modal-loading" style={{ color: '#FF4D4F' }}>
            {loadError}
          </div>
        ) : detail ? (
          <>
            <div className="billing-modal-body">
              <div className="billing-modal-summary-row">
                <div>
                  <div className="billing-modal-label">Pasien</div>
                  <div className="billing-modal-value">{detail.patient?.name || '-'}</div>
                </div>
                <div>
                  <div className="billing-modal-label">No. RM</div>
                  <div className="billing-modal-value">{detail.patient?.noRm || '-'}</div>
                </div>
                <div>
                  <div className="billing-modal-label">Status</div>
                  <div className="billing-modal-value">{statusLabel(detail.status)}</div>
                </div>
              </div>

              <div className="billing-modal-section-title">Tindakan</div>
              {editing ? (
                <>
                  <div className="item-rows">
                    {items.map((row) => (
                      <div key={row.key} className="item-row">
                        <CustomSelect
                          value={String(row.tarifId)}
                          onChange={(value) => handleTarifSelect(row.key, value)}
                          options={tarifs.map((t) => ({
                            value: String(t.id),
                            label: `${t.name} — ${formatRupiah(t.hargaJual)}`,
                          }))}
                          placeholder="Pilih tindakan…"
                        />
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          title="Jumlah"
                        />
                        <button
                          type="button"
                          className="btn-icon-sm"
                          onClick={() => setItems((prev) => prev.filter((r) => r.key !== row.key))}
                          disabled={items.length === 1}
                          title="Hapus tindakan"
                        >
                          <span className="material-symbols-rounded">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                    onClick={() => setItems((prev) => [...prev, { key: ++rowKeySeq, tarifId: '', name: '', unitPrice: 0, quantity: 1, discount: 0, discountType: 'nominal' }])}
                  >
                    <span className="material-symbols-rounded">add</span>
                    Tambah Tindakan
                  </button>

                  <div className="billing-modal-field-row">
                    <div className="form-field">
                      <label>Diskon (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        value={totalDiscount}
                        onChange={(e) => setTotalDiscount(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                    <div className="form-field">
                      <label>Biaya Tambahan (Rp)</label>
                      <input
                        type="number"
                        min={0}
                        value={additionalFee}
                        onChange={(e) => setAdditionalFee(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Catatan</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <div className="summary-box">
                    <div className="summary-row total">
                      <span>Total Bayar</span>
                      <span>{formatRupiah(editGrandTotal)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <table className="billing-modal-table">
                    <thead>
                      <tr>
                        <th>Tindakan</th>
                        <th>Qty</th>
                        <th>Harga</th>
                        <th>Diskon</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((i) => (
                        <tr key={i.id}>
                          <td>{i.name}</td>
                          <td>{i.quantity}</td>
                          <td>{formatRupiah(i.unitPrice)}</td>
                          <td>
                            {i.discount > 0
                              ? i.discountType === 'percent'
                                ? `${i.discount}%`
                                : formatRupiah(i.discount)
                              : '-'}
                          </td>
                          <td>{formatRupiah(i.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="summary-box">
                    <div className="summary-row">
                      <span>Subtotal</span>
                      <span>{formatRupiah(detail.subtotal)}</span>
                    </div>
                    {detail.totalDiscount > 0 && (
                      <div className="summary-row">
                        <span>Diskon</span>
                        <span>-{formatRupiah(detail.totalDiscount)}</span>
                      </div>
                    )}
                    {detail.additionalFee > 0 && (
                      <div className="summary-row">
                        <span>Biaya Tambahan</span>
                        <span>+{formatRupiah(detail.additionalFee)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total Bayar</span>
                      <span>{formatRupiah(detail.grandTotal)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Sudah Dibayar</span>
                      <span>{formatRupiah(detail.paidAmount)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Sisa Tagihan</span>
                      <span>{formatRupiah(detail.outstandingAmount)}</span>
                    </div>
                  </div>

                  {detail.notes && (
                    <div className="billing-modal-notes">
                      <div className="billing-modal-label">Catatan</div>
                      <div className="billing-modal-value">{detail.notes}</div>
                    </div>
                  )}

                  {detail.payments.length > 0 && (
                    <>
                      <div className="billing-modal-section-title">Pembayaran</div>
                      <table className="billing-modal-table">
                        <thead>
                          <tr>
                            <th>No. Kwitansi</th>
                            <th>Metode</th>
                            <th>Jumlah</th>
                            <th>Tanggal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payments.map((p) => (
                            <tr key={p.id}>
                              <td>{p.receiptNumber}</td>
                              <td>{p.method}</td>
                              <td>{formatRupiah(p.amount)}</td>
                              <td>{formatDateTime(p.paidAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="billing-modal-footer">
              {editing ? (
                <>
                  <button type="button" className="btn-outline" onClick={() => setEditing(false)} disabled={saving}>
                    Batal
                  </button>
                  <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-outline" onClick={onClose}>
                    Tutup
                  </button>
                  {canEdit && (
                    <button type="button" className="btn-primary" onClick={startEdit}>
                      Edit Invoice
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
