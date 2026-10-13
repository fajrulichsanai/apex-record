# ApexRecord — Bahan Pitch Deck Investor

Sumber: kode ApexRecord (frontend Next.js + backend NestJS), landing page, dan keputusan founder di percakapan (Oktober 2026). Bahasa: Indonesia.

## Perusahaan
- Produk: ApexRecord — software manajemen klinik & praktik mandiri Indonesia (rekam medis, operasional, laporan bisnis, integrasi SATUSEHAT).
- Badan hukum: PT Zanak Developer Abadi, Jl. Jenderal Sudirman No. 7, Payakumbuh, Sumatera Barat.
- Kontak: WhatsApp 0823-8769-6487 · zanakdeveloper@gmail.com · app.apexrecord.my.id
- Target: Klinik Pratama, Klinik Utama, TPMD (praktik mandiri dokter), TPMDG (praktik mandiri dokter gigi).
- Tagline landing page: "Kelola klinik & praktik Anda tanpa drama administrasi." Penutup: "Klinik Anda layak dikelola lebih rapi."

## Masalah
1. Rekam medis tercecer — riwayat tindakan, odontogram, resep tersebar di kertas & chat WhatsApp.
2. Jadwal & antrian manual — booking via telepon/buku sering bentrok, tidak terlacak.
3. Buta angka bisnis — margin per tindakan, fee dokter, piutang tidak pernah dihitung.
4. Tekanan regulasi — RME dan pelaporan SATUSEHAT wajib; SIMRS enterprise terlalu mahal untuk klinik kecil.

## Solusi & alur
Reservasi (booking online & antrian) → Pemeriksaan (SOAP, ICD-10, odontogram) → Billing (cash, transfer, QRIS, asuransi, BPJS, DP & pelunasan) → Laporan (keuangan & BI klinik) → SATUSEHAT (sinkron FHIR).
- Setup < 10 menit dengan wizard onboarding (info klinik → tarif → undang dokter).
- Uji coba gratis 15 hari, tanpa penagihan otomatis.

## Modul produk (sudah live)
Rekam Medis & SOAP (ICD-10 & SNOMED CT, rencana perawatan) · Odontogram digital · Tarif, billing, invoice · Reservasi & recall (cek status via WhatsApp) · Gudang & farmasi · Fee share dokter otomatis · Informed consent digital · Multi-cabang satu dashboard · Audit log · Enkripsi NIK, RBAC, kunci login.

## Keunggulan
1. Terintegrasi SATUSEHAT: onboarding, KYC, sinkronisasi FHIR ke Kemenkes langsung dari aplikasi.
2. Laporan Keuangan Pro: LTV, CAC, retensi pasien, heatmap jam ramai, peta asal pasien per kecamatan, PDF siap kirim ke akuntan/investor.
3. Diagnosis seperti bicara: 18.500+ kode ICD-10 dan 499.000+ konsep SNOMED CT, dicari dengan bahasa sehari-hari ("gigi berlubang", "radang gusi").
4. API website klinik: jam buka, jadwal dokter, layanan, slot kosong, reservasi tampil otomatis di website klinik; API key terkunci per domain, tanpa akses rekam medis.

## Kenapa sekarang
- 2022: Permenkes No. 24/2022 — setiap fasyankes wajib Rekam Medis Elektronik.
- 2023: batas akhir transisi RME; fasyankes diarahkan terhubung SATUSEHAT.
- 2024–26: Kemenkes memonitor keterhubungan fasyankes ke SATUSEHAT.
- Sekarang: klinik kecil & praktik mandiri butuh solusi murah, cepat, sudah patuh.

## Pasar (estimasi bottom-up, perlu validasi)
- TAM ± Rp428 M/tahun: 287 ribu dokter terdaftar KKI (Okt 2024; 46 ribu dokter gigi) × Starter tahunan Rp1,49 jt.
- SAM ± Rp54 M/tahun: ± 18 ribu fasyankes target (7.022 klinik pratama & utama terakreditasi per Feb 2024 + ± 11 ribu praktik mandiri, data 2018) × Pro tahunan Rp2,99 jt.
- SOM 3 tahun ± Rp2,2 M ARR: 1.000 fasyankes berbayar (± 5,5% SAM) × ARPU blended ± Rp2,2 jt/tahun (campuran 50% Starter, 40% Pro, 10% Multi).
- Sumber: KKI via GoodStats (2024); Kemenkes keslan (akreditasi Feb 2024); Kemenkes data praktik mandiri 2018.

