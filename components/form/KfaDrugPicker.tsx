'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { kfaApi, type KfaProduct } from '@/lib/master-data';
import './KfaDrugPicker.css';

export interface KfaDrugValue {
  drugName: string;
  kfaCode: string | null;
  kfaName: string | null;
}

interface KfaDrugPickerProps {
  value: KfaDrugValue;
  onChange: (value: KfaDrugValue) => void;
  /** Kata kunci cepat (mis. obat yang sering diresepkan) */
  quickPicks?: string[];
  disabled?: boolean;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

/**
 * Nama obat + pencarian KFA (Kamus Farmasi & Alkes SATUSEHAT).
 * Memilih hasil KFA menyimpan kode 8 digitnya sehingga resep bisa dikirim
 * ke SATUSEHAT; mengetik bebas tetap boleh, tetapi resep itu tidak akan
 * terkirim.
 */
export default function KfaDrugPicker({ value, onChange, quickPicks = [], disabled }: KfaDrugPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<KfaProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const keyword = value.kfaCode ? '' : value.drugName.trim();

  useEffect(() => {
    if (keyword.length < MIN_CHARS) {
      setResults([]);
      setError(null);
      return;
    }
    const req = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await kfaApi.search(keyword);
        if (req !== requestRef.current) return;
        setResults(res.items);
        setError(null);
        setActive(-1);
      } catch (err) {
        if (req !== requestRef.current) return;
        setResults([]);
        setError(err instanceof ApiError ? err.message : 'Pencarian KFA tidak tersedia');
      } finally {
        if (req === requestRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(p: KfaProduct) {
    onChange({ drugName: p.name, kfaCode: p.kfaCode, kfaName: p.name });
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && !value.kfaCode && keyword.length >= MIN_CHARS;

  return (
    <div className="kfa-picker" ref={wrapRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Cari obat (KFA), mis. amoxicillin"
        value={value.drugName}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          // Mengubah nama memutus tautan KFA
          onChange({ drugName: e.target.value, kfaCode: null, kfaName: null });
          setOpen(true);
        }}
      />

      {value.kfaCode ? (
        <div className="kfa-status ok">
          <span aria-hidden="true" className="material-symbols-rounded">verified</span>
          KFA {value.kfaCode}
          <button
            type="button"
            className="kfa-clear"
            onClick={() => onChange({ drugName: '', kfaCode: null, kfaName: null })}
          >
            Ganti
          </button>
        </div>
      ) : (
        value.drugName.trim() && (
          <div className="kfa-status warn">Belum dipilih dari KFA — resep ini tidak terkirim ke SATUSEHAT</div>
        )
      )}

      {!value.drugName && quickPicks.length > 0 && (
        <div className="kfa-quick">
          {quickPicks.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange({ drugName: q, kfaCode: null, kfaName: null });
                setOpen(true);
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {showList && (
        <ul className="kfa-list" id={listId} role="listbox">
          {loading && <li className="kfa-note">Mencari di KFA…</li>}
          {!loading && error && <li className="kfa-note err">{error}</li>}
          {!loading && !error && results.length === 0 && <li className="kfa-note">Tidak ada di KFA</li>}
          {!loading &&
            results.map((p, i) => (
              <li
                key={p.kfaCode}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
              >
                <span className="kfa-name">{p.name}</span>
                <span className="kfa-meta">
                  {p.kfaCode}
                  {p.dosageForm ? ` · ${p.dosageForm.name}` : ''}
                  {p.manufacturer ? ` · ${p.manufacturer}` : ''}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
