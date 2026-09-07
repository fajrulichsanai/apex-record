import type { Metadata } from 'next';
import PricingSection from './PricingSection';
import './landingpage.css';

export const metadata: Metadata = {
  title: 'ApexRecord — Software Manajemen Klinik Indonesia',
  description:
    'ApexRecord membantu Klinik Pratama, Klinik Utama, TPMD, dan TPMDG mengelola rekam medis, tarif, farmasi, dan laporan keuangan dalam satu platform.',
};

const APP_URL = 'https://staging.apexrecord.my.id';

const HEAT_PATTERN = [0.1, 0.15, 0.2, 0.35, 0.5, 0.7, 0.85, 0.95, 0.8, 0.55, 0.3, 0.15];
const HEAT_ROWS = 4;

function heatOpacity(row: number, col: number): number {
  const base = HEAT_PATTERN[col];
  const jitterRaw = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  const jitter = Math.abs(jitterRaw % 1) * 0.25;
  return Math.min(0.95, Math.max(0.06, base * (0.7 + row * 0.12) + jitter * 0.15));
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 3a3 3 0 013 3c0 1.5-1 2.2-1 3.5 0 .6.2 1 .2 1.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        <path d="M15 3a3 3 0 00-3 3c0 1.5 1 2.2 1 3.5 0 3-1.5 4-1.5 8.5a2.5 2.5 0 005 0c0-2 .3-3.2.5-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Rekam Medis Digital & Odontogram',
    desc: 'Riwayat pemeriksaan, catatan SOAP, rencana perawatan, dan odontogram interaktif untuk praktik dokter gigi — semua rapi dan mudah dicari kembali.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth={2} />
        <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
    title: 'Catatan Operasional & Pengeluaran',
    desc: 'Catat pengeluaran operasional — gaji, sewa, utilitas, bahan habis pakai — supaya laba bersih yang tampil di laporan benar-benar akurat.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth={2} />
        <path d="M3 9h18M8 4v16" stroke="currentColor" strokeWidth={2} />
      </svg>
    ),
    title: 'Tarif, Billing & Invoice',
    desc: 'Atur tarif tindakan dan diskon, billing otomatis, dengan pembayaran cash, transfer, QRIS, asuransi, hingga BPJS.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20 7h-9M14 17H5M17 3l3 4-3 4M7 21l-3-4 3-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Reservasi & Antrian Online',
    desc: 'Halaman booking publik per klinik, slot jadwal dokter otomatis, dan pengingat kunjungan ulang (recall) ke pasien.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20.8 4.6a5 5 0 00-7.1 0L12 6.3l-1.7-1.7a5 5 0 10-7.1 7.1L12 20.4l8.8-8.7a5 5 0 000-7.1z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      </svg>
    ),
    title: 'Gudang & Farmasi',
    desc: 'Stok bahan medis dan resep obat termonitor, lengkap dengan laporan pemakaian dan nilai inventory secara real-time.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-4M9 15l10-10M14 3h6v6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Fee Share Dokter Otomatis',
    desc: 'Hitung otomatis bagi hasil per dokter per tindakan — persentase atau nominal tetap, tanpa rekap Excel manual.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V7l8-4z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Informed Consent Digital',
    desc: 'Persetujuan tindakan ditandatangani langsung di aplikasi oleh pasien dan dokter — tanpa kertas, tanpa arsip yang hilang.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 3v18h18M7 15l4-6 4 3 5-8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Multi-Cabang, Satu Dashboard',
    desc: 'Punya lebih dari satu klinik? Pantau performa semua cabang dari satu akun owner terpusat.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth={2} />
        <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
    title: 'Audit Log Menyeluruh',
    desc: 'Setiap perubahan data tercatat siapa, kapan, dan apa yang diubah — jejak yang jelas untuk keamanan & akuntabilitas tim.',
  },
];

const AUDIENCE = [
  {
    tag: 'Klinik Pratama',
    title: 'Layanan kesehatan dasar',
    desc: 'Pasien harian dalam jumlah besar — kelola antrian, rekam medis, dan kas klinik dalam satu sistem yang cepat dipakai staf.',
  },
  {
    tag: 'Klinik Utama',
    title: 'Layanan lebih lengkap',
    desc: 'Lebih banyak dokter dan jenis tindakan — pantau performa tiap dokter dan tiap cabang dari satu dashboard owner.',
  },
  {
    tag: 'TPMD',
    title: 'Praktik Mandiri Dokter',
    desc: 'Praktik solo dokter umum — rekam medis rapi dan laporan keuangan pribadi yang jelas, tanpa perlu tim IT.',
  },
  {
    tag: 'TPMDG',
    title: 'Praktik Mandiri Dokter Gigi',
    desc: 'Odontogram digital dan pencatatan tindakan lengkap, dirancang tetap ringan dipakai sekalipun praktik sendirian.',
  },
];

