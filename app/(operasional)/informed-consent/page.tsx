'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useAuth } from '@/lib/auth-context';
import ConsentTemplateConfigTable from './ConsentTemplateConfigTable';
import PatientConsentList from './PatientConsentList';
import '../../styles/informed-consent.css';

type TabValue = 'forms' | 'config';

export default function InformedConsentPage() {
  const { user } = useAuth();
  const canEditTemplate = user?.role === 'owner' || user?.role === 'super_admin';

  const [tab, setTab] = useState<TabValue>('forms');

  return (
    <DashboardLayout>
      <FeatureGuard feature="informed-consent">
        <main className="content consent-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Informed Consent</h1>
              </div>
              <p className="page-subtitle">
                Formulir persetujuan tindakan medis dengan tanda tangan pasien dan dokter. Tidak dikirim otomatis ke pasien.
              </p>
            </div>
          </div>

          <div className="tab-bar">
            <button type="button" className={`filter-tab ${tab === 'forms' ? 'active' : ''}`} onClick={() => setTab('forms')}>
              Formulir Pasien
            </button>
            <button type="button" className={`filter-tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>
              Konfigurasi Template
            </button>
          </div>

          {tab === 'forms' ? (
            <PatientConsentList />
          ) : (
            <div className="panel">
              <div className="panel-toolbar">
                <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>
                  {canEditTemplate
                    ? 'Atur teks persetujuan untuk setiap tindakan yang membutuhkan informed consent.'
                    : 'Hanya Owner yang dapat mengubah template consent.'}
                </span>
              </div>
              <ConsentTemplateConfigTable canEdit={canEditTemplate} />
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
