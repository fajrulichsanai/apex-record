'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { useTheme, type ThemePreference } from '@/lib/theme-context';
import '../../styles/tampilan.css';

const OPTIONS: { value: ThemePreference; label: string; desc: string }[] = [
  { value: 'light', label: 'Terang', desc: 'Latar cerah, cocok untuk ruangan terang.' },
  { value: 'dark', label: 'Gelap', desc: 'Latar gelap, lebih nyaman di mata saat malam.' },
  { value: 'system', label: 'Otomatis', desc: 'Mengikuti pengaturan perangkat Anda.' },
];

function ThemePreview({ variant }: { variant: ThemePreference }) {
  const resolved = variant === 'system' ? 'system' : variant;
  return (
    <div className={`theme-preview theme-preview-${resolved}`}>
      <div className="theme-preview-sidebar" />
      <div className="theme-preview-body">
        <div className="theme-preview-topbar" />
        <div className="theme-preview-card">
          <div className="theme-preview-line long" />
          <div className="theme-preview-line short" />
        </div>
      </div>
    </div>
  );
}

function TampilanPageInner() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <main className="content tampilan-page">
      <div className="page-header">
        <div className="page-title-block">
          <div className="page-title"><h1>Tampilan</h1></div>
          <p className="page-subtitle">Pilih tema warna aplikasi sesuai preferensi Anda.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Tema</h2>
        </div>
        <div className="theme-option-grid">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`theme-option${preference === opt.value ? ' selected' : ''}`}
              onClick={() => setPreference(opt.value)}
              aria-pressed={preference === opt.value}
            >
              <ThemePreview variant={opt.value} />
              <div className="theme-option-label-row">
                <span className="theme-option-label">{opt.label}</span>
                {preference === opt.value && <span className="theme-option-check">✓</span>}
              </div>
              <p className="theme-option-desc">{opt.desc}</p>
            </button>
          ))}
        </div>
        <p className="theme-current-hint">
          Saat ini menggunakan tampilan <strong>{resolvedTheme === 'dark' ? 'Gelap' : 'Terang'}</strong>
          {preference === 'system' ? ' (mengikuti sistem)' : ''}.
        </p>
      </div>
    </main>
  );
}

export default function TampilanPage() {
  return (
    <DashboardLayout>
      <FeatureGuard feature="tampilan">
        <TampilanPageInner />
      </FeatureGuard>
    </DashboardLayout>
  );
}
