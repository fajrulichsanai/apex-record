/**
 * Judul halaman di bar atas, dari rute (prefix terpanjang yang cocok).
 * Satu tempat agar setiap halaman tidak perlu mengirim judulnya sendiri.
 */
const TITLES: [string, string][] = [
  ['/super-admin/dashboard', 'Dashboard'],
  ['/super-admin/reports', 'Laporan'],
  ['/super-admin/clinics', 'Klinik'],
  ['/super-admin/users', 'Pengguna'],
  ['/super-admin/multi-clinic-owners', 'Multi-Klinik Owner'],
  ['/super-admin/payments', 'Konfirmasi Pembayaran'],
  ['/super-admin/plans', 'Paket Langganan'],
  ['/super-admin/satusehat/sarana', 'Master Sarana (MSI)'],
  ['/super-admin/satusehat/wilayah', 'Master Wilayah'],
  ['/super-admin/satusehat', 'Status Integrasi SATUSEHAT'],
  ['/super-admin/data-requests', 'Permintaan Data'],
  ['/super-admin/penghapusan-data', 'Penghapusan Data'],
  ['/super-admin/audit-log', 'Log Aktivitas'],
  ['/super-admin/pengaturan', 'Pengaturan Platform'],
  ['/multi-klinik/dashboard', 'Dashboard Multi-Klinik'],
  ['/multi-klinik/langganan', 'Langganan'],
  ['/multi-klinik/laporan', 'Laporan'],
  ['/multi-klinik/info-klinik', 'Info Klinik'],
  ['/multi-klinik', 'Multi-Klinik'],
  ['/dashboard', 'Dashboard'],
  ['/list-pasien', 'Pasien'],
  ['/list-kunjungan', 'Kunjungan'],
  ['/reservasi', 'Reservasi'],
  ['/farmasi', 'Farmasi'],
  ['/transaksi', 'Transaksi'],
  ['/tarif', 'Tarif & Tindakan'],
  ['/gudang', 'Gudang'],
  ['/laporan-keuangan-pro', 'Laporan Keuangan'],
  ['/laporan-keuangan', 'Laporan Keuangan'],
  ['/laporan-kunjungan', 'Laporan Kunjungan'],
  ['/catat-operasional', 'Biaya Operasional'],
  ['/recall-reminder', 'Recall Pasien'],
  ['/share-fee-dokter', 'Jasa Dokter'],
  ['/penggajian', 'Penggajian'],
  ['/share-fee-saya', 'Jasa Saya'],
  ['/absensi', 'Absensi'],
  ['/kehadiran', 'Kehadiran Pegawai'],
  ['/konten', 'Konten'],
  ['/satusehat', 'SATUSEHAT'],
  ['/referral', 'Rujukan'],
  ['/langganan', 'Langganan'],
  ['/user-management', 'User Management'],
  ['/info-klinik', 'Info Klinik'],
  ['/api-klinik', 'API'],
  ['/audit-log', 'Log Aktivitas'],
  ['/data-privasi', 'Data & Privasi'],
  ['/persetujuan', 'Persetujuan'],
  ['/tampilan', 'Tampilan'],
  ['/pengaturan', 'Pengaturan'],
  ['/onboarding', 'Onboarding'],
  ['/ganti-password', 'Ganti Password'],
];

export function pageTitleFor(pathname: string | null | undefined): string {
  if (!pathname) return 'Dashboard';
  let best: [string, string] | null = null;
  for (const entry of TITLES) {
    const [prefix] = entry;
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) {
      best = entry;
    }
  }
  return best ? best[1] : 'Dashboard';
}
