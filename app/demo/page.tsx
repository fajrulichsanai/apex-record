'use client';

import { useEffect } from 'react';
import { enterDemoMode } from '@/lib/demo/demo-mode';

/** Entry point from the landing page: switch this tab into demo mode, then
 * load the dashboard (or the `to` page) with a full page load so every provider starts fresh. */
export default function DemoEntryPage() {
  useEffect(() => {
    enterDemoMode();
    // ?to=/laporan-keuangan-pro deep-links a landing-page CTA; only same-site paths.
    const to = new URLSearchParams(window.location.search).get('to');
    const target = to && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard';
    window.location.replace(target);
  }, []);

  return <div className="dashboard-auth-loading">Menyiapkan demo…</div>;
}
