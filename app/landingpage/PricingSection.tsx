'use client';

import { useState } from 'react';
import Reveal from './Reveal';

const APP_URL = 'https://app.apexrecord.my.id';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M9 3a3 3 0 013 3c0 1.5-1 2.2-1 3.5 0 .6.2 1 .2 1.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M15 3a3 3 0 00-3 3c0 1.5 1 2.2 1 3.5 0 3-1.5 4-1.5 8.5a2.5 2.5 0 005 0c0-2 .3-3.2.5-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2.4 5.5L20 9l-4.2 3.8L17 19l-5-3.2L7 19l1.2-6.2L4 9l5.6-.5L12 3z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

function MultiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M3 21V8l7-4 7 4v13" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <path d="M14 21V11l7-3v13" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <path d="M8 12h1M8 15h1M8 18h1" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function formatRp(n: number) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

/**
 * Harga normal per bulan, dan harga promo s.d. PROMO_UNTIL (inklusif).
 * Halaman ini publik (tanpa login), jadi angkanya mengikuti paket default
 * di backend; setelah 31 Des 2026 harga promo otomatis hilang.
 */
const STARTER_MONTHLY = 199000;
const STARTER_PROMO = 99000;
const PRO_MONTHLY = 299000;
const PRO_PROMO = 149000;
const PROMO_UNTIL = '2026-12-31';
const PROMO_UNTIL_LABEL = '31 Des 2026';
const MULTI_PER_CLINIC_MONTHLY = 149000;
const MULTI_ADMIN_FEE = 99000;

/** Diskon lama langganan bawaan (sama dengan bawaan backend). */
const DURATIONS: { months: number; label: string; discount: number }[] = [
  { months: 1, label: '1 bulan', discount: 0 },
  { months: 3, label: '3 bulan', discount: 5 },
  { months: 6, label: '6 bulan', discount: 10 },
  { months: 12, label: '1 tahun', discount: 17 },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function PriceBlock({
  normal,
  promo,
  promoActive,
  months,
  discount,
  unit = '/ bulan',
  perClinic,
  extra,
}: {
  normal: number;
  promo?: number;
  promoActive: boolean;
  months: number;
  discount: number;
  unit?: string;
  perClinic?: boolean;
  extra?: string;
}) {
  const monthly = promoActive && promo ? promo : normal;
  const total = Math.round(monthly * months * (1 - discount / 100));
  const saving = promo ? Math.round(((normal - promo) / normal) * 100) : 0;
  return (
    <>
      {promoActive && promo ? (
        <div className="price-old">
          <s>{formatRp(normal)}</s>
          <span className="price-promo">Promo s.d. {PROMO_UNTIL_LABEL} · hemat {saving}%</span>
        </div>
      ) : null}
      <div className="price-amt">
        <span className="n">{formatRp(monthly)}</span>
        <span className="u">{unit}</span>
      </div>
      <div className="price-sub">
        {months === 1
          ? `Ditagih tiap bulan${perClinic ? ', per klinik' : ''}`
          : `${formatRp(total)}${perClinic ? ' / klinik' : ''} untuk ${months === 12 ? '1 tahun' : `${months} bulan`}${discount > 0 ? ` · hemat ${discount}% lagi` : ''}`}
        {extra && (
          <>
            <br />
            {extra}
          </>
        )}
      </div>
    </>
  );
}

export default function PricingSection() {
  const [months, setMonths] = useState(1);
  const duration = DURATIONS.find((d) => d.months === months) ?? DURATIONS[0];
  const promoActive = todayIso() <= PROMO_UNTIL;
  const isAnnual = months === 12;

  return (
    <section id="harga">
      <div className="wrap">
        <div className="section-head center">
          <span className="eyebrow">Investasi, bukan biaya</span>
          <h2>Pilih Paket</h2>
          <p>Mulai dari praktik solo sampai jaringan klinik — semua paket termasuk update fitur dan perlindungan keamanan yang sama.</p>
        </div>

        <div className="pricing-toggle-row">
          <div className="pricing-toggle" role="radiogroup" aria-label="Lama langganan">
            {DURATIONS.map((d) => (
              <button
                key={d.months}
                type="button"
                role="radio"
                aria-checked={months === d.months}
                className={months === d.months ? 'active' : ''}
                onClick={() => setMonths(d.months)}
              >
                {d.label}
                {d.discount > 0 && <span className="pricing-off">−{d.discount}%</span>}
              </button>
            ))}
          </div>
        </div>

        {isAnnual && (
          <div className="annual-perk-banner">
            <CheckIcon />
            <span><b>Bonus paket Tahunan</b> — gratis request fitur custom selama 1 tahun masa langganan.</span>
          </div>
        )}

        <div className="price-grid">
          {/* STARTER */}
          <Reveal className="price-card">
            <div className="price-icon"><StarterIcon /></div>
            <div className="price-name">Starter</div>
            <div className="price-sub-desc">Untuk klinik yang baru memulai</div>
            <PriceBlock
              normal={STARTER_MONTHLY}
              promo={STARTER_PROMO}
              promoActive={promoActive}
              months={months}
              discount={duration.discount}
            />
            <ul className="price-list">
              <li><CheckIcon />Manajemen pasien &amp; kunjungan</li>
              <li><CheckIcon />Transaksi &amp; tarif layanan</li>
              <li><CheckIcon />Rekam medis digital lengkap</li>
              <li><CheckIcon />Laporan keuangan &amp; kunjungan</li>
              <li><CheckIcon />Diagnosis ICD-10 &amp; SNOMED CT</li>
              <li><CheckIcon />API website: 1.000 request/hari</li>
              <li><CheckIcon />1 klinik</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">Pilih Paket</a>
          </Reveal>

          {/* PRO */}
          <Reveal delay={80} className="price-card feat">
            <span className="price-badge">Paling Direkomendasikan</span>
            <div className="price-icon"><ProIcon /></div>
            <div className="price-name">Pro</div>
            <div className="price-sub-desc">Untuk klinik yang terus berkembang</div>
            <PriceBlock
              normal={PRO_MONTHLY}
              promo={PRO_PROMO}
              promoActive={promoActive}
              months={months}
              discount={duration.discount}
            />
            <ul className="price-list">
              <li><CheckIcon />Semua fitur Starter</li>
              <li><CheckIcon />User management multi-role</li>
              <li><CheckIcon />Dukungan prioritas</li>
              <li><CheckIcon />Backup data berkala</li>
              <li><CheckIcon />API website: 10.000 request/hari</li>
              <li><CheckIcon />1 klinik</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad btn-block">Pilih Paket</a>
          </Reveal>

          {/* MULTI KLINIK */}
          <Reveal delay={160} className="price-card">
            <div className="price-icon"><MultiIcon /></div>
            <div className="price-name">Multi Klinik</div>
            <div className="price-sub-desc">Untuk jaringan atau grup klinik</div>
            <PriceBlock
              normal={MULTI_PER_CLINIC_MONTHLY}
              promoActive={false}
              months={months}
              discount={duration.discount}
              unit="/ klinik / bulan"
              perClinic
              extra={`+ ${formatRp(MULTI_ADMIN_FEE)} admin owner per bulan`}
            />
            <ul className="price-list">
              <li><CheckIcon />Semua fitur Pro di tiap klinik</li>
              <li><CheckIcon />Harga per klinik tambahan</li>
              <li><CheckIcon />1x biaya admin owner</li>
              <li><CheckIcon />API: 1.000.000 request/hari</li>
              <li><CheckIcon />Aktivasi dibantu tim ApexRecord</li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">Pilih Paket</a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
