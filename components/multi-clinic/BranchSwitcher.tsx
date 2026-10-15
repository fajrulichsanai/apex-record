'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { multiClinicApi, type OwnedClinic } from '@/lib/multi-clinic';
import { useEscapeKey } from '@/lib/a11y';
import './branch-switcher.css';

/**
 * Pemilih cabang di header (PRD Multi-Klinik MK-01). Only for a Multi-Klinik
 * Owner: "Semua cabang" = the multiklinik dashboard; a branch = that clinic's
 * normal app with the owner's rights. The active branch is always shown so
 * it's never unclear which clinic a change goes to.
 */
export default function BranchSwitcher() {
  const { account, branch, enterBranch, exitBranch } = useAuth();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<OwnedClinic[] | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isOwner = account?.role === 'multi_clinic_owner';
  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    multiClinicApi
      .myClinics()
      .then((rows) => {
        if (active) setBranches(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [isOwner]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!isOwner) return null;

  const label = branch ? branch.name || `Cabang #${branch.id}` : 'Semua cabang';

  return (
    <div className="bs-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`bs-trigger ${branch ? 'in-branch' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Ganti cabang"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="bs-text">
          <small>{branch ? 'Cabang aktif' : 'Multi-Klinik'}</small>
          <span className="bs-name">{label}</span>
        </span>
        <svg className="bs-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="bs-menu" role="menu" aria-label="Pilih cabang">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!branch}
            className={`bs-item ${!branch ? 'active' : ''}`}
            onClick={() => (branch ? exitBranch() : setOpen(false))}
          >
            <span className="bs-item-name">Semua cabang</span>
            <span className="bs-item-sub">Dashboard, laporan, dan langganan gabungan</span>
          </button>
          <div className="bs-sep" role="separator" />
          {branches === null && !failed && <div className="bs-note">Memuat cabang…</div>}
          {failed && <div className="bs-note">Gagal memuat daftar cabang.</div>}
          {branches?.length === 0 && (
            <div className="bs-note">Belum ada cabang terhubung. Hubungi tim ApexRecord.</div>
          )}
          {branches?.map((c) => (
            <button
              key={c.id}
              type="button"
              role="menuitemradio"
              aria-checked={branch?.id === c.id}
              className={`bs-item ${branch?.id === c.id ? 'active' : ''}`}
              onClick={() =>
                branch?.id === c.id ? setOpen(false) : enterBranch({ id: c.id, name: c.name })
              }
            >
              <span className="bs-item-name">{c.name}</span>
              {c.address && <span className="bs-item-sub">{c.address}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
