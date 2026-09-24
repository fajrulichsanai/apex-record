'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type GudangDashboard } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';
import GudangTabs from './GudangTabs';
import '../styles/gudang.css';

export default function GudangDashboardPage() {
  const { error } = useToast();
  const [dashboard, setDashboard] = useState<GudangDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await gudangApi.getDashboard();
      setDashboard(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Gagal memuat dashboard gudang';
      error(message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <FeatureGuard feature="gudang">
      <main className="content gudang-page">
        <GudangTabs active="dashboard" />

        <div className="page-header">
          <div className="page-title-block">
            <div className="page-title">
              <h1>Dashboard Gudang</h1>
            </div>
            <p className="page-subtitle">Ringkasan stok, nilai inventory, dan peringatan stok kritis.</p>
          </div>
        </div>

        {loading || !dashboard ? (
          <div className="empty-list">
            <div className="empty-icon-wrap"><span className="material-symbols-rounded">hourglass_empty</span></div>
            <div className="empty-title">Memuat data dashboard...</div>
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card total">
                <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span></div>
                <div className="stat-info">
                  <div className="stat-value">{dashboard.totalItems}</div>
                  <div className="stat-label">Total Barang Aktif</div>
                </div>
              </div>
              <div className="stat-card margin">
                <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span></div>
                <div className="stat-info">
                  <div className="stat-value">Rp {dashboard.totalInventoryValue.toLocaleString('id-ID')}</div>
                  <div className="stat-label">Nilai Total Inventory</div>
                </div>
              </div>
              <div className="stat-card termahal">
                <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span></div>
                <div className="stat-info">
                  <div className="stat-value">{dashboard.lowStockCount}</div>
                  <div className="stat-label">Stok Kritis</div>
                  <div className="stat-sub">di bawah stok minimum</div>
                </div>
              </div>
              <div className="stat-card durasi">
                <div className="stat-icon"><span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>event_busy</span></div>
                <div className="stat-info">
                  <div className="stat-value">{dashboard.nearExpiryCount}</div>
                  <div className="stat-label">Mendekati Expired</div>
                  <div className="stat-sub">dalam 30 hari</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-sort">
                <span className="sort-label">Barang dengan Stok Kritis</span>
              </div>

              {dashboard.lowStockItems.length === 0 ? (
                <div className="empty-list">
                  <div className="empty-icon-wrap"><span className="material-symbols-rounded">check_circle</span></div>
                  <div className="empty-title">Semua stok aman</div>
                  <div className="empty-sub">Tidak ada barang di bawah stok minimum saat ini</div>
                </div>
              ) : (
                <div className="gudang-table-wrap">
                  <table className="gudang-table">
                    <thead>
                      <tr>
                        <th>Nama Barang</th>
                        <th>SKU</th>
                        <th>Stok Saat Ini</th>
                        <th>Stok Minimum</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.lowStockItems.map((item) => (
                        <tr key={item.id}>
                          <td className="gudang-name">{item.name}</td>
                          <td>{item.sku}</td>
                          <td>
                            <span className="gudang-margin">
                              <span className="material-symbols-rounded" style={{ fontSize: 14 }}>warning</span>
                              {item.stokSaatIni}
                            </span>
                          </td>
                          <td>{item.stokMinimum}</td>
                          <td>
                            <Link href="/gudang/transaksi" className="btn-outline" style={{ display: 'inline-flex' }}>
                              Stock In
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