## Harga baru (berlaku mulai 1 Januari 2027)
| Paket | Untuk | 1 bulan | 3 bulan | 12 bulan |
|---|---|---|---|---|
| Starter | Praktik mandiri, 1 dokter | Rp149rb | Rp399rb | Rp1,49 jt |
| Pro | Klinik dengan banyak dokter | Rp299rb | Rp799rb | Rp2,99 jt |
| Multi Klinik | Per cabang, minimal 2 cabang | Rp249rb | Rp669rb | Rp2,49 jt |
| + Dashboard owner | Sekali per grup klinik | Rp149rb | Rp399rb | Rp1,49 jt |
- 3 bulan hemat ± 10%; 12 bulan = bayar 10 bulan + bonus fitur custom 1 tahun.

## Promo peluncuran: harga lama hingga 31 Desember 2026
| Paket | Harga lama /bulan | Harga baru /bulan | Hemat | 3 bulan | 12 bulan |
|---|---|---|---|---|---|
| Starter | Rp99rb | Rp149rb | 34% | Rp269rb | Rp990rb |
| Pro | Rp149rb | Rp299rb | 50% | Rp399rb | Rp1,49 jt |
| Multi Klinik (per klinik) | Rp149rb | Rp249rb | 40% | Rp399rb | Rp1,49 jt |
- Multi Klinik promo + Rp99rb admin owner. Berlaku untuk pendaftaran & perpanjangan hingga 31 Des 2026.
- Tujuan: urgensi (tenggat 1 Jan 2027), menarik early adopter sebagai studi kasus & referral, ARPU naik ± 2x mulai 2027 tanpa ubah produk.

## Layanan tambahan
- Pembuatan Landing Page Klinik: harga custom, mulai Rp1 jt; wajib chat admin dulu (WhatsApp 0823-8769-6487). Desain sesuai identitas klinik; jadwal dokter & reservasi tersinkron lewat API ApexRecord.
- Migrasi data pasien: dari Excel/sistem lama, biaya sesuai volume data.
- Fitur custom: gratis 1 tahun untuk paket tahunan, selebihnya berbayar.

## Struktur biaya (bulanan saat ini)
- Server Rp150.000 · Domain Rp100rb/tahun ≈ Rp8.300/bulan · Claude (R&D pengembangan) Rp400.000 · Total ± Rp558rb/bulan (± Rp6,7 jt/tahun), belum termasuk gaji tim.
- Balik modal biaya bulanan: 4 klinik Starter, atau 2 klinik Pro; 6 klinik selama promo Rp99rb.
- Margin kotor > 85% (asumsi server bertambah ± tiap 50 klinik).

## Kompetisi (per kategori)
| | ApexRecord | SIMRS enterprise | Aplikasi kasir/POS klinik | Kertas + Excel + WA |
|---|---|---|---|---|
| Harga/bulan | Mulai Rp149rb | Jutaan + implementasi | Murah | "Gratis" |
| Setup | < 10 menit, self-serve | Berminggu-minggu | Cepat | — |
| Rekam medis + odontogram | Ya | Ya | Tidak | Tidak |
| Integrasi SATUSEHAT | Ya | Ya | Tidak | Tidak |
| Analitik bisnis (LTV, CAC, heatmap) | Ya | Sebagian | Tidak | Tidak |
| API website & reservasi online | Ya | Sebagian | Tidak | Tidak |

## Traksi
- 1 klinik pilot: Zanak Dental Care (klinik milik tim founder), 110 pasien tercatat dalam 2 bulan, dipakai setiap hari.
- 47 modul backend live (NestJS + MySQL); 60+ halaman aplikasi web (Next.js).
- Sudah live: rekam medis, odontogram, billing, farmasi, gudang; integrasi SATUSEHAT (onboarding, KYC, FHIR); langganan & pembayaran otomatis; multi-klinik; keamanan (enkripsi NIK, audit log, RBAC).
- Langkah berikut: 3–5 klinik eksternal ikut uji coba sebelum akhir 2026.

