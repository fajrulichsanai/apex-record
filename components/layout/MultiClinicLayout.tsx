'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import MultiClinicSidebar from './MultiClinicSidebar';
import MultiClinicGuard from '@/components/auth/MultiClinicGuard';
import './dashboard-layout.css';

interface MultiClinicLayoutProps {
  children: React.ReactNode;
}

export default function MultiClinicLayout({ children }: MultiClinicLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

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
