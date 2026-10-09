'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import TarifBulkForm from '@/components/tarif/TarifBulkForm';
import { tarifApi } from '@/lib/tarif';
import '../../styles/tarif.css';

/**
 * Tambah tarif per rumpun: kategori bidang → tindakan (nama, deskripsi,
 * modal, jual) → tambah tindakan lain di bidang yang sama.
 */
export default function CreateTarifPage() {
  const router = useRouter();
  const [knownKategori, setKnownKategori] = useState<string[]>([]);

  useEffect(() => {
    tarifApi
      .list({ limit: 100 })
      .then((r) => setKnownKategori(Array.from(new Set((r.data ?? []).map((t) => t.kategori).filter(Boolean)))))
      .catch(() => setKnownKategori([]));
  }, []);

  return (
    <DashboardLayout>
      <FeatureGuard feature="tarif" requireWrite>
        <main className="content tarif-page">
          <div className="breadcrumb">
            <Link href="/tarif">Master Data</Link>
            <span aria-hidden="true" className="material-symbols-rounded">chevron_right</span>
            <Link href="/tarif">Tarif</Link>
            <span aria-hidden="true" className="material-symbols-rounded">chevron_right</span>
            <span className="breadcrumb-current">Tambah Baru</span>
          </div>

          <div className="form-header">
            <h1>Tambah Tarif Baru</h1>
            <p className="page-subtitle">
              Pilih kategori bidang (mis. Ortodonti), lalu isi tindakan di dalamnya — nama, deskripsi, harga modal &amp;
              jual. Tindakan lain di bidang yang sama bisa ditambah sekaligus.
            </p>
          </div>

          <div className="form-panel tarif-bulk-panel">
            <TarifBulkForm
              knownKategori={knownKategori}
              submitLabel="Simpan Semua Tarif"
              onCancel={() => router.push('/tarif')}
              onSaved={() => router.push('/tarif')}
            />
          </div>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
