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
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 12h4l3 8 4-16 3 8h4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="empty-title">Belum ada aktivitas hari ini</div>
          <div className="empty-sub">Aktivitas klinik akan muncul di sini</div>
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
