'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  variant?: 'income' | 'total' | 'pending' | 'lunas' | 'margin' | 'expense';
}

export default function StatCard({ icon, value, label, variant = 'total' }: StatCardProps) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
