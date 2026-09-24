'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import MonthlyReportPanel from '../share-fee-dokter/MonthlyReportPanel';
import '../../styles/share-fee-dokter.css';

/**
 * Dokter's own restricted view of the doctor fee-share report — same monthly
 * breakdown as the owner/admin "Share Fee Dokter" page, but scoped to just
 * the logged-in dokter's own tindakan (enforced server-side, see
 * reports.controller.ts) and without the fee-configuration tab, since rate
 * configuration stays an owner-only privilege.
 */
export default function ShareFeeSayaPage() {
  return (
    <DashboardLayout>
      <FeatureGuard feature="share-fee-saya">
        <main className="content share-fee-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Share Fee Saya</h1>
              </div>
              <p className="page-subtitle">
                Rincian share fee bulanan Anda per tindakan yang sudah dikerjakan.
              </p>
            </div>
          </div>

          <MonthlyReportPanel selfView />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
