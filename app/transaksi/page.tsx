'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import InputModal from '@/components/feedback/InputModal';
import CustomSelect from '@/components/form/CustomSelect';
import '../styles/transaksi.css';
import { ApiError } from '@/lib/api-client';
import {
  billingApi,
  BillingListItem,
  BillingStatus,
  CreateBillingItemPayload,
  DiscountType,
} from '@/lib/billing';
import { encounterApi, EncounterListItem } from '@/lib/encounter';
import { tarifApi, Tarif } from '@/lib/tarif';
import { useToast } from '@/lib/toast-context';

type FilterValue = 'semua' | BillingStatus;

interface ItemRow {
  key: number;
  tarifId: number | '';
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
}

function statusTag(status: BillingStatus): { tag: string; label: string } {
  switch (status) {
    case 'paid':
      return { tag: 'lunas', label: 'Lunas' };
    case 'partial':
      return { tag: 'pending', label: 'Sebagian' };
    case 'cancelled':
      return { tag: 'belum', label: 'Dibatalkan' };
    case 'refunded':
      return { tag: 'belum', label: 'Refund' };
    default:
      return { tag: 'belum', label: 'Belum Bayar' };
  }
}

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

let rowKeySeq = 0;
function emptyRow(): ItemRow {
  return { key: ++rowKeySeq, tarifId: '', name: '', unitPrice: 0, quantity: 1, discount: 0, discountType: 'nominal' };
}

export default function TransaksiPage() {
  return (
    <Suspense fallback={null}>
      <TransaksiPageInner />
    </Suspense>
  );
}

