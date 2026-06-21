'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import '../styles/tarif.css';

type Tarif = {
  name: string;
  code: string;
  cat: 'Bedah Mulut' | 'Konservasi';
  catClass: 'cat-bedah' | 'cat-konservasi';
  tipe: 'Add-on' | 'Paket' | 'Range';
  tipeClass: 'tipe-addon' | 'tipe-paket' | 'tipe-range';
  extraBadge?: string;
  icon: string;
  durationMnt: number;
  price: string;
  unit: string;
  margin: number;
};

const TARIF_DATA: Tarif[] = [
  {
    name: 'Cabut Gigi',
    code: 'CBT-001',
    cat: 'Bedah Mulut',
    catClass: 'cat-bedah',
    tipe: 'Range',
    tipeClass: 'tipe-range',
    icon: 'dentistry',
    durationMnt: 30,
    price: 'Rp 200.000 – Rp 300.000',
    unit: 'per visit',
    margin: 99,
  },
  {
    name: 'Odontektomi M3',
    code: 'ODO-M3',
    cat: 'Bedah Mulut',
    catClass: 'cat-bedah',
    tipe: 'Add-on',
    tipeClass: 'tipe-addon',
    icon: 'dentistry',
    durationMnt: 90,
    price: 'Rp 1.000.000',
    unit: 'per tindakan',
    margin: 90,
  },
  {
    name: 'PSA - Devitalisasi',
    code: 'PSA-DEV',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Add-on',
    tipeClass: 'tipe-addon',
    icon: 'medical_services',
    durationMnt: 60,
    price: 'Rp 300.000',
    unit: 'per visit',
    margin: 92,
  },
  {
    name: 'PSA - Obturasi',
    code: 'PSA-OBT',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Add-on',
    tipeClass: 'tipe-addon',
    icon: 'medical_services',
    durationMnt: 60,
    price: 'Rp 300.000',
    unit: 'per visit',
    margin: 83,
  },
  {
    name: 'PSA - Open Access',
    code: 'PSA-OA',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Add-on',
    tipeClass: 'tipe-addon',
    icon: 'medical_services',
    durationMnt: 60,
    price: 'Rp 200.000',
    unit: 'per visit',
    margin: 88,
  },
  {
    name: 'PSA - Preparasi Saluran Akar',
    code: 'PSA-PREP',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Add-on',
    tipeClass: 'tipe-addon',
    icon: 'medical_services',
    durationMnt: 60,
    price: 'Rp 200.000',
    unit: 'per visit',
    margin: 75,
  },
  {
    name: 'Tambal GIC',
    code: 'TBL-GIC',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Paket',
    tipeClass: 'tipe-paket',
    extraBadge: '2 paket',
    icon: 'medical_services',
    durationMnt: 30,
    price: 'Rp 150.000 – Rp 170.000',
    unit: 'per visit',
    margin: 90,
  },
  {
    name: 'Tambal RK Anterior',
    code: 'TBL-RKA',
    cat: 'Konservasi',
    catClass: 'cat-konservasi',
    tipe: 'Paket',
    tipeClass: 'tipe-paket',
    extraBadge: '2 paket',
    icon: 'medical_services',
    durationMnt: 45,
    price: 'Rp 300.000 – Rp 400.000',
    unit: 'per visit',
    margin: 87,
  },
];

const PRICING_TYPES: { key: 'Add-on' | 'Paket' | 'Range'; name: string; desc: string; icon: string }[] = [
  { key: 'Add-on', name: 'Add-on', desc: 'Harga dasar + opsional', icon: 'add_circle' },
  { key: 'Paket', name: 'Paket', desc: 'Tier: Basic / Gold / Premium', icon: 'inventory_2' },
  { key: 'Range', name: 'Range', desc: 'Min – Max tergantung kondisi', icon: 'trending_up' },
];

const RADIO_OPTIONS = ['30%', '40%', '50%'];

