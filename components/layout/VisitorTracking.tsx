'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Halaman publik (sebelum login) yang boleh dihitung oleh s0data. */
const PUBLIC_PATHS = [
  '/',
  '/landingpage',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/kebijakan-privasi',
  '/kebijakan-refund',
  '/syarat-ketentuan',
];

/**
 * Tracker s0data ikut mencatat navigasi SPA (pushState) dan teks tombol yang
 * diklik. Semua halaman internal dikecualikan agar data klinik/pasien tidak
 * ikut terkirim setelah pengunjung login dari halaman publik.
 */
const EXCLUDE = [
  '/dashboard*', '/list-pasien*', '/list-kunjungan*', '/reservasi*', '/recall-reminder*',
  '/farmasi*', '/gudang*', '/tarif*', '/transaksi*', '/laporan-*', '/share-fee-*',
  '/catat-operasional*', '/user-management*', '/pengaturan*', '/info-klinik*', '/tampilan*',
  '/api-klinik*', '/audit-log*', '/data-privasi*', '/konten*', '/satusehat*', '/onboarding*',
  '/langganan*', '/multi-klinik*', '/super-admin*', '/referral*', '/demo*', '/files*', '/v1*', '/api*',
].join(',');

const SCRIPT_ID = 's0data-tracker';

/** Pasang script s0data hanya saat pengunjung membuka halaman publik. */
export default function VisitorTracking() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PUBLIC_PATHS.includes(pathname) || document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.defer = true;
    s.src = 'https://s0data.web.app/s/v1.js';
    s.setAttribute('data-site', 'sd_live_kmpdCirv2k');
    s.setAttribute('data-exclude', EXCLUDE);
    document.head.appendChild(s);
  }, [pathname]);

  return null;
}
