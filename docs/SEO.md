# SEO ApexRecord

Target: muncul di halaman 1 Google untuk pencarian seperti **"sim klinik"**,
**"rekam medis elektronik"**, **"RME / E-RM"**, **"aplikasi klinik"**,
**"aplikasi klinik gigi"**. Peringkat tidak bisa dijamin: kode hanya
menyiapkan fondasinya, sisanya konten dan tautan masuk (lihat "Di luar kode").

## Cara situs dipetakan (nginx di VPS, tidak ada di repo)

| Alamat | Isi |
| --- | --- |
| `apexrecord.my.id/` (dan `www.`) | Landing page = `/landingpage` |
| semua path lain di `apexrecord.my.id` | 301 ke `app.apexrecord.my.id/<path>` |
| `app.apexrecord.my.id` | Aplikasi (login, dashboard) |
| `staging.apexrecord.my.id` | Staging |

Karena itu hanya **satu halaman** yang bisa diindeks di domain utama (`/`).

## Yang sudah ada di kode

- `app/landingpage/page.tsx`: title, description, keywords, canonical
  (`https://apexrecord.my.id/`), Open Graph + Twitter card, dan JSON-LD
  (Organization, WebSite, SoftwareApplication, FAQPage).
- `app/landingpage/faqs.ts`: FAQ dipakai halaman **dan** FAQPage JSON-LD. Enam
  pertanyaan pertama memang menyasar kata kunci (SIM klinik, RME/E-RM, wajib
  RME, klinik gigi, harga). Ubah di satu tempat ini saja.
- H1 hero memuat "Aplikasi SIM Klinik & Rekam Medis Elektronik".
- `app/robots.ts` dan `app/sitemap.ts`. robots.txt **tidak boleh** memblokir
  apa pun, karena `apexrecord.my.id/robots.txt` dialihkan ke host `app.` dan
  Google memakai berkas hasil alihan itu untuk kedua host.
- `next.config.ts`: header `X-Robots-Tag: noindex` untuk host `staging.`,
  `app.`, `api.` (kecuali `/landingpage`). Mencegah halaman duplikat/login
  bersaing dengan landing.
- `<html lang="id">`, `metadataBase`, gambar pratinjau `public/og-image.png`
  (1200×630).

## Perlu dikerjakan di VPS (nginx)

Tanpa ini robots.txt, sitemap, dan gambar pratinjau diambil lewat alihan ke host
`app.`. Itu masih bekerja, tetapi bukan praktik terbaik. Pola yang disarankan
untuk server `apexrecord.my.id` / `www.apexrecord.my.id` (sesuaikan alamat dan
port Next.js yang dipakai sekarang):

```nginx
# www -> domain utama (satu alamat saja)
server {
  listen 443 ssl; server_name www.apexrecord.my.id;
  # ssl_certificate ... (tetap seperti sekarang)
  return 301 https://apexrecord.my.id$request_uri;
}

server {
  listen 443 ssl; server_name apexrecord.my.id;
  # ssl_certificate ... (tetap seperti sekarang)

  location = /               { proxy_pass http://127.0.0.1:3000/landingpage; include proxy_params; }
  location = /robots.txt     { proxy_pass http://127.0.0.1:3000/robots.txt;  include proxy_params; }
  location = /sitemap.xml    { proxy_pass http://127.0.0.1:3000/sitemap.xml; include proxy_params; }
  location = /og-image.png   { proxy_pass http://127.0.0.1:3000/og-image.png; include proxy_params; }
  location = /logo-apex-record.png { proxy_pass http://127.0.0.1:3000/logo-apex-record.png; include proxy_params; }
  location /_next/           { proxy_pass http://127.0.0.1:3000; include proxy_params; }

  # sisanya tetap seperti sekarang
  location / { return 301 https://app.apexrecord.my.id$request_uri; }
}
```

`proxy_params` harus meneruskan `Host` dan `X-Forwarded-Host`
(`proxy_set_header Host $host;`). Setelah menerapkan: `nginx -t && systemctl reload nginx`.

## Di luar kode (menentukan peringkat)

1. **Google Search Console**: daftarkan *Domain property* `apexrecord.my.id`
   (verifikasi DNS), kirim `https://apexrecord.my.id/sitemap.xml`, lalu "Request
   indexing" untuk `/`. Pasang juga Bing Webmaster Tools.
2. **Google Business Profile** untuk PT Zanak Developer Abadi (Payakumbuh).
3. **Tautan masuk**: direktori software/startup Indonesia, artikel tamu di blog
   kesehatan/klinik, komunitas dokter gigi/klinik, media sosial.
4. **Konten**: halaman khusus per kata kunci (mis. `/sim-klinik`,
   `/rekam-medis-elektronik`, `/aplikasi-klinik-gigi`) dan artikel panduan
   (Permenkes 24/2022, cara beralih ke RME, memilih SIM klinik). Tambahkan ke
   `app/sitemap.ts` setelah nginx menyajikannya langsung di domain utama.
5. **Kecepatan** (Core Web Vitals): landing masih memuat font Google dan
   komponen klien; `Cache-Control: no-store` berlaku untuk landing.
6. Ukur: Search Console (impresi, klik, posisi per kata kunci) tiap minggu.

## Catatan konten

- Jangan menulis klaim yang belum benar. Mis. daftar fitur paket menyebut
  "Terhubung SATUSEHAT Kemenkes" padahal akses SATUSEHAT masih dalam pengajuan.
- Hero menulis "Mulai dari Rp150rb/bulan", sedangkan harga promo Starter di
  bagian Harga adalah Rp99.000. Samakan.