export default function TarifPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pricingType, setPricingType] = useState<'Add-on' | 'Paket' | 'Range'>('Add-on');
  const [radioValue, setRadioValue] = useState('40%');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterTipe, setFilterTipe] = useState('');

  const [inputNama, setInputNama] = useState('');
  const [inputHarga, setInputHarga] = useState('');
  const [inputKategori, setInputKategori] = useState('Konsultasi');
  const [inputSatuan, setInputSatuan] = useState('per visit');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const filteredTarif = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return TARIF_DATA.filter((item) => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      const matchCat = !filterKategori || item.cat === filterKategori;
      const matchTipe = !filterTipe || item.tipe === filterTipe;
      return matchQ && matchCat && matchTipe;
    });
  }, [searchQuery, filterKategori, filterTipe]);

  const totalCount = TARIF_DATA.length;
  const avgMargin = Math.round(TARIF_DATA.reduce((s, t) => s + t.margin, 0) / TARIF_DATA.length);
  const avgDurasi = Math.round(TARIF_DATA.reduce((s, t) => s + t.durationMnt, 0) / TARIF_DATA.length);
  const maxPriceOf = (price: string) => {
    const numbers = price.match(/[\d.]+/g)?.map((n) => parseInt(n.replace(/\./g, ''), 10)) ?? [0];
    return Math.max(...numbers);
  };
  const termahal = TARIF_DATA.reduce((a, b) => (maxPriceOf(a.price) >= maxPriceOf(b.price) ? a : b));
  const kategoriCount = new Set(TARIF_DATA.map((t) => t.cat)).size;

  const hargaNumber = parseInt(inputHarga, 10) || 0;
  const previewPrice = hargaNumber > 0 ? `Rp ${hargaNumber.toLocaleString('id-ID')}` : 'Rp 0';

  return (
    <DashboardLayout>
      <main className="content tarif-page">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Tarif &amp; Tindakan</h1>
              <span className="badge-count">{totalCount}</span>
            </div>
            <p className="page-subtitle">Kelola daftar tarif dan tindakan klinik Anda</p>
          </div>
          <div className="page-header-actions">
            <button className="btn-outline" type="button">
              <span className="material-symbols-rounded">download</span>
              Ekspor
            </button>
            <button className="btn-primary" type="button" onClick={() => setIsModalOpen(true)}>
              <span className="material-symbols-rounded">add</span>
              Tambah Tarif
            </button>
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
              <div className="stat-label">Total Tindakan</div>
              <div className="stat-sub">{kategoriCount} kategori aktif</div>
            </div>
          </div>
          <div className="stat-card margin">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgMargin}%</div>
              <div className="stat-label">Rata-rata Margin</div>
              <div className="stat-sub">↑ 2% dari bulan lalu</div>
            </div>
          </div>
          <div className="stat-card termahal">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{termahal.price}</div>
              <div className="stat-label">Tindakan Termahal</div>
              <div className="stat-sub">{termahal.name}</div>
            </div>
          </div>
          <div className="stat-card durasi">
            <div className="stat-icon">
              <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                schedule
              </span>
            </div>
            <div className="stat-info">
              <div className="stat-value">{avgDurasi} mnt</div>
              <div className="stat-label">Avg. Durasi</div>
              <div className="stat-sub">per tindakan</div>
            </div>
          </div>
        </div>

        {/* Panel */}
        <div className="panel">
          <div className="panel-toolbar">
            <div className="toolbar-row">
              <div className="search-box">
                <span className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari tarif atau kode tindakan…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select className="select-pill" value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)}>
                <option value="">Semua Tipe</option>
                <option value="Add-on">Add-on</option>
                <option value="Paket">Paket</option>
                <option value="Range">Range</option>
              </select>
            </div>
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filterKategori === '' ? 'active' : ''}`}
                onClick={() => setFilterKategori('')}
                type="button"
              >
                Semua
              </button>
              <button
                className={`filter-tab ${filterKategori === 'Bedah Mulut' ? 'active' : ''}`}
                onClick={() => setFilterKategori('Bedah Mulut')}
                type="button"
              >
                Bedah Mulut
              </button>
              <button
                className={`filter-tab ${filterKategori === 'Konservasi' ? 'active' : ''}`}
                onClick={() => setFilterKategori('Konservasi')}
                type="button"
              >
                Konservasi
              </button>
            </div>
          </div>

          <div className="panel-sort">
            <span className="sort-label">{filteredTarif.length} tindakan ditemukan</span>
          </div>

          {filteredTarif.length === 0 ? (
            <div className="empty-list">
              <div className="empty-icon-wrap">
                <span className="material-symbols-rounded">search_off</span>
              </div>
              <div className="empty-title">Tidak ada tindakan ditemukan</div>
              <div className="empty-sub">Coba ubah kata kunci pencarian atau filter yang digunakan</div>
            </div>
          ) : (
            <div className="tarif-list">
              {filteredTarif.map((item) => (
                <div key={item.code} className="tarif-item">
                  <div className={`tarif-icon ${item.catClass}`}>
                    <span className="material-symbols-rounded">{item.icon}</span>
                  </div>
                  <div className="tarif-info">
                    <div className="tarif-top">
                      <span className="tarif-code">{item.code}</span>
                      <span className="tarif-name">{item.name}</span>
                    </div>
                    <div className="tarif-badges">
                      <span className={`tag ${item.catClass}`}>{item.cat}</span>
                      <span className={`tag ${item.tipeClass}`}>{item.tipe}</span>
                      {item.extraBadge && <span className="tag multi">{item.extraBadge}</span>}
                      <span className="tarif-meta">
                        <span className="material-symbols-rounded">schedule</span>
                        {item.durationMnt} mnt
                      </span>
                    </div>
                  </div>
                  <div className="tarif-right">
                    <div className="tarif-price">{item.price}</div>
                    <div className="tarif-unit">{item.unit}</div>
                    <span className="tarif-margin">
                      <span className="material-symbols-rounded">trending_up</span>
                      Margin {item.margin}%
                    </span>
                  </div>
                  <button className="tarif-more" type="button">
                    <span className="material-symbols-rounded">more_vert</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div
            className="tarif-page-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div className="tarif-page-modal-box">
              <div className="modal-header">
                <div className="modal-header-title">
                  <div className="modal-header-icon">
                    <span className="material-symbols-rounded">sell</span>
                  </div>
                  <div>
                    <h2>Tambah Tarif Baru</h2>
                    <p>Lengkapi detail tindakan dan struktur harganya</p>
                  </div>
                </div>
                <button className="modal-close" type="button" onClick={() => setIsModalOpen(false)} aria-label="Tutup">
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="preview-card">
                  <div className="preview-badges">
                    <span className="preview-badge">{inputKategori}</span>
                    <span className="preview-badge">{pricingType}</span>
                  </div>
                  <div className="preview-name">{inputNama || 'Nama tindakan…'}</div>
                  <div>
                    <span className="preview-price">{previewPrice}</span>
                    <span className="preview-unit"> / {inputSatuan}</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field full">
                    <label>Nama Tindakan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Scaling Gigi"
                      value={inputNama}
                      onChange={(e) => setInputNama(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Kode</label>
                    <input type="text" placeholder="SCL-001" />
                  </div>
                  <div className="form-field">
                    <label>Kategori</label>
                    <select value={inputKategori} onChange={(e) => setInputKategori(e.target.value)}>
                      <option>Konsultasi</option>
                      <option>Bedah Mulut</option>
                      <option>Konservasi</option>
                      <option>Ortho</option>
                    </select>
                  </div>
                </div>

                <div className="form-section-title">
                  <span className="material-symbols-rounded">payments</span>
                  Tipe Pricing
                </div>
                <div className="pricing-types">
                  {PRICING_TYPES.map((pt) => (
                    <div
                      key={pt.key}
                      className={`pricing-type ${pricingType === pt.key ? 'active' : ''}`}
                      onClick={() => setPricingType(pt.key)}
                    >
                      <span className="material-symbols-rounded">{pt.icon}</span>
                      <div className="pricing-type-name">{pt.name}</div>
                      <div className="pricing-type-desc">{pt.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Harga Dasar (Rp)</label>
                    <input
                      type="number"
                      placeholder="150000"
                      value={inputHarga}
                      onChange={(e) => setInputHarga(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Satuan</label>
                    <select value={inputSatuan} onChange={(e) => setInputSatuan(e.target.value)}>
                      <option>per visit</option>
                      <option>per tindakan</option>
                      <option>per sesi</option>
                      <option>per bulan</option>
                    </select>
                  </div>
                </div>

                <div className="section-block">
                  <div className="section-block-header">
                    <span className="material-symbols-rounded">inventory_2</span>
                    Paket / Tier
                  </div>
                  <div className="section-block-body">
                    <p className="empty-state">Belum ada paket. Tambahkan paket di bawah.</p>
                    <button className="add-link" type="button">
                      <span className="material-symbols-rounded">add_circle</span>
                      Tambah Paket
                    </button>
                  </div>
                </div>

                <div className="section-block">
                  <div className="section-block-header">
                    <span className="material-symbols-rounded">shopping_bag</span>
                    Add-on / Layanan Tambahan
                  </div>
                  <div className="section-block-body">
                    <p className="empty-state">Belum ada add-on.</p>
                    <button className="add-link" type="button">
                      <span className="material-symbols-rounded">add_circle</span>
                      Tambah Add-on
                    </button>
                  </div>
                </div>

                <div className="split-row">
                  <div className="form-field">
                    <label>Durasi (mnt)</label>
                    <input type="number" placeholder="30" />
                  </div>
                  <div className="form-field">
                    <label>Deskripsi (opsional)</label>
                    <input type="text" placeholder="Detail tindakan…" />
                  </div>
                </div>

                <div className="form-section-title">
                  <span className="material-symbols-rounded">credit_card</span>
                  Biaya Bahan &amp; Bagi Hasil
                </div>

                <div className="split-row">
                  <div className="form-field">
                    <label>Biaya Bahan (Rp)</label>
                    <input type="number" placeholder="0" />
                  </div>
                  <div className="form-field">
                    <label>Bagi Hasil Dokter (%)</label>
                    <div className="radio-group">
                      {RADIO_OPTIONS.map((opt) => (
                        <div
                          key={opt}
                          className={`radio-option ${radioValue === opt ? 'active' : ''}`}
                          onClick={() => setRadioValue(opt)}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button className="btn-primary" type="button">
                  <span className="material-symbols-rounded">save</span>
                  Tambah Tarif
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
