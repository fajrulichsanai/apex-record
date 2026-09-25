'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  terminologyApi,
  TERMINOLOGY_LABEL,
  type SoapDiagnosis,
  type TerminologyDetail,
  type TerminologyHit,
  type TerminologySystem,
} from '@/lib/terminology';
import './DiagnosisPicker.css';

// Explanations don't change: keep them for the whole session.
const detailCache = new Map<string, Promise<TerminologyDetail>>();
function loadDetail(system: TerminologySystem, code: string) {
  const key = `${system}:${code}`;
  if (!detailCache.has(key)) {
    detailCache.set(
      key,
      terminologyApi.detail(system, code).catch((err) => {
        detailCache.delete(key);
        throw err;
      }),
    );
  }
  return detailCache.get(key)!;
}

/** The "penjelasan" panel for one code. */
export function DiagnosisExplanation({
  system,
  code,
  onAddEquivalent,
}: {
  system: TerminologySystem;
  code: string;
  onAddEquivalent?: (hit: TerminologyHit) => void;
}) {
  const [detail, setDetail] = useState<TerminologyDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadDetail(system, code).then(
      (d) => alive && setDetail(d),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [system, code]);

  if (failed) return <div className="dx-explain dx-explain-muted">Penjelasan tidak dapat dimuat.</div>;
  if (!detail) return <div className="dx-explain dx-explain-muted">Memuat penjelasan…</div>;

  const c = detail.classification;
  return (
    <div className="dx-explain">
      {detail.nameId && <div className="dx-explain-title">{detail.nameId}</div>}
      {detail.explanation ? (
        <p>{detail.explanation}</p>
      ) : (
        <p className="dx-explain-muted">
          Belum ada penjelasan berbahasa Indonesia untuk kode ini. Nama resmi: <em>{detail.display}</em>.
        </p>
      )}
      <dl>
        {detail.aliases.length > 0 && (
          <>
            <dt>Nama lain</dt>
            <dd>{detail.aliases.join(', ')}</dd>
          </>
        )}
        {c?.chapter && (
          <>
            <dt>Bab ICD-10</dt>
            <dd>
              {c.chapter.roman} · {c.chapter.name} ({c.chapter.range})
            </dd>
          </>
        )}
        {c?.block && (
          <>
            <dt>Blok</dt>
            <dd>
              {c.block.name} ({c.block.range})
            </dd>
          </>
        )}
        {c?.category && (
          <>
            <dt>Kategori</dt>
            <dd>
              <code>{c.category.code}</code> {c.category.display}
            </dd>
          </>
        )}
        {detail.equivalent && (
          <>
            <dt>Padanan {TERMINOLOGY_LABEL[detail.equivalent.system]}</dt>
            <dd>
              <code>{detail.equivalent.code}</code> {detail.equivalent.display}
              {onAddEquivalent && (
                <button
                  type="button"
                  className="dx-link"
                  onClick={() => onAddEquivalent({ ...detail.equivalent!, nameId: detail.nameId })}
                >
                  + Tambahkan juga
                </button>
              )}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

function CodeBadge({ system, code }: { system: TerminologySystem; code: string }) {
  return (
    <span className={`dx-code dx-code-${system}`} title={TERMINOLOGY_LABEL[system]}>
      {code}
    </span>
  );
}

interface DiagnosisPickerProps {
  value: SoapDiagnosis[];
  onChange: (next: SoapDiagnosis[]) => void;
  disabled?: boolean;
}

/**
 * Coded diagnoses for the SOAP assessment: search ICD-10 or SNOMED CT by
 * code, official name or Indonesian/other name, see an explanation, and
 * mark one diagnosis as the main one.
 */
export default function DiagnosisPicker({ value, onChange, disabled }: DiagnosisPickerProps) {
  const listId = useId();
  const [system, setSystem] = useState<TerminologySystem>('icd10');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ key: string; hits: TerminologyHit[] }>({ key: '', hits: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [peek, setPeek] = useState<string | null>(null); // result whose explanation is open
  const [expanded, setExpanded] = useState<string | null>(null); // selected item explanation
  const [error, setError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const searchKey = `${system}:${q}`;
  const hits = q.length >= 2 && results.key === searchKey ? results.hits : [];

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      terminologyApi
        .search(system, q)
        .then((data) => {
          if (!alive) return;
          setResults({ key: `${system}:${q}`, hits: data });
          setActive(0);
          setError('');
        })
        .catch((err) => alive && setError(err instanceof Error ? err.message : 'Pencarian gagal'))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [system, q]);

  // Close the result list when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const keyOf = (d: { system: string; code: string }) => `${d.system}:${d.code}`;
  const has = (d: { system: string; code: string }) => value.some((v) => keyOf(v) === keyOf(d));

  const add = (hit: TerminologyHit) => {
    if (has(hit)) return;
    onChange([
      ...value,
      { system: hit.system, code: hit.code, display: hit.display, nameId: hit.nameId, primary: value.length === 0, note: '' },
    ]);
    setQuery('');
    setOpen(false);
    setPeek(null);
  };

  const remove = (d: SoapDiagnosis) => {
    const rest = value.filter((v) => keyOf(v) !== keyOf(d));
    // Keep one main diagnosis: promote the first remaining one.
    if (d.primary && rest.length && !rest.some((v) => v.primary)) rest[0] = { ...rest[0], primary: true };
    onChange(rest);
  };

  const makePrimary = (d: SoapDiagnosis) =>
    onChange(value.map((v) => ({ ...v, primary: keyOf(v) === keyOf(d) })));

  const setNote = (d: SoapDiagnosis, note: string) =>
    onChange(value.map((v) => (keyOf(v) === keyOf(d) ? { ...v, note } : v)));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the SOAP form
      if (open && hits[active]) add(hits[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && q.length >= 2;

  return (
    <div className="dx-picker">
      <div className="dx-head">
        <label htmlFor={`${listId}-input`}>
          <span className="material-symbols-rounded">diagnosis</span>
          Diagnosis (kode)
        </label>
        <div className="dx-systems" role="tablist" aria-label="Sistem kode">
          {(['icd10', 'snomed'] as TerminologySystem[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={system === s}
              className={system === s ? 'active' : ''}
              onClick={() => {
                setSystem(s);
                setOpen(true);
              }}
              disabled={disabled}
            >
              {TERMINOLOGY_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <p className="dx-help">
        <strong>ICD-10</strong> dipakai untuk pelaporan dan klaim (SATUSEHAT, BPJS).{' '}
        <strong>SNOMED CT</strong> untuk istilah klinis yang lebih rinci. Cari dengan kode, nama resmi, atau nama lain dalam
        bahasa Indonesia — mis. <em>K02.1</em>, <em>caries</em>, <em>gigi berlubang</em>.
      </p>

      <div className="dx-search" ref={boxRef}>
        <span className="material-symbols-rounded dx-search-icon">search</span>
        <input
          id={`${listId}-input`}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={`Cari ${TERMINOLOGY_LABEL[system]}: kode, nama diagnosis, atau nama lain`}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
        />
        {loading && <span className="dx-spinner" aria-hidden />}

        {showList && (
          <div className="dx-results" id={`${listId}-list`} role="listbox">
            {error ? (
              <div className="dx-empty">{error}</div>
            ) : !hits.length ? (
              <div className="dx-empty">{loading || results.key !== searchKey ? 'Mencari…' : 'Tidak ada yang cocok.'}</div>
            ) : (
              hits.map((h, i) => {
                const key = keyOf(h);
                const added = has(h);
                return (
                  <div key={key} className={`dx-result${i === active ? ' active' : ''}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      className="dx-result-main"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => add(h)}
                      disabled={added}
                    >
                      <CodeBadge system={h.system} code={h.code} />
                      <span className="dx-result-text">
                        <span className="dx-result-name">{h.nameId ?? h.display}</span>
                        {h.nameId && <span className="dx-result-sub">{h.display}</span>}
                      </span>
                      {added && <span className="dx-added">Sudah ditambahkan</span>}
                    </button>
                    <button
                      type="button"
                      className={`dx-info${peek === key ? ' open' : ''}`}
                      onClick={() => setPeek(peek === key ? null : key)}
                      aria-label={`Penjelasan ${h.code}`}
                      title="Penjelasan"
                    >
                      <span className="material-symbols-rounded">info</span>
                    </button>
                    {peek === key && (
                      <div className="dx-result-explain">
                        <DiagnosisExplanation system={h.system} code={h.code} onAddEquivalent={add} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {value.length > 0 ? (
        <ul className="dx-selected">
          {value.map((d) => {
            const key = keyOf(d);
            return (
              <li key={key} className={d.primary ? 'primary' : ''}>
                <div className="dx-selected-row">
                  <CodeBadge system={d.system} code={d.code} />
                  <div className="dx-selected-text">
                    <div className="dx-result-name">
                      {d.nameId ?? d.display}
                      <span className="dx-system-tag">{TERMINOLOGY_LABEL[d.system]}</span>
                    </div>
                    {d.nameId && <div className="dx-result-sub">{d.display}</div>}
                  </div>
                  <div className="dx-selected-actions">
                    {d.primary ? (
                      <span className="dx-primary-badge">Diagnosis utama</span>
                    ) : (
                      <button type="button" className="dx-link" onClick={() => makePrimary(d)} disabled={disabled}>
                        Jadikan utama
                      </button>
                    )}
                    <button
                      type="button"
                      className={`dx-info${expanded === key ? ' open' : ''}`}
                      onClick={() => setExpanded(expanded === key ? null : key)}
                      aria-label={`Penjelasan ${d.code}`}
                      title="Penjelasan"
                    >
                      <span className="material-symbols-rounded">info</span>
                    </button>
                    <button
                      type="button"
                      className="dx-remove"
                      onClick={() => remove(d)}
                      disabled={disabled}
                      aria-label={`Hapus ${d.code}`}
                      title="Hapus"
                    >
                      <span className="material-symbols-rounded">close</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  className="dx-note"
                  value={d.note ?? ''}
                  onChange={(e) => setNote(d, e.target.value)}
                  placeholder="Catatan (opsional), mis. gigi 36"
                  maxLength={255}
                  disabled={disabled}
                />
                {expanded === key && <DiagnosisExplanation system={d.system} code={d.code} onAddEquivalent={add} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dx-none">Belum ada diagnosis terkode. Diagnosis pertama otomatis menjadi diagnosis utama.</p>
      )}
    </div>
  );
}

/** Read-only list for the saved SOAP note. */
export function DiagnosisListView({ diagnoses }: { diagnoses?: SoapDiagnosis[] | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!diagnoses?.length) return <p className="rm-view-empty">Belum ada diagnosis terkode</p>;
  return (
    <ul className="dx-selected dx-readonly">
      {diagnoses.map((d) => {
        const key = `${d.system}:${d.code}`;
        return (
          <li key={key} className={d.primary ? 'primary' : ''}>
            <div className="dx-selected-row">
              <CodeBadge system={d.system} code={d.code} />
              <div className="dx-selected-text">
                <div className="dx-result-name">
                  {d.nameId ?? d.display}
                  <span className="dx-system-tag">{TERMINOLOGY_LABEL[d.system]}</span>
                </div>
                {d.nameId && <div className="dx-result-sub">{d.display}</div>}
                {d.note && <div className="dx-view-note">{d.note}</div>}
              </div>
              <div className="dx-selected-actions">
                {d.primary && <span className="dx-primary-badge">Diagnosis utama</span>}
                <button
                  type="button"
                  className={`dx-info${expanded === key ? ' open' : ''}`}
                  onClick={() => setExpanded(expanded === key ? null : key)}
                  aria-label={`Penjelasan ${d.code}`}
                  title="Penjelasan"
                >
                  <span className="material-symbols-rounded">info</span>
                </button>
              </div>
            </div>
            {expanded === key && <DiagnosisExplanation system={d.system} code={d.code} />}
          </li>
        );
      })}
    </ul>
  );
}
