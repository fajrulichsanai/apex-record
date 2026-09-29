'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from '@/lib/theme-context';

const noopSubscribe = () => () => {};

// Light/dark switch shown in the corner of the auth pages. The label names
// the mode you'll switch *to*, so it always reads as an action.
export default function AuthThemeToggle() {
  const { resolvedTheme, setPreference } = useTheme();
  // The server can't know the stored preference, so render the light-mode
  // label for SSR/hydration and switch to the real one right after.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      className="dark-toggle"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
      )}
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
