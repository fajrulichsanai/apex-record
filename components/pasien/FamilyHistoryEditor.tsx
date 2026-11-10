'use client';

import { useEffect, useState } from 'react';
import { terminologyApi, type TerminologyHit } from '@/lib/terminology';
import { FAMILY_RELATIONSHIP_OPTIONS, type FamilyRelationship } from '@/lib/patients';

export interface FamilyRow {
  key?: string;
  relationship: FamilyRelationship;
  code: string;
  display: string;
  nameId: string | null;
  note: string;
}

const labelOf = (r: FamilyRelationship) => FAMILY_RELATIONSHIP_OPTIONS.find((o) => o.value === r)?.label ?? r;

/**
 * Riwayat penyakit keluarga: hubungan + penyakit (ICD-10) + catatan.
 * Disimpan bersama data pasien dan dikirim ke SATUSEHAT saat kunjungan.
 */
export default function FamilyHistoryEditor({
  value,
  onChange,
}: {
  value: FamilyRow[];
  onChange: (rows: FamilyRow[]) => void;
}) {
  const [relationship, setRelationship] = useState<FamilyRelationship>('FTH');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<{ q: string; items: TerminologyHit[] }>({ q: '', items: [] });
  const [note, setNote] = useState('');
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      terminologyApi
        .search('icd10', q, 8)
        .then((items) => alive && setHits({ q, items }))
        .catch(() => alive && setHits({ q, items: [] }));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q]);

  const add = (hit: TerminologyHit) => {
    onChange([
      ...value,
      { relationship, code: hit.code, display: hit.display, nameId: hit.nameId, note: note.trim() },
    ]);
    setQuery('');
    setNote('');
  };

  const items = q.length >= 2 && hits.q === q ? hits.items : [];

  return (
    <div className="form-field full fh-editor">
      <label>Riwayat Penyakit Keluarga</label>
      {value.length > 0 && (
        <ul className="fh-list">
          {value.map((r, i) => (
            <li key={r.key ?? `new-${i}`}>
              <span>
                <strong>{labelOf(r.relationship)}</strong> — {r.nameId ?? r.display}{' '}
                <span className="fh-code">{r.code}</span>
                {r.note && <span className="fh-note"> · {r.note}</span>}
              </span>
              <button
                type="button"
                className="fh-remove"
                aria-label={`Hapus ${labelOf(r.relationship)} ${r.nameId ?? r.display}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="fh-add">
        <select
          aria-label="Hubungan keluarga"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
        >
          {FAMILY_RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          aria-label="Cari penyakit keluarga"
          placeholder="Cari penyakit (ICD-10), mis. diabetes, hipertensi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <input
          type="text"
          aria-label="Catatan riwayat keluarga"
          placeholder="Catatan (opsional)"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {q.length >= 2 && (
        <ul className="fh-results" aria-label="Hasil pencarian penyakit keluarga">
          {hits.q === q && !items.length && <li className="fh-muted">Tidak ditemukan</li>}
          {items.map((h) => (
            <li key={h.code}>
              <button type="button" onClick={() => add(h)}>
                <span className="fh-code">{h.code}</span> {h.nameId ?? h.display}
                {h.nameId && <span className="fh-muted"> · {h.display}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <small className="fh-muted">Pilih hubungan, lalu cari dan klik penyakitnya untuk menambahkan.</small>
    </div>
  );
}
