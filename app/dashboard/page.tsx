'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import GreetingBanner from '@/components/dashboard/GreetingBanner';
import StatsGrid from '@/components/dashboard/StatsGrid';
import BottomGrid from '@/components/dashboard/BottomGrid';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <main className="content">
        <GreetingBanner />
        <StatsGrid />
        <BottomGrid />
      </main>
    </DashboardLayout>
  );
}
