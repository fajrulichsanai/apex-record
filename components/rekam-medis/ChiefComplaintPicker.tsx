'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { terminologyApi, type TerminologyHit } from '@/lib/terminology';
import './DiagnosisPicker.css';

export interface ChiefComplaintValue {
  code: string;
  display: string;
}

interface ChiefComplaintPickerProps {
  value: ChiefComplaintValue | null;
  onChange: (value: ChiefComplaintValue | null) => void;
  disabled?: boolean;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

/**
 * Keluhan utama terkode SNOMED CT (mis. "Fever", "Toothache") — dikirim ke
 * SATUSEHAT sebagai Condition keluhan utama. Teks keluhan bebas tetap ditulis
 * di Subjective.
 */
export default function ChiefComplaintPicker({ value, onChange, disabled }: ChiefComplaintPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TerminologyHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);

  const keyword = query.trim();

  useEffect(() => {
    // Daftar disembunyikan selama kata kunci terlalu pendek (lihat showList)
    if (keyword.length < MIN_CHARS) return;
    const req = ++requestRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const hits = await terminologyApi.search('snomed', keyword, 10);
        if (req !== requestRef.current) return;
        setResults(hits);
        setError(null);
        setActive(-1);
      } catch (err) {
        if (req !== requestRef.current) return;
        setResults([]);
        setError(err instanceof ApiError ? err.message : 'Pencarian SNOMED tidak tersedia');
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

  function pick(hit: TerminologyHit) {
    onChange({ code: hit.code, display: hit.nameId || hit.display });
    setQuery('');
    setResults([]);
    setOpen(false);
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

  if (value) {
    return (
      <div className="kfa-status ok">
        <span aria-hidden="true" className="material-symbols-rounded">verified</span>
        {value.display} <span className="dx-code">SNOMED {value.code}</span>
        <button type="button" className="kfa-clear" onClick={() => onChange(null)} disabled={disabled}>
          Ganti
        </button>
      </div>
    );
  }

  const showList = open && keyword.length >= MIN_CHARS;

  return (
    <div className="kfa-picker" ref={wrapRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Cari keluhan (SNOMED CT), mis. fever, toothache, cough"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {showList && (
        <ul className="kfa-list" id={listId} role="listbox">
          {loading && <li className="kfa-note">Mencari…</li>}
          {!loading && error && <li className="kfa-note err">{error}</li>}
          {!loading && !error && results.length === 0 && <li className="kfa-note">Tidak ditemukan</li>}
          {!loading &&
            results.map((hit, i) => (
              <li
                key={hit.code}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hit);
                }}
              >
                <span className="kfa-name">{hit.nameId || hit.display}</span>
                <span className="kfa-meta">
                  SNOMED {hit.code}
                  {hit.nameId ? ` · ${hit.display}` : ''}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
