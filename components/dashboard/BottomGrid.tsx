import './bottom-grid.css';

const quickActions = [
  {
    id: 1,
    label: 'Daftar Pasien',
    color: 'purple',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3" stroke="white" strokeWidth="1.8" />
        <path
          d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 8h4M18 6v4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 2,
    label: 'Buat Kunjungan',
    color: 'blue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect
          x="3.5"
          y="4"
          width="17"
          height="16"
          rx="2"
          stroke="white"
          strokeWidth="1.8"
        />
        <path
          d="M12 9v6M9 12h6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 3,
    label: 'Laporan Keuangan',
    color: 'green',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 19V11M10 19V5M16 19v-7M20 19V9"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 4,
    label: 'User Management',
    color: 'orange',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="8.5" cy="8" r="2.6" stroke="white" strokeWidth="1.8" />
        <path
          d="M3.5 18c0-2.5 2.2-4.3 5-4.3s5 1.8 5 4.3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 9.5c1 0 1.8-.8 1.8-1.8S17 6 16 6"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.8 13.7c1.8.3 3.2 1.6 3.2 4.3"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const recentActivities = [
  {
    id: 1,
    title: 'Mu** Da** Sa** menyelesaikan kunjungan',
    detail: 'Pembersihan Karang Gigi · drg. Daffa Safra',
    time: '10 menit lalu',
    color: 'green',
  },
  {
    id: 2,
    title: 'Transaksi baru tercatat',
    detail: 'Rp 1.450.000 · Tunai',
    time: '42 menit lalu',
    color: 'blue',
  },
  {
    id: 3,
    title: 'Ahmad Ri** menunggu kunjungan',
    detail: 'Konsultasi Awal · belum dimulai',
    time: '1 jam lalu',
    color: 'orange',
  },
  {
    id: 4,
    title: 'Tarif baru ditambahkan',
    detail: 'Cabut Gigi · Rp 200.000 – Rp 300.000',
    time: 'Kemarin',
    color: 'purple',
  },
];

export default function BottomGrid() {
  return (
    <div className="bottom-grid">
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Aktivitas Terbaru</span>
          <a href="#" className="panel-link">
            Lihat semua
          </a>
        </div>
        <div className="activity-list">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <span className={`activity-dot ${activity.color}`} />
              <div className="activity-info">
                <div className="activity-title">{activity.title}</div>
                <div className="activity-detail">{activity.detail}</div>
              </div>
              <span className="activity-time">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Aksi Cepat</span>
        </div>
        <div className="quick-actions">
          {quickActions.map((action) => (
            <div key={action.id} className="action-item">
              <div className="action-left">
                <div className={`action-icon ${action.color}`}>
                  {action.icon}
                </div>
                <span className="action-label">{action.label}</span>
              </div>
              <span className="action-chevron">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
