'use client';

import { useState } from 'react';

const APP_URL = 'https://staging.apexrecord.my.id';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Cycle = 'bulanan' | 'tahunan';

function formatRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

/** Harga tahunan = 10x harga bulanan ("hemat 2 bulan"), dibulatkan ke ribuan terdekat untuk tampilan. */
function monthlyEquivalent(monthly: number) {
  return Math.round(((monthly * 10) / 12) / 1000) * 1000;
}

const STARTER_MONTHLY = 99000;
const PRO_MONTHLY = 149000;
const MULTI_PER_CLINIC_MONTHLY = 149000;
const MULTI_ADMIN_FEE = 99000;

export default function PricingSection() {
  const [cycle, setCycle] = useState<Cycle>('bulanan');
  const isAnnual = cycle === 'tahunan';

  return (
    <section id="harga">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">Investasi, bukan biaya</span>
          <h2>Pilih Paket</h2>
          <p>Mulai dari praktik solo sampai jaringan klinik — semua paket termasuk update fitur dan enkripsi data.</p>
        </div>

        <div className="pricing-toggle-row">
          <div className="pricing-toggle">
            <button type="button" className={!isAnnual ? 'active' : ''} onClick={() => setCycle('bulanan')}>
              Bulanan
            </button>
            <button type="button" className={isAnnual ? 'active' : ''} onClick={() => setCycle('tahunan')}>
              Tahunan
            </button>
          </div>
          <span className="pricing-save-badge">Hemat 2 Bulan</span>
        </div>

        {isAnnual && (
          <div className="annual-perk-banner">
            <CheckIcon />
            <span><b>Bonus paket Tahunan</b> — gratis request fitur custom selama 1 tahun masa langganan.</span>
          </div>
        )}

        <div className="price-grid">
          {/* STARTER */}
          <div className="price-card">
            <div className="price-icon">🩺</div>
            <div className="price-name">Starter</div>
            <div className="price-sub-desc">Untuk klinik yang baru memulai</div>
            <div className="price-amt">
              <span className="n">{formatRp(isAnnual ? monthlyEquivalent(STARTER_MONTHLY) : STARTER_MONTHLY)}</span>
              <span className="u">/ bulan</span>
            </div>
            <div className="price-sub">
              {isAnnual ? `${formatRp(STARTER_MONTHLY * 10)} ditagih per tahun` : 'Ditagih tiap bulan'}
            </div>
            <ul className="price-list">
              <li><CheckIcon />Manajemen pasien &amp; kunjungan</li>
              <li><CheckIcon />Transaksi &amp; tarif layanan</li>
              <li><CheckIcon />Rekam medis digital lengkap</li>
              <li><CheckIcon />Laporan keuangan &amp; kunjungan</li>
              <li><CheckIcon />1 klinik</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">Pilih Paket</a>
          </div>

          {/* PRO */}
          <div className="price-card feat">
            <span className="price-badge">Paling Direkomendasikan</span>
            <div className="price-icon">⭐</div>
            <div className="price-name">Pro</div>
            <div className="price-sub-desc">Untuk klinik yang terus berkembang</div>
            <div className="price-amt">
              <span className="n">{formatRp(isAnnual ? monthlyEquivalent(PRO_MONTHLY) : PRO_MONTHLY)}</span>
              <span className="u">/ bulan</span>
            </div>
            <div className="price-sub">
              {isAnnual ? `${formatRp(PRO_MONTHLY * 10)} ditagih per tahun` : 'Ditagih tiap bulan'}
            </div>
            <ul className="price-list">
              <li><CheckIcon />Semua fitur Starter</li>
              <li><CheckIcon />User management multi-role</li>
              <li><CheckIcon />Dukungan prioritas</li>
              <li><CheckIcon />Backup data berkala</li>
              <li><CheckIcon />1 klinik</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad btn-block">Pilih Paket</a>
          </div>

          {/* MULTI KLINIK */}
          <div className="price-card">
            <div className="price-icon">🏥</div>
            <div className="price-name">Multi Klinik</div>
            <div className="price-sub-desc">Untuk jaringan atau grup klinik</div>
            <div className="price-amt">
              <span className="n">{formatRp(isAnnual ? monthlyEquivalent(MULTI_PER_CLINIC_MONTHLY) : MULTI_PER_CLINIC_MONTHLY)}</span>
              <span className="u">/ klinik / bulan</span>
            </div>
            <div className="price-sub">
              {isAnnual
                ? `${formatRp(MULTI_PER_CLINIC_MONTHLY * 10)} / klinik ditagih per tahun`
                : 'Ditagih tiap bulan, per klinik'}
              <br />
              + {formatRp(MULTI_ADMIN_FEE)} admin owner (sekali per periode)
            </div>
            <ul className="price-list">
              <li><CheckIcon />Semua fitur Pro di tiap klinik</li>
              <li><CheckIcon />Harga per klinik tambahan</li>
              <li><CheckIcon />1x biaya admin owner</li>
              <li><CheckIcon />Aktivasi dibantu tim ApexRecord</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">Pilih Paket</a>
          </div>
        </div>
      </div>
    </section>
  );
}
