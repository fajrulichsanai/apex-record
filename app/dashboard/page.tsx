'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import GreetingBanner from '@/components/dashboard/GreetingBanner';
import OnboardingBanner from '@/components/dashboard/OnboardingBanner';
import StatsGrid from '@/components/dashboard/StatsGrid';
import VisitTrendChart from '@/components/dashboard/VisitTrendChart';
import RevenueTrendChart from '@/components/dashboard/RevenueTrendChart';
import DoctorPerformanceChart from '@/components/dashboard/DoctorPerformanceChart';
import PatientMixChart from '@/components/dashboard/PatientMixChart';
import TopListChart from '@/components/dashboard/TopListChart';
import BottomGrid from '@/components/dashboard/BottomGrid';
import { reportsApi, VisitReportResponse, FinancialReportResponse } from '@/lib/reports';
import '@/components/dashboard/dashboard-charts.css';

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [visits, setVisits] = useState<VisitReportResponse | null>(null);
  const [financial, setFinancial] = useState<FinancialReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    const query = { dateFrom: toIsoDate(from), dateTo: toIsoDate(today) };

    Promise.all([
      reportsApi.getVisits(query).catch(() => null),
      isOwner ? reportsApi.getFinancial(query).catch(() => null) : Promise.resolve(null),
    ]).then(([visitsRes, financialRes]) => {
      if (cancelled) return;
      setVisits(visitsRes);
      setFinancial(financialRes);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const topProcedureItems = (visits?.procedureMix.topProcedures ?? [])
    .slice(0, 5)
    .map((p) => ({ label: p.tarifName, value: p.count }));

  const topTindakanItems = [...(financial?.tindakanTerlaris ?? [])]
    .sort((a, b) => b.frekuensi - a.frekuensi)
    .slice(0, 5)
    .map((t) => ({ label: t.namaTindakan, value: t.frekuensi }));

  return (
    <DashboardLayout>
      <FeatureGuard feature="dashboard">
        <main className="content">
          <GreetingBanner />
          <OnboardingBanner />
          <StatsGrid
            revenueTrendPercent={isOwner ? financial?.comparison.changePercent : undefined}
            visitsTrendPercent={visits?.comparison.changePercent}
          />

          <div className="dashboard-chart-row">
            <VisitTrendChart data={visits?.byDay ?? []} loading={loading} />
            {isOwner ? (
              <RevenueTrendChart data={financial?.byDay ?? []} loading={loading} />
            ) : (
              <TopListChart
                title="Prosedur Terbanyak"
                subtitle="30 hari terakhir · berdasarkan jumlah"
                items={topProcedureItems}
                valueFormatter={(v) => `${v}x`}
                loading={loading}
              />
            )}
          </div>

          <div className="dashboard-chart-row">
            <DoctorPerformanceChart
              mode={isOwner ? 'revenue' : 'count'}
              data={
                isOwner
                  ? (financial?.byDoctor ?? []).map((d) => ({
                      label: d.practitionerName,
                      primary: d.revenue,
                      secondary: d.doctorFeeShare,
                    }))
                  : (visits?.byDoctor ?? []).map((d) => ({ label: d.practitionerName, primary: d.count }))
              }
              loading={loading}
            />
            <PatientMixChart data={visits?.demographics.newVsReturning ?? null} loading={loading} />
          </div>

          {isOwner && (
            <div className="dashboard-chart-row single">
              <TopListChart
                title="Tindakan Terlaris"
                subtitle="30 hari terakhir · berdasarkan frekuensi"
                items={topTindakanItems}
                valueFormatter={(v) => `${v}x`}
                loading={loading}
              />
            </div>
          )}

          <BottomGrid />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
