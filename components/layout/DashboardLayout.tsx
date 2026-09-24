'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import './dashboard-layout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Every page that renders this layout is auth-gated. Without this, opening
  // a protected URL directly (no token) rendered the page and its children
  // right away — each child's own data fetch then failed with 401 one by
  // one, surfacing as scattered "unauthorized" errors instead of a single
  // upfront redirect to login.
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="dashboard-auth-loading">Memuat…</div>;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-wrapper">
      {sidebarOpen && (
        <div
          className="sidebar-overlay show"
          onClick={closeSidebar}
          role="presentation"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="main-container">
        <Navbar onMenuClick={toggleSidebar} />
        {children}
      </div>
    </div>
  );
}