function TransaksiPageInner() {
  const searchParams = useSearchParams();
  const [billings, setBillings] = useState<BillingListItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [encounters, setEncounters] = useState<EncounterListItem[]>([]);
  const [tarifs, setTarifs] = useState<Tarif[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | ''>('');
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentBilling, setPendingPaymentBilling] = useState<BillingListItem | null>(null);

  const { success, error: showError } = useToast();

  const loadBillings = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await billingApi.list({
        status: currentFilter === 'semua' ? undefined : currentFilter,
        page: 1,
        limit: 50,
      });
      setBillings(res.data);
      setMeta(res.meta);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Gagal memuat riwayat transaksi');
    } finally {
      setLoadingList(false);
    }
  }, [currentFilter]);

  useEffect(() => {
    loadBillings();
  }, [loadBillings]);

  useEffect(() => {
    encounterApi
      .list({ status: 'finished', limit: 100 })
      .then((res) => {
        setEncounters(res.data);
        const fromQuery = searchParams.get('encounterId');
        if (fromQuery && res.data.some((e) => e.encounterId === Number(fromQuery))) {
          setSelectedEncounterId(Number(fromQuery));
        }
      })
      .catch(() => setEncounters([]));
    tarifApi
      .list({ limit: 200 })
      .then((res) => setTarifs(res.data.filter((t) => t.isActive)))
      .catch(() => setTarifs([]));
  }, [searchParams]);

  const filteredBillings = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return billings;
    return billings.filter(
      (b) =>
        (b.patientName || '').toLowerCase().includes(q) ||
        b.invoiceNumber.toLowerCase().includes(q),
    );
  }, [billings, searchQuery]);

  const totalCount = meta.total;
  const totalIncome = useMemo(
    () => billings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0),
    [billings],
  );
  const pendingCount = billings.filter((b) => b.status === 'partial' || b.status === 'unpaid').length;
  const lunasCount = billings.filter((b) => b.status === 'paid').length;

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const updated = { ...r, ...patch };

        // Ensure quantity is at least 1
        if ('quantity' in patch && updated.quantity < 1) {
          updated.quantity = 1;
        }

        // Ensure unitPrice is non-negative
        if ('unitPrice' in patch && updated.unitPrice < 0) {
          updated.unitPrice = 0;
        }

        // Ensure discount doesn't exceed unitPrice for nominal discount
        if ('discount' in patch || 'discountType' in patch) {
          if (updated.discountType === 'nominal' && updated.discount > updated.unitPrice) {
            updated.discount = updated.unitPrice;
          } else if (updated.discountType === 'percent' && updated.discount > 100) {
            updated.discount = 100;
          } else if (updated.discount < 0) {
            updated.discount = 0;
          }
        }

        return updated;
      }),
    );
  }

  function handleTarifSelect(key: number, tarifId: string) {
    const tarif = tarifs.find((t) => t.id === Number(tarifId));
    updateRow(key, {
      tarifId: tarif ? tarif.id : '',
      name: tarif ? tarif.name : '',
      unitPrice: tarif ? Math.max(0, tarif.hargaJual) : 0,
    });
  }

  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, r) => {
      const discNominal = r.discountType === 'percent' ? (r.unitPrice * r.discount) / 100 : r.discount;
      return sum + (r.unitPrice - discNominal) * r.quantity;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, itemsSubtotal - totalDiscount + additionalFee);
  }, [itemsSubtotal, totalDiscount, additionalFee]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedEncounterId) {
      setSubmitError('Pilih kunjungan terlebih dahulu');
      return;
    }

    // Validate items: must have name and unitPrice must be > 0
    const validItems = items.filter((r) => r.name && r.unitPrice > 0);
    if (validItems.length === 0) {
      setSubmitError('Tambahkan minimal satu tindakan dengan harga');
      return;
    }

    // Ensure all prices are non-negative (defensive check)
    const invalidPriceItems = validItems.filter((r) => r.unitPrice < 0 || r.discount < 0);
    if (invalidPriceItems.length > 0) {
      setSubmitError('Harga dan diskon tidak boleh negatif');
      return;
    }

    const payloadItems: CreateBillingItemPayload[] = validItems.map((r) => ({
      tarifId: r.tarifId || undefined,
      name: r.name,
      quantity: Math.max(1, r.quantity),
      unitPrice: Math.max(0, r.unitPrice),
      discount: Math.max(0, r.discount),
      discountType: r.discountType,
    }));

    setSubmitting(true);
    try {
      await billingApi.create({
        encounterId: Number(selectedEncounterId),
        items: payloadItems,
        totalDiscount: totalDiscount > 0 ? totalDiscount : undefined,
        totalDiscountType: totalDiscount > 0 ? 'nominal' : undefined,
        additionalFee: additionalFee > 0 ? additionalFee : undefined,
        notes: notes || undefined,
      });
      setSelectedEncounterId('');
      setItems([emptyRow()]);
      setTotalDiscount(0);
      setAdditionalFee(0);
      setNotes('');
      await loadBillings();
      success('Transaksi berhasil disimpan');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Gagal membuat transaksi');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRecordPayment(billing: BillingListItem) {
    setPendingPaymentBilling(billing);
    setShowPaymentModal(true);
  }

  async function performRecordPayment(amountStr: string) {
    if (!pendingPaymentBilling) return;

    const amount = Number(amountStr);
    if (!amount || amount <= 0) {
      showError('Jumlah pembayaran harus lebih dari 0');
      return;
    }

    setPayingId(pendingPaymentBilling.billingId);
    try {
      await billingApi.createPayment(pendingPaymentBilling.billingId, { method: 'cash', amount });
      await loadBillings();
      success('Pembayaran berhasil dicatat');
      setShowPaymentModal(false);
      setPendingPaymentBilling(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal mencatat pembayaran');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <DashboardLayout>
      <main className="content transaksi-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Transaksi</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Input pembayaran baru dan pantau riwayat transaksi klinik</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                receipt_long
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Transaksi</div>
            </div>
          </div>
          <div className="stat-card income">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{formatRupiah(totalIncome)}</div>
              <div className="stat-label">Total Pendapatan</div>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                hourglass_empty
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{pendingCount}</div>
              <div className="stat-label">Menunggu Pembayaran</div>
            </div>
          </div>
          <div className="stat-card lunas">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{lunasCount}</div>
              <div className="stat-label">Lunas</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content-area">
          {/* Input Transaksi Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className="material-symbols-rounded">add_card</span>
              <h2>Input Transaksi Baru</h2>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div className="form-body">
                <div className="form-field">
                  <label>Kunjungan</label>
                  <CustomSelect
                    value={String(selectedEncounterId)}
                    onChange={(value) => setSelectedEncounterId(value ? Number(value) : '')}
                    options={encounters.map((enc) => ({
                      value: String(enc.encounterId),
                      label: `${enc.patientName || `Pasien #${enc.patientId}`} · ${enc.noRM || '-'}`,
                    }))}
                    placeholder="Pilih kunjungan selesai…"
                  />
                  {encounters.length === 0 && (
                    <span className="form-hint">Tidak ada kunjungan selesai hari ini</span>
                  )}
                </div>

                <div className="form-field">
                  <label>Tindakan</label>
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
                    onClick={() => setItems((prev) => [...prev, emptyRow()])}
                  >
                    <span className="material-symbols-rounded">add</span>
                    Tambah Tindakan
                  </button>
                </div>

                <div className="form-field">
                  <label>Diskon (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={totalDiscount}
                    onChange={(e) => setTotalDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Biaya Tambahan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={additionalFee}
                    onChange={(e) => setAdditionalFee(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                  />
                </div>

                <div className="form-field">
                  <label>Catatan (opsional)</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                <div className="summary-box">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{formatRupiah(itemsSubtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="summary-row">
                      <span>Diskon</span>
                      <span>-{formatRupiah(totalDiscount)}</span>
                    </div>
                  )}
                  {additionalFee > 0 && (
                    <div className="summary-row">
                      <span>Biaya Tambahan</span>
                      <span>+{formatRupiah(additionalFee)}</span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total Bayar</span>
                    <span>{formatRupiah(grandTotal)}</span>
                  </div>
                </div>

                {submitError && <div className="form-error">{submitError}</div>}
              </div>

              <div className="form-footer">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    add
                  </span>
                  {submitting ? 'Menyimpan…' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>

          {/* Riwayat Transaksi Panel */}
          <div className="riwayat-panel">
            <div className="panel-toolbar">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari pasien atau No. invoice…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${currentFilter === 'semua' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('semua')}
                  type="button"
                >
                  Semua
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'paid' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('paid')}
                  type="button"
                >
                  Lunas
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'partial' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('partial')}
                  type="button"
                >
                  Sebagian
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'unpaid' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('unpaid')}
                  type="button"
                >
                  Belum Bayar
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">
                {loadingList ? 'Memuat…' : `${filteredBillings.length} transaksi ditemukan`}
              </span>
              <button type="button" className="btn-outline" onClick={loadBillings}>
                <span className="material-symbols-rounded">refresh</span>
                Muat Ulang
              </button>
            </div>

            {listError ? (
              <div className="riwayat-empty">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">error</span>
                </div>
                <div className="empty-title">Gagal memuat riwayat</div>
                <div className="empty-sub">{listError}</div>
              </div>
            ) : !loadingList && filteredBillings.length === 0 ? (
              <div className="riwayat-empty">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">receipt_long</span>
                </div>
                <div className="empty-title">Belum ada transaksi</div>
                <div className="empty-sub">Transaksi yang tercatat akan muncul di sini</div>
              </div>
            ) : (
              <div className="transaksi-list">
                {filteredBillings.map((b) => {
                  const { tag, label } = statusTag(b.status);
                  return (
                    <div key={b.billingId} className="transaksi-item">
                      <div className="transaksi-icon">
                        <span className="material-symbols-rounded">receipt</span>
                      </div>
                      <div className="transaksi-info">
                        <div className="transaksi-name">{b.patientName || `Pasien #${b.encounterId}`}</div>
                        <div className="transaksi-meta">
                          {b.invoiceNumber} · {formatDate(b.createdAt)}
                        </div>
                      </div>
                      <div className="transaksi-right">
                        <div className="transaksi-amount">{formatRupiah(b.grandTotal)}</div>
                        <span className={`tag ${tag}`}>{label}</span>
                      </div>
                      {(b.status === 'unpaid' || b.status === 'partial') && (
                        <button
                          type="button"
                          className="btn-outline"
                          disabled={payingId === b.billingId}
                          onClick={() => handleRecordPayment(b)}
                        >
                          {payingId === b.billingId ? '…' : 'Bayar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {pendingPaymentBilling && (
        <InputModal
          isOpen={showPaymentModal}
          title="Catat Pembayaran"
          message={`Jumlah pembayaran untuk ${pendingPaymentBilling.invoiceNumber} (sisa ${formatRupiah(pendingPaymentBilling.outstandingAmount)})`}
          placeholder="Jumlah pembayaran..."
          defaultValue={String(pendingPaymentBilling.outstandingAmount)}
          confirmLabel="Catat Pembayaran"
          onConfirm={performRecordPayment}
          onCancel={() => {
            setShowPaymentModal(false);
            setPendingPaymentBilling(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
