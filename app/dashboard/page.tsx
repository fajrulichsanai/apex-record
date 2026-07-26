'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import GreetingBanner from '@/components/dashboard/GreetingBanner';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ModuleHighlights from '@/components/dashboard/ModuleHighlights';
import BottomGrid from '@/components/dashboard/BottomGrid';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <FeatureGuard feature="dashboard">
        <main className="content">
          <GreetingBanner />
          <StatsGrid />
          <ModuleHighlights />
          <BottomGrid />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
