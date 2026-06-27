'use client';

import PrivateRoute from '@/components/PrivateRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GreetingBanner from '@/components/dashboard/GreetingBanner';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ModuleHighlights from '@/components/dashboard/ModuleHighlights';
import BottomGrid from '@/components/dashboard/BottomGrid';

export default function DashboardPage() {
  return (
    <PrivateRoute>
      <DashboardLayout>
        <main className="content">
          <GreetingBanner />
          <StatsGrid />
          <ModuleHighlights />
          <BottomGrid />
        </main>
      </DashboardLayout>
    </PrivateRoute>
  );
}
