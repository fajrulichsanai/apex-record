'use client';

import { useState } from 'react';
import Reveal from './Reveal';
import { COMPANY } from '@/lib/company';

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
const MULTI_WA = `${COMPANY.whatsappUrl}?text=${encodeURIComponent(
  'Halo tim ApexRecord, saya ingin konsultasi paket Multi Klinik untuk beberapa cabang klinik kami.',
)}`;

/** Batas per paket — sama dengan bawaan backend (plan-limits.ts & api-plan-limits.ts). */
const LIMITS: { label: string; starter: string; pro: string; multi: string }[] = [
  { label: 'Jumlah klinik', starter: '1 klinik', pro: '1 klinik', multi: 'Banyak cabang, 1 akun owner' },
  { label: 'Akun pengguna aktif', starter: '5 akun', pro: '25 akun', multi: '25 akun per cabang (dipakai bersama)' },
  { label: 'Storage foto & dokumen', starter: '1 GB', pro: '5 GB', multi: '5 GB per cabang (dipakai bersama)' },
  { label: 'API website klinik', starter: '1.000 request/hari', pro: '10.000 request/hari', multi: '1.000.000 request/hari' },
  { label: 'Semua fitur aplikasi', starter: 'Ya', pro: 'Ya', multi: 'Ya, di setiap cabang' },
  { label: 'Dashboard & laporan gabungan cabang', starter: '—', pro: '—', multi: 'Ya' },
  { label: 'Dukungan', starter: 'WhatsApp & email', pro: 'Prioritas', multi: 'Pendampingan khusus' },
];

/** Fitur yang termasuk di SEMUA paket. */
const FEATURE_GROUPS: { title: string; items: string[] }[] = [
  {
    title: 'Pasien & Kunjungan',
    items: [
      'Data pasien lengkap: alergi, riwayat penyakit, obat, dan keluarga',
      'Reservasi & antrian kunjungan',
      'Follow up / recall pasien otomatis',
      'Informed consent digital dengan tanda tangan',
      'Surat rujukan',
    ],
  },
  {
    title: 'Rekam Medis',
    items: [
      'Catatan SOAP dengan 18 template gigi siap pakai — tinggal isi nomor gigi',
      'Simpan catatan sendiri sebagai template, bisa dibagikan ke semua dokter',
      'Diagnosis ICD-10 & SNOMED CT, cari dengan bahasa sehari-hari',
      'Odontogram, pemeriksaan gigi lanjutan, fisik & penunjang',
      'Resep obat & farmasi',
      'Dikte suara untuk mengisi catatan',
    ],
  },
  {
    title: 'Kasir & Keuangan',
    items: [
      'Transaksi tunai, transfer, QRIS, asuransi, BPJS — bisa DP lalu pelunasan',
      'Edit transaksi yang salah input, setiap perubahan tercatat di log',
      'Tarif dengan harga modal, harga jual, biaya lab, dan margin otomatis',
      'Rincian margin per tindakan: (harga jual − modal − lab) × jumlah',
      'Laporan laba rugi lengkap + PDF sekali unduh: share fee per dokter dengan rekening, biaya lab, stok yang perlu dibeli, arus kas, dan rincian pengeluaran',
      'Laporan kunjungan & catatan biaya operasional',
    ],
  },
  {
    title: 'Dokter & Pegawai',
    items: [
      'Share fee dokter otomatis, dihitung setelah dipotong biaya lab',
      'Penggajian: gaji pokok, bonus, potongan, dan share fee dokter',
      'Slip gaji & rekap transfer gaji dalam PDF',
      'Absensi pegawai dengan lokasi & foto selfie',
      'Akses per peran: owner, admin, dokter, perawat',
    ],
  },
  {
    title: 'Stok Bahan (BMHP)',
    items: [
      'Master barang, stok masuk & keluar',
      'Stok berkurang otomatis sesuai resep bahan tiap tindakan',
      'Harga modal tindakan bisa dihitung dari resep bahan',
      'Stock opname dengan berita acara siap cetak',
      'Peringatan stok menipis & mendekati kedaluwarsa',
    ],
  },
  {
    title: 'Promosi',
    items: [
      'Laporan referral & sumber pasien',
      'Daftar pasien ulang tahun + ucapan WhatsApp sekali klik',
      'Promo hanya terkirim ke pasien yang setuju (sesuai UU PDP)',
      'Konten untuk media sosial klinik',
    ],
  },
  {
    title: 'Integrasi & Keamanan',
    items: [
      'Terhubung SATUSEHAT Kemenkes',
      'API untuk website klinik: jadwal dokter, layanan, dan reservasi online',
      'Log aktivitas setiap perubahan data',
      'NIK pasien terenkripsi',
      'Unduh semua data klinik kapan saja (Excel + berkas)',
    ],
  },
];

