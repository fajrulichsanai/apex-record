'use client';

import { useEffect, useState } from 'react';

export type RmNavLayout = 'side' | 'top';
const KEY = 'rm_nav_layout';

/**
 * Letak menu rekam medis: di samping (bawaan) atau di atas sebagai deretan tab.
 * Pilihan diingat per perangkat (tablet dokter bisa berbeda dari komputer admin).
 */
export function useRmNavLayout(): [RmNavLayout, (next: RmNavLayout) => void] {
  const [layout, setLayout] = useState<RmNavLayout>('side');

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'top') setLayout('top');
    } catch {
      // penyimpanan diblokir: tetap bawaan
    }
  }, []);

  const update = (next: RmNavLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // abaikan
    }
  };
  return [layout, update];
}

/** Dua tombol: menu di samping / di atas. */
export default function RmNavToggle({ layout, onChange }: { layout: RmNavLayout; onChange: (l: RmNavLayout) => void }) {
  return (
    <div className="rm-nav-toggle" role="group" aria-label="Letak menu rekam medis">
      <span className="rm-nav-toggle-label">Tampilan menu</span>
      <div className="rm-nav-toggle-btns">
        <button
          type="button"
          className={layout === 'side' ? 'on' : ''}
          aria-pressed={layout === 'side'}
          onClick={() => onChange('side')}
          title="Menu di samping"
        >
          <span aria-hidden="true" className="material-symbols-rounded">view_sidebar</span>
          Samping
        </button>
        <button
          type="button"
          className={layout === 'top' ? 'on' : ''}
          aria-pressed={layout === 'top'}
          onClick={() => onChange('top')}
          title="Menu di atas"
        >
          <span aria-hidden="true" className="material-symbols-rounded">web_asset</span>
          Atas
        </button>
      </div>
    </div>
  );
}
