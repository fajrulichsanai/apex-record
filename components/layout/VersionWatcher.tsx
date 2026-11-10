'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import './VersionWatcher.css';

/**
 * Pembaruan otomatis. Setelah deploy, tab yang masih terbuka memegang aset versi
 * lama yang sudah tidak ada di server — tampilan rusak/jelek sampai di-refresh.
 * Komponen ini memeriksa versi server (/api/version) lalu memuat ulang:
 *   - saat tab kembali aktif / online, tiap 60 detik, dan setiap pindah halaman;
 *   - segera bila berkas /_next/static gagal dimuat (tanda versi lama);
 *   - menghapus Cache Storage & service worker bila ada, lalu reload.
 * Bila pengguna sedang mengisi formulir, tidak ada reload otomatis — hanya
 * banner supaya data yang diketik tidak hilang.
 */
const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? '';
const POLL_MS = 60_000;
const COUNTDOWN_S = 5;
const GUARD_KEY = 'apex_version_reload';
/** Sudah reload untuk versi yang sama dalam jangka ini: jangan otomatis lagi (cegah loop). */
const GUARD_MS = 2 * 60_000;

type Phase = 'idle' | 'countdown' | 'manual';

function isEditingWithContent(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const v = (el as HTMLInputElement).value;
    return typeof v === 'string' && v.length > 0;
  }
  return el.isContentEditable && (el.textContent ?? '').length > 0;
}

function recentlyReloadedFor(version: string): boolean {
  try {
    const raw = sessionStorage.getItem(GUARD_KEY);
    if (!raw) return false;
    const g = JSON.parse(raw) as { v?: string; t?: number };
    return g.v === version && typeof g.t === 'number' && Date.now() - g.t < GUARD_MS;
  } catch {
    return false;
  }
}

export default function VersionWatcher() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [secs, setSecs] = useState(COUNTDOWN_S);
  const [dirtyNote, setDirtyNote] = useState(false);
  const dirty = useRef(false);
  const target = useRef<string | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const checking = useRef(false);
  const lastCheck = useRef(0);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const reloadNow = useCallback(async () => {
    try {
      sessionStorage.setItem(GUARD_KEY, JSON.stringify({ v: target.current, t: Date.now() }));
    } catch {
      /* penyimpanan tidak tersedia: abaikan */
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* tetap lanjut reload */
    }
    window.location.reload();
  }, []);

  const onNewVersion = useCallback(
    (version: string) => {
      if (phaseRef.current !== 'idle' && target.current === version) return;
      target.current = version;
      const editing = dirty.current || isEditingWithContent();
      setDirtyNote(editing);
      if (editing || recentlyReloadedFor(version)) {
        setPhaseBoth('manual');
      } else {
        setSecs(COUNTDOWN_S);
        setPhaseBoth('countdown');
      }
    },
    [setPhaseBoth],
  );

  const check = useCallback(
    async (force = false) => {
      if (!CURRENT || process.env.NODE_ENV !== 'production') return;
      if (checking.current) return;
      if (!force && Date.now() - lastCheck.current < 5_000) return;
      checking.current = true;
      lastCheck.current = Date.now();
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (data.version && data.version !== CURRENT) onNewVersion(data.version);
      } catch {
        /* offline / server sedang restart: coba lagi nanti */
      } finally {
        checking.current = false;
      }
    },
    [onNewVersion],
  );

  // Pemicu pemeriksaan.
  useEffect(() => {
    void check(true);
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check(true);
    };
    const onFocus = () => void check();
    const onOnline = () => void check(true);
    // Berkas /_next/static yang gagal dimuat = hampir pasti versi lama yang sudah terhapus.
    const onResourceError = (e: Event) => {
      const t = e.target as (HTMLElement & { href?: string; src?: string }) | null;
      const url = t && (t.tagName === 'LINK' || t.tagName === 'SCRIPT') ? (t.href ?? t.src ?? '') : '';
      if (url.includes('/_next/static/')) void check(true);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason && (e.reason.name || e.reason.message)) ?? '');
      if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported/i.test(msg)) void check(true);
    };
    const onInput = () => {
      dirty.current = true;
      // Mulai mengetik saat hitung mundur berjalan: batalkan reload otomatis.
      if (phaseRef.current === 'countdown') {
        setDirtyNote(true);
        setPhaseBoth('manual');
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('error', onResourceError, true);
    window.addEventListener('unhandledrejection', onRejection);
    document.addEventListener('input', onInput, true);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('error', onResourceError, true);
      window.removeEventListener('unhandledrejection', onRejection);
      document.removeEventListener('input', onInput, true);
    };
  }, [check, setPhaseBoth]);

  // Pindah halaman: periksa dulu (sebelum halaman baru memuat CSS/JS yang mungkin sudah tidak ada),
  // dan data yang diketik di halaman sebelumnya tidak lagi dianggap "belum disimpan".
  useEffect(() => {
    dirty.current = false;
    void check();
  }, [pathname, check]);

  // Hitung mundur lalu reload — dibatalkan bila pengguna mulai mengetik.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = window.setInterval(() => {
      setSecs((s) => s - 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown' || secs > 0) return;
    if (dirty.current || isEditingWithContent()) {
      setDirtyNote(true);
      setPhaseBoth('manual');
    } else {
      void reloadNow();
    }
  }, [phase, secs, reloadNow, setPhaseBoth]);

  if (phase === 'idle') return null;

  return (
    <div className="vw-banner" role="status" aria-live="polite">
      <div className="vw-text">
        <strong>Versi baru tersedia.</strong>{' '}
        {phase === 'countdown'
          ? `Memperbarui otomatis dalam ${Math.max(secs, 0)} detik…`
          : dirtyNote
            ? 'Perbarui setelah selesai mengisi — data yang belum disimpan akan hilang.'
            : 'Perbarui untuk mendapat tampilan dan perbaikan terbaru.'}
      </div>
      <div className="vw-actions">
        {phase === 'countdown' && (
          <button type="button" className="vw-later" onClick={() => setPhaseBoth('manual')}>
            Tunda
          </button>
        )}
        <button type="button" className="vw-now" onClick={() => void reloadNow()}>
          Perbarui sekarang
        </button>
      </div>
    </div>
  );
}
