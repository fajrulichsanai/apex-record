'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Navbar from './Navbar';
import MultiClinicSidebar from './MultiClinicSidebar';
import MultiClinicGuard from '@/components/auth/MultiClinicGuard';
import { useEscapeKey } from '@/lib/a11y';
import './dashboard-layout.css';

interface MultiClinicLayoutProps {
  children: React.ReactNode;
}

export default function MultiClinicLayout({ children }: MultiClinicLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { branch, exitBranch } = useAuth();

  // These pages are "Semua cabang": arriving here from inside a branch leaves
  // it, so no request from this page is sent on the branch's behalf.
  useEffect(() => {
    if (branch) exitBranch(window.location.pathname + window.location.search);
  }, [branch, exitBranch]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);
  useEscapeKey(closeSidebar, sidebarOpen);

  return (
    <MultiClinicGuard>
      <div className="dashboard-wrapper">
        {sidebarOpen && (
          <div className="sidebar-overlay show" onClick={closeSidebar} role="presentation" />
        )}
        <MultiClinicSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className="main-container">
          <Navbar onMenuClick={toggleSidebar} />
          <div className="content">{children}</div>
        </div>
      </div>
    </MultiClinicGuard>
  );
}
