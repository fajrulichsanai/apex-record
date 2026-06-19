import './stats-grid.css';

const statsData = [
  {
    id: 1,
    title: 'Total Pasien',
    value: '—',
    color: 'purple',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.2" stroke="white" strokeWidth="1.8" />
        <path
          d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="17" cy="9" r="2.4" stroke="white" strokeWidth="1.8" />
        <path
          d="M15.5 13.6c2.3.3 4 2.1 4 4.4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Pendapatan Bulan Ini',
    value: '—',
    color: 'green',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect
          x="3.5"
          y="5"
          width="17"
          height="14"
          rx="2"
          stroke="white"
          strokeWidth="1.8"
        />
        <path d="M3.5 10h17" stroke="white" strokeWidth="1.8" />
        <circle cx="8" cy="14.5" r="1.4" fill="white" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'Kunjungan Hari Ini',
    value: '—',
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
    id: 4,
    title: 'Dokter Aktif',
    value: '—',
    color: 'orange',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect
          x="4"
          y="6"
          width="16"
          height="13"
          rx="2"
          stroke="white"
          strokeWidth="1.8"
        />
        <path
          d="M9 6V5a3 3 0 016 0v1"
          stroke="white"
          strokeWidth="1.8"
        />
        <path
          d="M12 11v4M10 13h4"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function StatsGrid() {
  return (
    <div className="stats-grid">
      {statsData.map((stat) => (
        <div key={stat.id} className={`stat-card ${stat.color}`}>
          <div className="stat-icon">{stat.icon}</div>
          <div>
            <div className="stat-dash">{stat.value}</div>
            <div className="stat-label">{stat.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