## Go-to-market
1. Beachhead klinik gigi (odontogram & fee share dokter), mulai Sumatera Barat lalu Sumatera.
2. Komunitas profesi: PDGI/IDI cabang, seminar SATUSEHAT & RME, webinar akreditasi.
3. Referral antar-klinik & reseller lokal per kota.
4. Promo harga lama s.d. 31 Des 2026, demo gratis, uji coba 15 hari, konten edukasi.

## Proyeksi (ilustratif, data skenario)
- Fasyankes berbayar akhir tahun: Tahun 1 = 100, Tahun 2 = 400, Tahun 3 = 1.000.
- ARR: Rp0,22 M → Rp0,88 M → Rp2,2 M (ARPU blended ± Rp2,2 jt/tahun, churn tahunan < 15%; belum termasuk website klinik & layanan custom).

## Roadmap
- Q4 2026 – Q1 2027 (Perkuat inti): 3–5 klinik pilot eksternal, peralihan ke harga baru, audit keamanan & migrasi data.
- Q2 – Q3 2027 (Tumbuh): integrasi BPJS (P-Care), aplikasi mobile dokter, ekspansi seluruh Sumatera.
- Q4 2027 – 2028 (Ekosistem): portal & aplikasi pasien, asisten AI untuk SOAP & coding, marketplace bahan medis.

## Tim (2 orang)
- drg. Muhammad Daffa Safra — Founder & CEO. Dokter gigi praktisi; arah produk, kemitraan komunitas profesi, penjualan ke klinik.
- Fajrul Ichsan Kamil — CTO. Membangun seluruh platform: Next.js, NestJS, MySQL, integrasi SATUSEHAT (FHIR).
- Founder-market fit: produk diuji setiap hari di klinik pilot Zanak Dental Care.

## Pendanaan
- Minimal Rp1 M untuk 18 bulan (runway ± Rp55 jt/bulan), cair dalam 2 tahap:
  - Tahap 1: Rp500 jt saat penandatanganan perjanjian.
  - Tahap 2: Rp500 jt saat target tercapai (usulan: 30 klinik berbayar).
- Alokasi: Tim (gaji founder + 1 sales + 1 CS) Rp500 jt · Sales & marketing Rp250 jt · Produk & infrastruktur Rp100 jt · Cadangan Rp100 jt · Legal & kepatuhan (PSE, merek, UU PDP) Rp50 jt.

## Struktur investasi (draf term sheet)
- 10% saham diambil dari porsi saham founder (bukan saham baru) untuk Rp1 M → valuasi implisit Rp10 M.
- Hak investor: saham biasa 10% & dividen proporsional; laporan bulanan (klinik, MRR, pemakaian dana) & keuangan kuartalan; 1 kursi komisaris/pengamat; hak didahulukan saat penerbitan saham baru; hak veto keputusan besar & tag-along.
- Kewajiban investor: setor dana 2 tahap sesuai jadwal; kerahasiaan (NDA); tanpa akses data rekam medis pasien (UU PDP No. 27/2022); tidak campur operasional harian; lock-up 24 bulan, tidak menjual ke pesaing.
- Komitmen founder: seluruh dana disalurkan ke kas PT untuk operasional; penggunaan dana sesuai alokasi; kode program & merek ApexRecord milik PT; founder full-time & non-compete; laporan transparan & akses audit.
- Catatan: pengalihan saham mengikuti akta notaris, persetujuan RUPS, pengesahan Kemenkumham.

## Identitas visual (dari landing page app/landingpage/landingpage.css)
- Latar #EEECE6 / #FAF9F6, permukaan #FFFFFF, teks #17160F, teks sekunder #55534A / #6B695D.
- Aksen hijau #367D2F, hijau terang #7ED957, hijau lembut #E3F3DA, hijau tua #2B6B22.
- Bahaya #C1381F / #FBE1DE; peringatan #8A5A00 / #FCEACB.
- Mode gelap: latar #17160F, permukaan #242320, teks #F3F1EA.
- Font landing: Inter Tight (display), Inter (body), JetBrains Mono. Logo: public/logo-apex-record.png (huruf A biru dengan gigi).
