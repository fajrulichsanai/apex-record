'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { FiCloud } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useFeatures } from '@/lib/features-context';
import '@/app/styles/satusehat.css';

/**
 * Selama integrasi SATUSEHAT belum diaktifkan untuk faskes ini (diatur super
 * admin; akses SATUSEHAT masih dalam pengajuan), semua halaman /satusehat/* diganti satu halaman
 * informasi. Halaman aslinya tidak dimuat, jadi tidak ada panggilan API.
 */
export default function SatusehatGroupLayout({ children }: { children: ReactNode }) {
  const { satusehatPending, ready } = useFeatures();

  if (!ready) return <div className="dashboard-auth-loading">Memuat…</div>;
  if (!satusehatPending) return <>{children}</>;

  return (
    <DashboardLayout>
      <main className="content ss-page">
        <div className="ss-header">
          <div>
            <h1>SATUSEHAT</h1>
            <p>Integrasi dengan platform Kementerian Kesehatan RI.</p>
          </div>
        </div>
        <div className="ss-card ss-pending">
          <span className="ss-pending-icon" aria-hidden="true">
            <FiCloud />
          </span>
          <h2>Segera hadir — belum diaktifkan untuk klinik Anda</h2>
          <p>
            Akses resmi ke SATUSEHAT sedang dalam proses pengajuan. Integrasi diaktifkan oleh admin ApexRecord per
            faskes setelah akses disetujui, dan selama itu belum ada data yang dikirim ke SATUSEHAT.
          </p>
          <ul>
            <li>Pasien, kunjungan, rekam medis, resep, billing, dan laporan berjalan seperti biasa.</li>
            <li>Data klinis Anda tetap tersimpan lengkap di ApexRecord.</li>
            <li>Hubungi admin ApexRecord bila klinik Anda sudah siap mengaktifkan integrasi SATUSEHAT.</li>
          </ul>
          <Link href="/dashboard" className="ss-btn primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    </DashboardLayout>
  );
}
