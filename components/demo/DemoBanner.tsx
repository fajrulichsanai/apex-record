'use client';

import { useEffect, useState } from 'react';
import { exitDemoMode, isDemoMode } from '@/lib/demo/demo-mode';
import './demo-banner.css';

const SIGNUP_URL = '/';

export default function DemoBanner() {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemo(isDemoMode());
  }, []);

  if (!demo) return null;

  const leave = (href: string) => {
    exitDemoMode();
    window.location.href = href;
  };

  return (
    <div className="demo-banner" role="status">
      <span>
        <strong>Mode Demo</strong> — semua data di sini fiktif, perubahan tidak disimpan.
      </span>
      <span className="demo-banner-actions">
        <button type="button" className="demo-banner-primary" onClick={() => leave(SIGNUP_URL)}>
          Coba Gratis
        </button>
        <button type="button" onClick={() => leave('/landingpage')}>
          Keluar Demo
        </button>
      </span>
    </div>
  );
}