const FAQS = [
  {
    q: 'Data pasien saya aman?',
    a: 'Ya. Data rekam medis tersimpan terenkripsi, akses diatur berdasarkan peran (dokter, admin, owner), dan setiap perubahan data tercatat di audit log — jadi selalu jelas siapa mengubah apa dan kapan.',
    open: true,
  },
  {
    q: 'Apakah ApexRecord cocok untuk praktik mandiri (TPMD/TPMDG)?',
    a: 'Sangat cocok. Baik Anda praktik sendirian sebagai dokter umum (TPMD) maupun dokter gigi (TPMDG), atau mengelola Klinik Pratama/Utama dengan banyak tenaga medis, ApexRecord menyesuaikan — mulai dari satu akun dokter hingga puluhan.',
  },
  {
    q: 'Bagaimana kalau saya sudah punya data pasien lama?',
    a: 'Tim kami dapat membantu proses migrasi data dari sistem atau spreadsheet Anda sebelumnya. Hubungi kami setelah mendaftar untuk dipandu prosesnya.',
  },
  {
    q: 'Apakah bisa dipakai untuk lebih dari satu cabang klinik?',
    a: 'Bisa. Role Multi-Klinik Owner memberi Anda satu dashboard untuk memantau performa seluruh cabang sekaligus, tanpa perlu login bergantian.',
  },
  {
    q: 'Apa yang terjadi setelah masa uji coba 15 hari berakhir?',
    a: 'Anda bisa melanjutkan dengan memilih salah satu paket berlangganan. Tidak ada penagihan otomatis diam-diam — Anda yang memutuskan kapan melanjutkan.',
  },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- scoped intentionally to this one marketing page */}
      <link
        href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,450;0,9..144,600;0,9..144,700;1,9..144,450&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
        rel="stylesheet"
      />

      <div className="bg-field">
        <div className="bg-grid" />
        <div className="bg-glow one" />
        <div className="bg-glow two" />
        <div className="bg-glow three" />
      </div>

      <header className="nav">
        <div className="wrap nav-row">
          <a href="#top" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 15.5c.9 2-1 4-3 3.2-1.6-.6-2.3-2-2.7-3.5-.5-1.8-1.2-2.9-1.3-3-.1.1-.8 1.2-1.3 3-.4 1.5-1.1 2.9-2.7 3.5-2 .8-3.9-1.2-3-3.2L12 3z" fill="white" />
              </svg>
            </span>
            <span className="brand-word">Apex<em>Record</em></span>
          </a>
          <nav className="links">
            <a href="#fitur">Fitur</a>
            <a href="#laporan-pro">Laporan Pro</a>
            <a href="#harga">Harga</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Masuk</a>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad btn-sm">Coba Gratis</a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="pill"><span className="dot" /> Untuk <b>Klinik Pratama, Klinik Utama, TPMD &amp; TPMDG</b></span>
              <h1>Kelola klinik &amp; praktik Anda<br />tanpa <span className="accent">drama administrasi.</span></h1>
              <p className="lead">
                Rekam medis digital, jadwal, tarif, farmasi, hingga laporan keuangan level investor — satu platform
                untuk Klinik Pratama, Klinik Utama, dan praktik mandiri dokter maupun dokter gigi di Indonesia.
              </p>
              <div className="hero-ctas">
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad">
                  Mulai Uji Coba 15 Hari
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
                <a href="#fitur" className="btn btn-ghost">Lihat semua fitur</a>
              </div>
              <div className="trust-row">
                <span className="trust-item"><CheckIcon />15 hari gratis, tanpa kartu kredit</span>
                <span className="trust-item"><CheckIcon />Setup aktif &lt; 10 menit</span>
                <span className="trust-item"><CheckIcon />Mulai dari Rp150rb/bulan</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="float-card float-1">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-4z" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" /><path d="M9.5 12l1.8 1.8L15 10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div><div className="t">Akses Berbasis Peran</div><div className="n">Aman &amp; terstruktur</div></div>
              </div>

              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
                  <span className="title">laporan-keuangan-pro</span>
                </div>
                <div className="mock-body">
                  <div className="mock-greet">Selamat pagi, <b>Klinik Anda</b> 👋</div>
                  <div className="mock-stats">
                    <div className="mock-stat"><div className="k">Pendapatan</div><div className="v">Rp 42,8jt</div><div className="d">+18% MoM</div></div>
                    <div className="mock-stat"><div className="k">Kunjungan</div><div className="v">214</div><div className="d">+9% MoM</div></div>
                    <div className="mock-stat"><div className="k">Pasien Baru</div><div className="v">37</div><div className="d">+12% MoM</div></div>
                  </div>
                  <div className="mock-chart">
                    <div className="lbl"><span>Pendapatan 6 bulan terakhir</span><span>Rp</span></div>
                    <div className="mock-bars">
                      <i style={{ height: '38%' }} /><i style={{ height: '52%' }} /><i style={{ height: '46%' }} />
                      <i style={{ height: '64%' }} /><i style={{ height: '58%' }} /><i style={{ height: '88%' }} />
                    </div>
                  </div>
                  <div className="mock-rows">
                    <div className="mock-row"><span className="who"><span className="swatch" />Konsultasi Umum</span><span className="amt">Rp 150.000</span></div>
                    <div className="mock-row"><span className="who"><span className="swatch" />Tindakan Medis</span><span className="amt">Rp 275.000</span><span className="tag">Lunas</span></div>
                  </div>
                </div>
              </div>

              <div className="float-card float-2">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} /><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
                <div><div className="t">Onboarding</div><div className="n">3 langkah</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section id="untuk-siapa">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow">Dibangun untuk skala apapun</span>
              <h2>Cocok dari praktik solo sampai klinik multi-cabang</h2>
              <p>Satu platform, empat jenis fasilitas layanan primer — menyesuaikan cara kerja Anda, bukan sebaliknya.</p>
            </div>
            <div className="audience-grid">
              {AUDIENCE.map((a) => (
                <div className="audience-card" key={a.tag}>
                  <span className="tag">{a.tag}</span>
                  <h3>{a.title}</h3>
                  <p>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section id="masalah">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow">Masalah yang familiar?</span>
              <h2>Masih kelola klinik lewat Excel, WhatsApp, dan buku catatan?</h2>
              <p>Ini bukan cuma soal rapi-rapian. Kalau datanya berserakan, klinik Anda rugi waktu dan rugi uang.</p>
            </div>
            <div className="pains">
              <div className="pain">
                <div className="num">01</div>
                <h3>Rekam medis tercecer</h3>
                <p>Riwayat tindakan, odontogram, dan resep pasien tersebar di kertas dan chat WhatsApp — susah dicari saat pasien datang lagi.</p>
              </div>
              <div className="pain">
                <div className="num">02</div>
                <h3>Jadwal &amp; antrian masih manual</h3>
                <p>Booking lewat telepon atau catatan buku sering bentrok, susah dilacak, dan bikin pasien menunggu lebih lama dari seharusnya.</p>
              </div>
              <div className="pain">
                <div className="num">03</div>
                <h3>Tidak tahu klinik untung berapa</h3>
                <p>Uang masuk tercatat, tapi margin per tindakan, fee dokter, dan biaya bahan tidak pernah benar-benar dihitung.</p>
              </div>
            </div>
            <div className="arrow-mid">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 4v16M6 14l6 6 6-6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              ApexRecord menyatukan semuanya dalam satu sistem
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="fitur">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Satu platform, semua operasional</span>
              <h2>Semua yang klinik Anda butuhkan, sudah ada di sini.</h2>
              <p>Dari pasien datang sampai laporan ke akuntan — tidak perlu tempel-tempel aplikasi lain.</p>
            </div>
            <div className="feat-grid">
              {FEATURES.map((f) => (
                <div className="feat-card" key={f.title}>
                  <div className="feat-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SPOTLIGHT: LAPORAN KEUANGAN PRO */}
        <section id="laporan-pro">
          <div className="wrap">
            <div className="spotlight">
              <div>
                <span className="eyebrow">Unggulan · Laporan Keuangan Pro</span>
                <h2 className="spot-title">Bukan cuma kasir digital — ini <em>intelijen bisnis</em> klinik Anda.</h2>
                <p className="spot-lead">Ketahui persis dari mana pendapatan datang, kapan jam paling ramai, dan kecamatan mana yang paling banyak mengirim pasien — semua otomatis terhitung dari data yang sudah ada.</p>
                <ul className="spot-list">
                  <li><CheckIcon /><span><b>Unit economics siap pakai</b> — Customer Lifetime Value, CAC, retensi pasien, dan rasio LTV:CAC dihitung otomatis.</span></li>
                  <li><CheckIcon /><span><b>Heatmap jam kunjungan</b> — tahu persis jam &amp; hari tersibuk untuk atur jadwal dokter lebih optimal.</span></li>
                  <li><CheckIcon /><span><b>Peta sebaran asal pasien</b> — bubble map per kecamatan, supaya tahu area mana yang paling potensial digarap.</span></li>
                  <li><CheckIcon /><span><b>Laporan siap kirim</b> — PDF profesional untuk akuntan maupun investor, tinggal unduh.</span></li>
                </ul>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-grad btn-sm">Lihat Laporan Keuangan Pro</a>
              </div>

              <div className="heat-panel">
                <div className="heat-head"><span className="t">Heatmap Jam Kunjungan</span><span className="n">Sen&ndash;Sab</span></div>
                <div className="heat-grid">
                  {Array.from({ length: HEAT_ROWS }).map((_, row) =>
                    HEAT_PATTERN.map((_, col) => (
                      <i key={`${row}-${col}`} style={{ '--o': heatOpacity(row, col) } as React.CSSProperties} />
                    )),
                  )}
                </div>
                <div className="kpi-row">
                  <div className="kpi"><div className="k">LTV Pasien</div><div className="v">Rp 1,8jt</div></div>
                  <div className="kpi"><div className="k">Retensi</div><div className="v">62%</div></div>
                  <div className="kpi"><div className="k">LTV : CAC</div><div className="v">4.1x</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ONBOARDING */}
        <section id="onboarding">
          <div className="wrap">
            <div className="section-head center">
              <span className="eyebrow">Mulai cepat</span>
              <h2>Klinik Anda siap beroperasi dalam 3 langkah</h2>
              <p>Tidak perlu training berhari-hari. Wizard onboarding memandu dari akun baru sampai siap menerima pasien.</p>
            </div>
            <div className="steps">
              <div className="step">
                <span className="step-no">01</span>
                <h3>Lengkapi Info Klinik</h3>
                <p>Nama, alamat, jam operasional, dan logo klinik — tampil otomatis di dokumen dan halaman booking.</p>
              </div>
              <div className="step">
                <span className="step-no">02</span>
                <h3>Atur Tarif Layanan</h3>
                <p>Tambahkan daftar tindakan dan harga. Bisa disesuaikan kapan saja dari halaman pengaturan.</p>
              </div>
              <div className="step">
                <span className="step-no">03</span>
                <h3>Undang Dokter</h3>
                <p>Undang minimal satu dokter, langsung dapat akun login. Klinik pun siap menerima kunjungan pertama.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <PricingSection />

        {/* FAQ */}
        <section id="faq">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Pertanyaan umum</span>
              <h2>Sebelum Anda mulai</h2>
            </div>
            <div className="faq-list">
              {FAQS.map((f) => (
                <details className="faq" key={f.q} open={f.open}>
                  <summary>{f.q}<span className="plus" /></summary>
                  <div className="faq-body">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section>
          <div className="wrap">
            <div className="cta-band">
              <h2>Klinik Anda layak dikelola lebih rapi.</h2>
              <p>Daftar sekarang, aktifkan dalam 10 menit, dan rasakan bedanya di kunjungan pasien pertama.</p>
              <div className="cta-actions">
                <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-white">Mulai Uji Coba Gratis</a>
                <a href="#faq" className="btn btn-ghost">Ada pertanyaan?</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-row">
            <div className="foot-brand">
              <a href="#top" className="brand">
                <span className="brand-mark">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l7 15.5c.9 2-1 4-3 3.2-1.6-.6-2.3-2-2.7-3.5-.5-1.8-1.2-2.9-1.3-3-.1.1-.8 1.2-1.3 3-.4 1.5-1.1 2.9-2.7 3.5-2 .8-3.9-1.2-3-3.2L12 3z" fill="white" />
                  </svg>
                </span>
                <span className="brand-word">Apex<em>Record</em></span>
              </a>
              <p>Platform manajemen klinik Indonesia — rekam medis, operasional, dan laporan bisnis dalam satu sistem untuk klinik dan praktik mandiri.</p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h4>Produk</h4>
                <a href="#fitur">Fitur</a>
                <a href="#laporan-pro">Laporan Keuangan Pro</a>
                <a href="#harga">Harga</a>
              </div>
              <div className="foot-col">
                <h4>Mulai</h4>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer">Masuk</a>
                <a href={APP_URL} target="_blank" rel="noopener noreferrer">Daftar Klinik</a>
                <a href="#faq">FAQ</a>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>&copy; 2026 ApexRecord. Dibangun untuk klinik &amp; praktik mandiri Indonesia.</span>
            <span>Klinik Pratama &middot; Klinik Utama &middot; TPMD &middot; TPMDG</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
