'use client';

import { useState } from 'react';
import SuperAdminSidebar from './SuperAdminSidebar';
import Navbar from './Navbar';
import SuperAdminGuard from '@/components/auth/SuperAdminGuard';
import './dashboard-layout.css';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <SuperAdminGuard>
      <div className="dashboard-wrapper">
        {sidebarOpen && (
          <div className="sidebar-overlay show" onClick={closeSidebar} role="presentation" />
        )}
        <SuperAdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className="main-container">
          <Navbar onMenuClick={toggleSidebar} />
          {children}
        </div>
      </div>
    </SuperAdminGuard>
  );
}
