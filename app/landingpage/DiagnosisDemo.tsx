'use client';

import { useEffect, useState } from 'react';

type System = 'icd10' | 'snomed';

interface Hit {
  system: System;
  code: string;
  display: string;
  nameId: string | null;
}

interface Detail extends Hit {
  aliases: string[];
  explanation: string | null;
  classification: {
    chapter: { roman: string; range: string; name: string } | null;
    category: { code: string; display: string } | null;
  } | null;
  equivalent: { system: System; code: string; display: string } | null;
}

const LABEL: Record<System, string> = { icd10: 'ICD-10', snomed: 'SNOMED CT' };
const SUGGESTIONS = ['gigi berlubang', 'radang gusi', 'gigi bungsu', 'sariawan', 'darah tinggi', 'K04'];

// Shown only if the live search can't be reached (e.g. offline).
const FALLBACK: Hit[] = [
  { system: 'icd10', code: 'K02.1', display: 'Caries of dentine', nameId: 'Karies dentin' },
  { system: 'icd10', code: 'K02.0', display: 'Caries limited to enamel', nameId: 'Karies email' },
  { system: 'icd10', code: 'K02.9', display: 'Dental caries, unspecified', nameId: 'Karies gigi (tidak spesifik)' },
];

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/backend${path}`, { cache: 'no-store' });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.error?.message || 'Gagal memuat');
  return body.data as T;
}

/**
 * Live diagnosis search on the landing page — the same ICD-10 / SNOMED CT
 * lookup doctors use in the SOAP assessment (public reference data, no
 * patient data, rate-limited server-side).
 */
export default function DiagnosisDemo() {
  const [system, setSystem] = useState<System>('icd10');
  const [query, setQuery] = useState('gigi berlubang');
  const [result, setResult] = useState<{ key: string; hits: Hit[]; offline?: boolean }>({ key: '', hits: [] });
  const [selected, setSelected] = useState<Hit | null>(null);
  const [detail, setDetail] = useState<{ key: string; data: Detail | null }>({ key: '', data: null });

  const q = query.trim();
  const key = `${system}:${q}`;
  const pending = q.length >= 2 && result.key !== key;
  const hits = q.length >= 2 && result.key === key ? result.hits : [];
  const active = selected && hits.some((h) => h.code === selected.code) ? selected : hits[0] ?? null;
  const activeKey = active ? `${active.system}:${active.code}` : '';

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      get<Hit[]>(`/terminology/search?${new URLSearchParams({ system, q, limit: '5' })}`)
        .then((hits) => alive && setResult({ key: `${system}:${q}`, hits }))
        .catch(
          () =>
            alive &&
            setResult({ key: `${system}:${q}`, hits: system === 'icd10' ? FALLBACK : [], offline: true }),
        );
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [system, q]);

  const offline = !!result.offline;
  useEffect(() => {
    if (!activeKey || offline) return;
    let alive = true;
    const [sys, ...rest] = activeKey.split(':');
    const code = rest.join(':');
    get<Detail>(`/terminology/${sys}/${encodeURIComponent(code)}`)
      .then((data) => alive && setDetail({ key: activeKey, data }))
      .catch(() => alive && setDetail({ key: activeKey, data: null }));
    return () => {
      alive = false;
    };
  }, [activeKey, offline]);

  const d = detail.key === activeKey ? detail.data : null;

  return (
    <div className="dx-demo">
      <div className="dx-demo-tabs" role="tablist" aria-label="Sistem kode">
        {(['icd10', 'snomed'] as System[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={system === s}
            className={system === s ? 'on' : ''}
            onClick={() => {
              setSystem(s);
              setSelected(null);
            }}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>

      <label className="dx-demo-search">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Coba ketik: gigi berlubang, radang gusi, K02…"
          aria-label="Cari diagnosis"
          maxLength={60}
        />
        {pending && <span className="dx-demo-spin" aria-hidden="true" />}
      </label>

      <div className="dx-demo-chips">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={q.toLowerCase() === s.toLowerCase() ? 'on' : ''}
            onClick={() => {
              setQuery(s);
              setSelected(null);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="dx-demo-list" role="listbox" aria-label="Hasil diagnosis">
        {q.length < 2 ? (
          <div className="dx-demo-empty">Ketik minimal 2 huruf.</div>
        ) : pending && !hits.length ? (
          <div className="dx-demo-empty">Mencari…</div>
        ) : !hits.length ? (
          <div className="dx-demo-empty">Tidak ada yang cocok — coba kata lain atau kodenya.</div>
        ) : (
          hits.map((h) => (
            <button
              key={h.code}
              type="button"
              role="option"
              aria-selected={active?.code === h.code}
              className={`dx-demo-row${active?.code === h.code ? ' on' : ''}`}
              onClick={() => setSelected(h)}
            >
              <span className={`dx-demo-code${h.system === 'snomed' ? ' sn' : ''}`}>{h.code}</span>
              <span>
                <b>{h.nameId ?? h.display}</b>
                {h.nameId && <small>{h.display}</small>}
              </span>
            </button>
          ))
        )}
      </div>

      {active && (
        <div className="dx-demo-explain" aria-live="polite">
          <div className="t">{active.nameId ?? active.display}</div>
          {result.offline ? (
            <p>Contoh tampilan — pencarian langsung sedang tidak dapat dihubungi.</p>
          ) : !d ? (
            <p>Memuat penjelasan…</p>
          ) : (
            <>
              <p>
                {d.explanation ?? (
                  <>
                    Nama resmi: <em>{d.display}</em>. Penjelasan berbahasa Indonesia tersedia untuk diagnosis yang umum
                    dipakai klinik.
                  </>
                )}
              </p>
              <dl>
                {d.aliases.length > 0 && (
                  <>
                    <dt>Nama lain</dt>
                    <dd>{d.aliases.slice(0, 4).join(', ')}</dd>
                  </>
                )}
                {d.classification?.chapter && (
                  <>
                    <dt>Bab ICD-10</dt>
                    <dd>
                      {d.classification.chapter.roman} · {d.classification.chapter.name} ({d.classification.chapter.range})
                    </dd>
                  </>
                )}
                {d.classification?.category && (
                  <>
                    <dt>Kategori</dt>
                    <dd>
                      <code>{d.classification.category.code}</code> {d.classification.category.display}
                    </dd>
                  </>
                )}
                {d.equivalent && (
                  <>
                    <dt>Padanan {LABEL[d.equivalent.system]}</dt>
                    <dd>
                      <code>{d.equivalent.code}</code> {d.equivalent.display}
                    </dd>
                  </>
                )}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}
