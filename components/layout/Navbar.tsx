'use client';

import './navbar.css';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div>
          <div className="topbar-title">Zanak Dental Care</div>
          <div className="topbar-subtitle">Dashboard</div>
        </div>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Dark mode">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.5A9 9 0 1111.5 3a7 7 0 009.5 9.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="icon-btn" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 8a6 6 0 1112 0c0 3 1 5 1.5 6H4.5C5 13 6 11 6 8z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 18a2.5 2.5 0 005 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="user-chip">
          <div className="avatar">ZD</div>
          <span className="user-name">Zanak Dental</span>
          <span className="chip-chevron">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </header>
  );
}
