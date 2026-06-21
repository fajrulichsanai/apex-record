'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '../styles/transaksi.css';

type Status = 'lunas' | 'pending' | 'belum';
type FilterValue = 'semua' | Status;

interface Transaksi {
  id: number;
  invoiceNo: string;
  patientName: string;
  tindakan: string;
  metode: string;
  amount: number;
  status: Status;
  date: string;
}

const PASIEN_OPTIONS = [
  'Mu** Da** Sa**',
  'Ahmad Ri**',
  'By. Ny. Sa**',
  'Budi Su**',
  'Siti Ra**',
];

const TINDAKAN_OPTIONS: { name: string; price: number }[] = [
  { name: 'Konsultasi Awal', price: 75000 },
  { name: 'Pembersihan Karang Gigi', price: 150000 },
  { name: 'Cabut Gigi', price: 250000 },
  { name: 'Tambal GIC', price: 160000 },
  { name: 'PSA - Obturasi', price: 300000 },
];

const METODE_OPTIONS = ['Tunai', 'Transfer Bank', 'Kartu Debit/Kredit', 'QRIS'];

const INITIAL_TRANSAKSI: Transaksi[] = [
  {
    id: 1,
    invoiceNo: 'INV-000005',
    patientName: 'Siti Ra**',
    tindakan: 'PSA - Obturasi',
    metode: 'QRIS',
    amount: 300000,
    status: 'lunas',
    date: '20 Jun 2026',
  },
  {
    id: 2,
    invoiceNo: 'INV-000004',
    patientName: 'Budi Su**',
    tindakan: 'Cabut Gigi',
    metode: 'Tunai',
    amount: 250000,
    status: 'lunas',
    date: '19 Jun 2026',
  },
  {
    id: 3,
    invoiceNo: 'INV-000003',
    patientName: 'Ahmad Ri**',
    tindakan: 'Tambal GIC',
    metode: 'Transfer Bank',
    amount: 160000,
    status: 'pending',
    date: '18 Jun 2026',
  },
  {
    id: 4,
    invoiceNo: 'INV-000002',
    patientName: 'Mu** Da** Sa**',
    tindakan: 'Pembersihan Karang Gigi',
    metode: 'Kartu Debit/Kredit',
    amount: 150000,
    status: 'belum',
    date: '16 Jun 2026',
  },
  {
    id: 5,
    invoiceNo: 'INV-000001',
    patientName: 'By. Ny. Sa**',
    tindakan: 'Konsultasi Awal',
    metode: 'Tunai',
    amount: 75000,
    status: 'lunas',
    date: '14 Jun 2026',
  },
];

function statusLabel(status: Status) {
  if (status === 'lunas') return 'Lunas';
  if (status === 'pending') return 'Menunggu';
  return 'Belum Bayar';
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export default function TransaksiPage() {
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(INITIAL_TRANSAKSI);
  const [currentFilter, setCurrentFilter] = useState<FilterValue>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPasien, setSelectedPasien] = useState(PASIEN_OPTIONS[0]);
  const [selectedTindakan, setSelectedTindakan] = useState(TINDAKAN_OPTIONS[0].name);
  const [diskon, setDiskon] = useState('0');
  const [metode, setMetode] = useState(METODE_OPTIONS[0]);
  const [status, setStatus] = useState<Status>('lunas');

  const tindakanPrice = TINDAKAN_OPTIONS.find((t) => t.name === selectedTindakan)?.price ?? 0;
  const diskonValue = Math.min(Math.max(parseInt(diskon, 10) || 0, 0), 100);
  const totalAfterDiskon = Math.round(tindakanPrice * (1 - diskonValue / 100));

  const filteredTransaksi = transaksiList.filter((t) => {
    const matchStatus = currentFilter === 'semua' || t.status === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.patientName.toLowerCase().includes(q) ||
      t.invoiceNo.toLowerCase().includes(q) ||
      t.tindakan.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalCount = transaksiList.length;
  const totalIncome = useMemo(
    () => transaksiList.filter((t) => t.status === 'lunas').reduce((sum, t) => sum + t.amount, 0),
    [transaksiList]
  );
  const pendingCount = transaksiList.filter((t) => t.status === 'pending').length;
  const lunasCount = transaksiList.filter((t) => t.status === 'lunas').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextInvoice = `INV-${String(transaksiList.length + 1).padStart(6, '0')}`;
    const newTransaksi: Transaksi = {
      id: Math.max(0, ...transaksiList.map((t) => t.id)) + 1,
      invoiceNo: nextInvoice,
      patientName: selectedPasien,
      tindakan: selectedTindakan,
      metode,
      amount: totalAfterDiskon,
      status,
      date: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };
    setTransaksiList((prev) => [newTransaksi, ...prev]);
    setDiskon('0');
  };

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
                  <label>Pasien</label>
                  <select value={selectedPasien} onChange={(e) => setSelectedPasien(e.target.value)}>
                    {PASIEN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Tindakan</label>
                  <select value={selectedTindakan} onChange={(e) => setSelectedTindakan(e.target.value)}>
                    {TINDAKAN_OPTIONS.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} — {formatRupiah(t.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label>Diskon (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={diskon}
                      onChange={(e) => setDiskon(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                      <option value="lunas">Lunas</option>
                      <option value="pending">Menunggu</option>
                      <option value="belum">Belum Bayar</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Metode Pembayaran</label>
                  <select value={metode} onChange={(e) => setMetode(e.target.value)}>
                    {METODE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="summary-box">
                  <div className="summary-row">
                    <span>Harga Tindakan</span>
                    <span>{formatRupiah(tindakanPrice)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Diskon</span>
                    <span>-{diskonValue}%</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Bayar</span>
                    <span>{formatRupiah(totalAfterDiskon)}</span>
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <button type="submit" className="btn-primary">
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    add
                  </span>
                  Simpan Transaksi
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
                  placeholder="Cari pasien, No. invoice, tindakan…"
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
                  className={`filter-tab ${currentFilter === 'lunas' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('lunas')}
                  type="button"
                >
                  Lunas
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('pending')}
                  type="button"
                >
                  Menunggu
                </button>
                <button
                  className={`filter-tab ${currentFilter === 'belum' ? 'active' : ''}`}
                  onClick={() => setCurrentFilter('belum')}
                  type="button"
                >
                  Belum Bayar
                </button>
              </div>
            </div>

            <div className="panel-sort">
              <span className="sort-label">{filteredTransaksi.length} transaksi ditemukan</span>
            </div>

            {filteredTransaksi.length === 0 ? (
              <div className="riwayat-empty">
                <div className="empty-icon-wrap">
                  <span className="material-symbols-rounded">receipt_long</span>
                </div>
                <div className="empty-title">Belum ada transaksi</div>
                <div className="empty-sub">Transaksi yang tercatat akan muncul di sini</div>
              </div>
            ) : (
              <div className="transaksi-list">
                {filteredTransaksi.map((t) => (
                  <div key={t.id} className="transaksi-item">
                    <div className="transaksi-icon">
                      <span className="material-symbols-rounded">receipt</span>
                    </div>
                    <div className="transaksi-info">
                      <div className="transaksi-name">
                        {t.patientName} · {t.tindakan}
                      </div>
                      <div className="transaksi-meta">
                        {t.invoiceNo} · {t.metode} · {t.date}
                      </div>
                    </div>
                    <div className="transaksi-right">
                      <div className="transaksi-amount">{formatRupiah(t.amount)}</div>
                      <span className={`tag ${t.status}`}>{statusLabel(t.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