/** Hal penting seputar langganan. */
const NOTES: { title: string; body: string }[] = [
  {
    title: 'Coba gratis 14 hari',
    body: '7 hari pertama dengan batas Starter, 7 hari berikutnya otomatis batas Pro. Storage 100 MB. Tanpa penagihan otomatis.',
  },
  {
    title: 'Naik atau turun paket kapan saja',
    body: 'Naik paket cukup bayar selisih untuk sisa hari langganan. Turun paket berlaku di periode berikutnya.',
  },
  {
    title: 'Tambah storage',
    body: 'Kurang ruang? Tambah Rp 10.000 per GB per bulan, tanpa harus naik paket.',
  },
  {
    title: 'Bayar mudah, kuitansi otomatis',
    body: 'Bayar lewat transfer. Setelah dikonfirmasi tim kami, kuitansi PDF langsung dikirim ke email owner.',
  },
  {
    title: 'Data tetap milik Anda',
    body: 'Unduh semua data kapan saja. Jika langganan berakhir, Anda punya waktu 15 hari untuk mengunduh data sebelum dihapus.',
  },
];

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
              <li><CheckIcon /><span><b>Semua fitur aplikasi</b> — lihat daftar lengkap di bawah</span></li>
              <li><CheckIcon /><span><b>1 klinik</b></span></li>
              <li><CheckIcon /><span><b>5 akun</b> pengguna aktif (owner, admin, dokter, perawat)</span></li>
              <li><CheckIcon /><span><b>Storage 1 GB</b> untuk foto, rontgen &amp; dokumen</span></li>
              <li><CheckIcon /><span>API website <b>1.000 request/hari</b></span></li>
              <li><CheckIcon /><span>Dukungan via WhatsApp &amp; email</span></li>
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
              <li><CheckIcon /><span><b>Semua fitur aplikasi</b> — sama lengkapnya dengan Starter</span></li>
              <li><CheckIcon /><span><b>1 klinik</b></span></li>
              <li><CheckIcon /><span><b>25 akun</b> pengguna aktif — cocok untuk banyak dokter &amp; pegawai</span></li>
              <li><CheckIcon /><span><b>Storage 5 GB</b> untuk foto, rontgen &amp; dokumen</span></li>
              <li><CheckIcon /><span>API website <b>10.000 request/hari</b></span></li>
              <li><CheckIcon /><span><b>Dukungan prioritas</b> &amp; backup data berkala</span></li>
            </ul>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad btn-block">Pilih Paket</a>
          </Reveal>

          {/* MULTI KLINIK — harga & penagihan diatur terpisah oleh tim ApexRecord */}
          <Reveal delay={160} className="price-card">
            <div className="price-icon"><MultiIcon /></div>
            <div className="price-name">Multi Klinik</div>
            <div className="price-sub-desc">Untuk jaringan atau grup klinik</div>
            <div className="price-amt">
              <span className="n price-contact">Hubungi Kami</span>
            </div>
            <div className="price-sub">
              Harga &amp; penagihan disesuaikan jumlah cabang.
              <br />
              Tim ApexRecord akan memandu aktivasinya.
            </div>
            <ul className="price-list">
              <li><CheckIcon /><span><b>Banyak cabang</b> dalam satu akun owner</span></li>
              <li><CheckIcon /><span><b>Semua fitur aplikasi</b> di setiap cabang</span></li>
              <li><CheckIcon /><span>Dashboard &amp; laporan <b>gabungan semua cabang</b></span></li>
              <li><CheckIcon /><span>Peran <b>Manajer Cabang</b> untuk tiap klinik</span></li>
              <li><CheckIcon /><span>25 akun &amp; 5 GB per cabang, dipakai bersama</span></li>
              <li><CheckIcon /><span>API website <b>1.000.000 request/hari</b></span></li>
              <li><CheckIcon /><span>Satu tagihan untuk semua cabang</span></li>
            </ul>
            <a href={MULTI_WA} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-block">Hubungi Kami</a>
          </Reveal>
        </div>

        <p className="price-footnote">
          Harga Starter &amp; Pro per bulan per klinik. Langganan 3, 6, atau 12 bulan mendapat potongan tambahan. Harga promo
          berlaku untuk pembayaran sampai {PROMO_UNTIL_LABEL}.
        </p>

        <Reveal className="plan-compare">
          <h3>Perbandingan batas paket</h3>
          <div className="plan-compare-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">Starter</th>
                  <th scope="col" className="feat">Pro</th>
                  <th scope="col">Multi Klinik</th>
                </tr>
              </thead>
              <tbody>
                {LIMITS.map((l) => (
                  <tr key={l.label}>
                    <th scope="row">{l.label}</th>
                    <td>{l.starter}</td>
                    <td className="feat">{l.pro}</td>
                    <td>{l.multi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <div className="plan-features">
          <div className="plan-features-head">
            <h3>Semua paket sudah termasuk</h3>
            <p>Tidak ada fitur yang dikunci per paket — Starter, Pro, dan Multi Klinik memakai aplikasi yang sama lengkapnya.</p>
          </div>
          <div className="plan-features-grid">
            {FEATURE_GROUPS.map((g, i) => (
              <Reveal key={g.title} delay={(i % 3) * 60} className="plan-feature-card">
                <h4>{g.title}</h4>
                <ul>
                  {g.items.map((it) => (
                    <li key={it}>
                      <CheckIcon />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="plan-notes">
          {NOTES.map((n) => (
            <div key={n.title} className="plan-note">
              <b>{n.title}</b>
              <span>{n.body}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
