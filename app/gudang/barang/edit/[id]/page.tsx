'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { gudangApi, type Barang } from '@/lib/gudang';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import BarangForm from '../../BarangForm';

export default function EditBarangPage() {
  const params = useParams();
  const router = useRouter();
  const { error } = useToast();
  const [barang, setBarang] = useState<Barang | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) return;
    gudangApi
      .getBarang(id)
      .then(setBarang)
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Gagal memuat data barang';
        error(message);
        router.push('/gudang/barang');
      })
      .finally(() => setLoading(false));
  }, [params.id, error, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <main className="content gudang-page">
          <div className="empty-list">
            <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
            <div className="empty-title">Memuat data barang...</div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!barang) return null;

  return <BarangForm mode="edit" initial={barang} />;
}
