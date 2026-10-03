'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from '@/lib/theme-context';

const noopSubscribe = () => () => {};

// Sun/moon switch in the landing page nav. Uses the same theme preference as
// the app, so a visitor's choice carries over after they log in.
export default function ThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  // Server render can't know the stored preference; show the light-mode icon
  // until hydrated, then the real one.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
      )}
    </button>
  );
}
