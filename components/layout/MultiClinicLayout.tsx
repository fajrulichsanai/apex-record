'use client';

import Navbar from './Navbar';
import MultiClinicGuard from '@/components/auth/MultiClinicGuard';
import './dashboard-layout.css';

interface MultiClinicLayoutProps {
  children: React.ReactNode;
}

export default function MultiClinicLayout({ children }: MultiClinicLayoutProps) {
  return (
    <MultiClinicGuard>
      <div className="dashboard-wrapper">
        <div className="main-container">
          <Navbar onMenuClick={() => {}} />
          <div className="content">{children}</div>
        </div>
      </div>
    </MultiClinicGuard>
  );
}
