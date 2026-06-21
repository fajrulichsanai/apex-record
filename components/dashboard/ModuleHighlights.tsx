import Link from 'next/link';
import './module-highlights.css';

interface HighlightItem {
  id: string;
  href: string;
  title: string;
  metric: string;
  metricLabel: string;
  sub: string;
  color: 'purple' | 'green' | 'blue' | 'orange' | 'pink' | 'teal';
  icon: React.ReactNode;
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.2" stroke="white" strokeWidth="1.8" />
      <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" stroke="white" strokeWidth="1.8" />
      <path d="M15.5 13.6c2.3.3 4 2.1 4 4.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1" fill="white" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4" width="17" height="16" rx="2" stroke="white" strokeWidth="1.8" />
      <path d="M12 9v6M9 12h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 19V11M10 19V5M16 19v-7M20 19V9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 19h16M7 16V9m5 7V5m5 11v-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 4v6a4 4 0 0 0 8 0V4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="14" r="2" stroke="white" strokeWidth="1.8" />
      <path d="M13 10v3a5 5 0 0 1-10 0V8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const HIGHLIGHTS: HighlightItem[] = [
  {
    id: 'pasien',
    href: '/list-pasien',
    title: 'Pasien',
    metric: '5',
    metricLabel: 'total pasien',
    sub: '3 aktif · 1 bayi',
    color: 'purple',
    icon: <UsersIcon />,
  },
  {
    id: 'tarif',
    href: '/tarif',
    title: 'Tarif & Tindakan',
    metric: '8',
    metricLabel: 'tindakan',
    sub: 'Rata-rata margin 89%',
    color: 'pink',
    icon: <TagIcon />,
  },
  {
    id: 'kunjungan',
    href: '/list-kunjungan',
    title: 'Kunjungan',
    metric: '4',
    metricLabel: 'kunjungan tercatat',
    sub: '1 menunggu',
    color: 'blue',
    icon: <CalendarIcon />,
  },
  {
    id: 'transaksi',
    href: '/transaksi',
    title: 'Transaksi',
    metric: '5',
    metricLabel: 'transaksi',
    sub: 'Cek status pembayaran',
    color: 'teal',
    icon: <ReceiptIcon />,
  },
  {
    id: 'laporan-keuangan',
    href: '/laporan-keuangan',
    title: 'Laporan Keuangan',
    metric: 'Rp 9,5jt',
    metricLabel: '6 hari terakhir',
    sub: '↑ Rata-rata Rp 1,58jt/hari',
    color: 'green',
    icon: <ChartIcon />,
  },
  {
    id: 'user-management',
    href: '/user-management',
    title: 'User & Staf',
    metric: '2',
    metricLabel: 'pengguna terdaftar',
    sub: '1 admin · 1 dokter',
    color: 'orange',
    icon: <StethoscopeIcon />,
  },
];

export default function ModuleHighlights() {
  return (
    <div className="module-highlights">
      <div className="module-highlights-header">
        <span className="module-highlights-title">Ringkasan Modul</span>
        <span className="module-highlights-sub">Sorotan data dari seluruh modul klinik</span>
      </div>
      <div className="module-highlights-grid">
        {HIGHLIGHTS.map((item) => (
          <Link key={item.id} href={item.href} className="highlight-card">
            <div className={`highlight-icon ${item.color}`}>{item.icon}</div>
            <div className="highlight-info">
              <div className="highlight-title">{item.title}</div>
              <div className="highlight-metric">
                {item.metric}
                <span className="highlight-metric-label">{item.metricLabel}</span>
              </div>
              <div className="highlight-sub">{item.sub}</div>
            </div>
            <span className="highlight-arrow">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
