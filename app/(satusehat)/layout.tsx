'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { FiCloud } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useFeatures } from '@/lib/features-context';
import '@/app/styles/satusehat.css';

/**
 * Selama integrasi SATUSEHAT belum diaktifkan di platform (masih dalam
 * proses pengajuan), semua halaman /satusehat/* diganti satu halaman
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
          <h2>Segera hadir — sedang dalam proses pengajuan</h2>
          <p>
            ApexRecord sedang mengurus akses resmi ke SATUSEHAT. Selama proses ini berjalan, pengiriman data ke
            SATUSEHAT belum diaktifkan.
          </p>
          <ul>
            <li>Pasien, kunjungan, rekam medis, resep, billing, dan laporan berjalan seperti biasa.</li>
            <li>Data klinis Anda tetap tersimpan lengkap di ApexRecord.</li>
            <li>Kami akan memberi tahu Anda begitu integrasi SATUSEHAT dapat dipakai.</li>
          </ul>
          <Link href="/dashboard" className="ss-btn primary">
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    </DashboardLayout>
  );
}
