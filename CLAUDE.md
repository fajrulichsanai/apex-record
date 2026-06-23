# ApexRecord

Sistem manajemen klinik/rumah sakit dengan integrasi Satu Sehat (Kemenkes).

## Arsitektur

- **Frontend (repo ini)**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
  - Lokasi: `/Users/fajrulichsankamil/Desktop/Project/apex-record`
- **Backend**: NestJS + TypeORM + MySQL (repo terpisah)
  - Lokasi: `/Users/fajrulichsankamil/Desktop/Project/Satu Sehat Integration `
- **Integrasi**: Satu Sehat (FHIR-based, dari Kementerian Kesehatan RI) — dipanggil dari sisi Backend (NestJS)

## Struktur Frontend

- `app/` — routing Next.js App Router
  - `(pasien)/`, `(kunjungan)/`, `(settings)/` — route groups per fitur
  - `dashboard/`, `transaksi/`, `tarif/`, `laporan-keuangan/`, `laporan-kunjungan/`, `user-management/`, `verify-email/`
  - `api/` — route handler Next.js (proxy/BFF ke backend NestJS bila diperlukan)
- `components/` — komponen UI reusable
- `lib/` — helper, client API, util
- `middleware.ts` — middleware auth/route guard

## Fitur Utama

- Login & verifikasi email
- Manajemen pasien & kunjungan
- Transaksi & tarif layanan
- Laporan keuangan & laporan kunjungan
- User management (role-based)
- Dashboard ringkasan

## Catatan Penting

- Frontend hanya mengonsumsi API dari backend NestJS — jangan implementasi logika bisnis Satu Sehat di sisi frontend.
- Autentikasi memakai token dari backend; cek `middleware.ts` dan `lib/` untuk pola fetch & guard route.
- Saat menambah halaman baru, ikuti pola route group yang sudah ada (mis. `(pasien)`, `(kunjungan)`).

## Menjalankan Project

```bash
npm run dev    # dev server (localhost:3000)
npm run build
npm run lint
```
