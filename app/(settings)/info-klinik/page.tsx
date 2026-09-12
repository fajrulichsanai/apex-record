'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ClinicInfoForm from '@/components/clinic/ClinicInfoForm';
import { clinicApi } from '@/lib/clinic';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import { useSubscriptionGate } from '@/lib/subscription-gate-context';

function formatSubscriptionDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SubscriptionCard() {
  const { subscription, daysUntilExpiry } = useSubscriptionGate();
  const subscriptionActive =
    !!subscription && subscription.status === 'active' && new Date(subscription.endDate) >= new Date(new Date().toDateString());

  return (
    <div className="card">
      <div className="card-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Langganan
      </div>
      <div className="card-body">
        {subscription ? (
          <>
            <div className="subscription-status-row">
              <span className={`sub-tag ${subscriptionActive ? 'sub-tag-active' : 'sub-tag-expired'}`}>
                {subscriptionActive ? 'Aktif' : 'Kadaluarsa'}
              </span>
              <span className="subscription-plan">{subscription.plan?.name || '-'}</span>
            </div>
            <div className="subscription-period">
              Masa berlaku: {formatSubscriptionDate(subscription.startDate)} &ndash; {formatSubscriptionDate(subscription.endDate)}
            </div>
            {subscriptionActive && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
              <p className="subscription-hint warning">Akan berakhir dalam {daysUntilExpiry} hari</p>
            )}
            {!subscriptionActive && (
              <p className="subscription-hint expired">Perpanjang langganan agar dapat menambah, mengubah, atau menghapus data</p>
            )}
            <Link href="/langganan" className="subscription-link">
              Kelola Langganan &rarr;
            </Link>
          </>
        ) : (
          <>
            <p className="subscription-hint expired">Klinik Anda belum memiliki langganan aktif.</p>
            <Link href="/langganan" className="subscription-link">
              Kelola Langganan &rarr;
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function InfoKlinikPage() {
  const { user } = useAuth();
  const viewOnly = isFeatureViewOnly(user?.role, 'info-klinik');

  return (
    <DashboardLayout>
      <FeatureGuard feature="info-klinik">
        <main className="content">
          <ClinicInfoForm
            canEdit={!viewOnly}
            fetchClinic={clinicApi.get}
            updateClinic={clinicApi.update}
            uploadLogo={clinicApi.uploadLogo}
            rightColumnExtra={<SubscriptionCard />}
          />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
