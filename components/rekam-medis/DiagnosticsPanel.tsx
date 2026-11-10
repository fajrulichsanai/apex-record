'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { useToast } from '@/lib/toast-context';
import {
  autoInterpretation,
  diagnosticsApi,
  FASTING_OPTIONS,
  INTERPRETATION_LABEL,
  LAB_STATUS_LABEL,
  RAD_STATUS_LABEL,
  type FastingStatus,
  type LabInterpretation,
  type LabOrder,
  type LabResultInput,
  type LabTest,
  type LabTestDetail,
  type RadiologyOrder,
  type RadiologyTest,
} from '@/lib/diagnostics';
import './DiagnosticsPanel.css';

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';

// ── Pencarian katalog (lab / radiologi) ───────────────────────────────────

function CatalogSearch<T extends { code: string; name: string | null; display: string | null; category: string | null }>({
  label,
  placeholder,
  search,
  onPick,
  extra,
}: {
  label: string;
  placeholder: string;
  search: (q: string) => Promise<T[]>;
  onPick: (item: T) => void;
  extra?: (item: T) => string | null;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ key: string; items: T[] }>({ key: '', items: [] });
  const [error, setError] = useState('');
  const term = q.trim();

  useEffect(() => {
    if (term.length < 2) return;
    let alive = true;
    const t = window.setTimeout(() => {
      search(term)
        .then((items) => alive && (setHits({ key: term, items }), setError('')))
        .catch((err) => alive && setError(errMsg(err, 'Pencarian gagal')));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [term, search]);

  const items = term.length >= 2 && hits.key === term ? hits.items : [];
  return (
    <div className="pp-search">
      <input
        type="text"
        aria-label={label}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {term.length >= 2 && (
        <ul className="pp-results" aria-label={`Hasil ${label}`}>
          {error && <li className="pp-msg pp-error">{error}</li>}
          {!error && hits.key !== term && <li className="pp-msg">Mencari…</li>}
          {!error && hits.key === term && !items.length && <li className="pp-msg">Tidak ditemukan</li>}
          {items.map((it) => (
            <li key={it.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(it);
                  setQ('');
                }}
              >
                <strong>{it.name ?? it.display}</strong>
                <span className="pp-muted">
                  {[it.category, extra?.(it), `LOINC ${it.code}`].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Form hasil lab ────────────────────────────────────────────────────────

type ParamDraft = { value: string; code: string; text: string; low: string; high: string; interp: string };

function LabResultForm({
  order,
  onSave,
  onCancel,
  saving,
}: {
  order: LabOrder;
  onSave: (results: LabResultInput[], conclusion: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [detail, setDetail] = useState<LabTestDetail | null>(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ParamDraft>>({});
  const [conclusion, setConclusion] = useState(order.conclusion ?? '');

  useEffect(() => {
    let alive = true;
    diagnosticsApi
      .labDetail(order.code)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        const init: Record<string, ParamDraft> = {};
        for (const r of order.results) {
          init[r.code] = {
            value: r.valueNumber !== null ? String(Number(r.valueNumber)) : '',
            code: r.valueCode ?? '',
            text: r.valueText ?? '',
            low: r.refLow !== null ? String(Number(r.refLow)) : '',
            high: r.refHigh !== null ? String(Number(r.refHigh)) : '',
            interp: r.interpretation ?? '',
          };
        }
        setDrafts(init);
      })
      .catch((err) => alive && setError(errMsg(err, 'Gagal memuat parameter')));
    return () => {
      alive = false;
    };
  }, [order]);

  if (error) return <p className="pp-msg pp-error">{error}</p>;
  if (!detail) return <p className="pp-msg">Memuat parameter…</p>;

  const params = detail.results.length ? detail.results : [{ ...detail }];
  const draft = (code: string): ParamDraft =>
    drafts[code] ?? { value: '', code: '', text: '', low: '', high: '', interp: '' };
  const set = (code: string, patch: Partial<ParamDraft>) =>
    setDrafts((d) => ({ ...d, [code]: { ...draft(code), ...patch } }));

  const kindOf = (p: LabTest & { answers: { code: string }[] }) =>
    p.answers.length ? 'coded' : p.scale === 'Narrative' || (!p.unit && p.scale !== 'Quantitative') ? 'text' : 'number';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const results: LabResultInput[] = [];
    for (const p of params) {
      const d = draft(p.code);
      const kind = kindOf(p);
      const low = d.low.trim() === '' ? undefined : Number(d.low.replace(',', '.'));
      const high = d.high.trim() === '' ? undefined : Number(d.high.replace(',', '.'));
      if (kind === 'number' && d.value.trim() !== '') {
        const v = Number(d.value.replace(',', '.'));
        results.push({
          code: p.code,
          valueNumber: v,
          ...(low !== undefined ? { refLow: low } : {}),
          ...(high !== undefined ? { refHigh: high } : {}),
          ...((d.interp || autoInterpretation(v, low, high))
            ? { interpretation: (d.interp || autoInterpretation(v, low, high)) as LabInterpretation }
            : {}),
        });
      } else if (kind === 'coded' && d.code) {
        results.push({ code: p.code, valueCode: d.code, ...(d.interp ? { interpretation: d.interp as LabInterpretation } : {}) });
      } else if (kind === 'text' && d.text.trim()) {
        results.push({ code: p.code, valueText: d.text.trim() });
      }
    }
    onSave(results, conclusion);
  };

  return (
    <form className="pp-result-form" onSubmit={submit} aria-label={`Hasil ${order.nameId}`}>
      <table className="pp-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Hasil</th>
            <th>Nilai rujukan</th>
            <th>Interpretasi</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => {
            const d = draft(p.code);
            const kind = kindOf(p);
            const v = Number(d.value.replace(',', '.'));
            const auto =
              kind === 'number' && d.value.trim() !== ''
                ? autoInterpretation(
                    v,
                    d.low.trim() === '' ? undefined : Number(d.low.replace(',', '.')),
                    d.high.trim() === '' ? undefined : Number(d.high.replace(',', '.')),
                  )
                : undefined;
            return (
              <tr key={p.code}>
                <td data-label="Parameter">
                  <strong>{p.name ?? p.display}</strong>
                  <span className="pp-muted">{p.display}</span>
                </td>
                <td data-label="Hasil">
                  {kind === 'number' && (
                    <span className="pp-unit">
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        aria-label={`Hasil ${p.name ?? p.display}`}
                        value={d.value}
                        onChange={(e) => set(p.code, { value: e.target.value })}
                      />
                      {p.unit && <span>{p.unit}</span>}
                    </span>
                  )}
                  {kind === 'coded' && (
                    <select
                      aria-label={`Hasil ${p.name ?? p.display}`}
                      value={d.code}
                      onChange={(e) => set(p.code, { code: e.target.value })}
                    >
                      <option value="">— Pilih —</option>
                      {p.answers.map((a) => (
                        <option key={a.code} value={a.code}>
                          {a.display}
                        </option>
                      ))}
                    </select>
                  )}
                  {kind === 'text' && (
                    <input
                      type="text"
                      aria-label={`Hasil ${p.name ?? p.display}`}
                      value={d.text}
                      onChange={(e) => set(p.code, { text: e.target.value })}
                    />
                  )}
                </td>
                <td data-label="Nilai rujukan">
                  {kind === 'number' ? (
                    <span className="pp-range">
                      <input
                        type="number"
                        step="any"
                        aria-label={`Batas bawah ${p.name ?? p.display}`}
                        placeholder="min"
                        value={d.low}
                        onChange={(e) => set(p.code, { low: e.target.value })}
                      />
                      –
                      <input
                        type="number"
                        step="any"
                        aria-label={`Batas atas ${p.name ?? p.display}`}
                        placeholder="maks"
                        value={d.high}
                        onChange={(e) => set(p.code, { high: e.target.value })}
                      />
                    </span>
                  ) : (
                    <span className="pp-muted">—</span>
                  )}
                </td>
                <td data-label="Interpretasi">
                  {kind === 'text' ? (
                    <span className="pp-muted">—</span>
                  ) : (
                    <select
                      aria-label={`Interpretasi ${p.name ?? p.display}`}
                      value={d.interp}
                      onChange={(e) => set(p.code, { interp: e.target.value })}
                    >
                      <option value="">{auto ? `Otomatis: ${INTERPRETATION_LABEL[auto]}` : '—'}</option>
                      {(Object.keys(INTERPRETATION_LABEL) as LabInterpretation[]).map((k) => (
                        <option key={k} value={k}>
                          {INTERPRETATION_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label className="pp-field">
        Kesimpulan
        <textarea
          rows={2}
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="opsional, mis. hiperglikemia"
        />
      </label>
      <div className="pp-actions-row">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan hasil'}
        </button>
      </div>
    </form>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────

type Removal = { kind: 'lab' | 'rad'; id: number; label: string };

/**
 * Pemeriksaan laboratorium & radiologi kunjungan ini (katalog LOINC resmi
 * SATUSEHAT): permintaan → spesimen → hasil → laporan. Terkirim bersama
 * kunjungan; kirim ulang memperbarui data yang sama.
 */
export default function DiagnosticsPanel({ encounterId }: { encounterId: number }) {
  const { success, error } = useToast();
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [rads, setRads] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pickedLab, setPickedLab] = useState<LabTest | null>(null);
  const [fasting, setFasting] = useState<FastingStatus>('not_required');
  const [labNote, setLabNote] = useState('');
  const [resulting, setResulting] = useState<number | null>(null);
  const [radEditing, setRadEditing] = useState<number | null>(null);
  const [radDraft, setRadDraft] = useState({ resultText: '', conclusion: '' });
  const [saving, setSaving] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);

  const reload = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([diagnosticsApi.listLab(encounterId), diagnosticsApi.listRadiology(encounterId)]);
      setLabs(l);
      setRads(r);
      setLoadError('');
    } catch (err) {
      setLoadError(errMsg(err, 'Gagal memuat pemeriksaan penunjang'));
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setSaving(true);
    try {
      await fn();
      await reload();
      success(done);
      return true;
    } catch (err) {
      error(errMsg(err, 'Gagal menyimpan'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const searchLab = useCallback((q: string) => diagnosticsApi.searchLab(q), []);
  const searchRad = useCallback((q: string) => diagnosticsApi.searchRadiology(q), []);

  if (loading) return <div className="rm-loading">Memuat pemeriksaan penunjang…</div>;
  if (loadError) return <div className="rm-loading error">{loadError}</div>;

  return (
    <div className="pp-panel">
      {/* ── Laboratorium ── */}
      <section className="pp-card" aria-labelledby="pp-lab-title">
        <div className="pp-card-head">
          <h3 id="pp-lab-title">Laboratorium</h3>
          <p>Permintaan dan hasil pemeriksaan lab (kode LOINC resmi SATUSEHAT).</p>
        </div>

        {pickedLab ? (
          <form
            className="pp-new"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(
                () => diagnosticsApi.createLab(encounterId, { code: pickedLab.code, fasting, note: labNote.trim() || undefined }),
                'Permintaan lab ditambahkan',
              );
              if (ok) {
                setPickedLab(null);
                setLabNote('');
                setFasting('not_required');
              }
            }}
          >
            <div className="pp-picked">
              <strong>{pickedLab.name ?? pickedLab.display}</strong>
              <span className="pp-muted">
                {[pickedLab.category, pickedLab.specimen && `Spesimen: ${pickedLab.specimen}`].filter(Boolean).join(' · ')}
              </span>
            </div>
            <label className="pp-field">
              Status puasa
              <select aria-label="Status puasa" value={fasting} onChange={(e) => setFasting(e.target.value as FastingStatus)}>
                {FASTING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pp-field">
              Catatan
              <input
                type="text"
                aria-label="Catatan permintaan lab"
                value={labNote}
                onChange={(e) => setLabNote(e.target.value)}
                placeholder="opsional"
              />
            </label>
            <div className="pp-actions-row">
              <button type="button" className="btn-outline" onClick={() => setPickedLab(null)} disabled={saving}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                Minta pemeriksaan
              </button>
            </div>
          </form>
        ) : (
          <CatalogSearch
            label="Cari pemeriksaan lab"
            placeholder="Cari pemeriksaan lab, mis. gula darah, hemoglobin, kolesterol"
            search={searchLab}
            onPick={setPickedLab}
            extra={(t) => (t.specimen ? `Spesimen: ${t.specimen}` : null)}
          />
        )}

        {labs.length === 0 ? (
          <p className="pp-empty">Belum ada permintaan lab.</p>
        ) : (
          <ul className="pp-list">
            {labs.map((o) => (
              <li key={o.id} className={`pp-item ${o.status === 'cancelled' ? 'cancelled' : ''}`}>
                <div className="pp-item-head">
                  <div>
                    <strong>{o.nameId}</strong>
                    <span className="pp-muted">
                      {[o.category, o.specimenType && `Spesimen: ${o.specimenType}`, `LOINC ${o.code}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <span className={`pp-status st-${o.status}`}>{LAB_STATUS_LABEL[o.status]}</span>
                </div>
                {o.specimenCollectedAt && (
                  <div className="pp-muted pp-small">Spesimen diambil {fmt(o.specimenCollectedAt)}</div>
                )}
                {o.results.length > 0 && resulting !== o.id && (
                  <ul className="pp-values">
                    {o.results.map((r) => (
                      <li key={r.id}>
                        <span>{r.nameId ?? r.display}</span>
                        <strong>
                          {r.valueNumber !== null
                            ? `${Number(r.valueNumber).toLocaleString('id-ID')} ${r.unit ?? ''}`
                            : (r.valueCodeDisplay ?? r.valueText)}
                        </strong>
                        {r.interpretation && (
                          <span className={`pp-flag f-${r.interpretation}`}>{INTERPRETATION_LABEL[r.interpretation]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {o.conclusion && resulting !== o.id && <div className="pp-note">Kesimpulan: {o.conclusion}</div>}
                {resulting === o.id ? (
                  <LabResultForm
                    order={o}
                    saving={saving}
                    onCancel={() => setResulting(null)}
                    onSave={async (results, conclusion) => {
                      if (!results.length) {
                        error('Isi minimal satu hasil');
                        return;
                      }
                      const ok = await run(
                        () => diagnosticsApi.saveLabResults(encounterId, o.id, { results, conclusion }),
                        'Hasil lab disimpan',
                      );
                      if (ok) setResulting(null);
                    }}
                  />
                ) : (
                  o.status !== 'cancelled' && (
                    <div className="pp-actions">
                      {o.status === 'ordered' && (
                        <button
                          type="button"
                          className="pp-link"
                          disabled={saving}
                          onClick={() =>
                            run(
                              () =>
                                diagnosticsApi.updateLab(encounterId, o.id, {
                                  specimenCollectedAt: new Date().toISOString(),
                                }),
                              'Pengambilan spesimen dicatat',
                            )
                          }
                        >
                          Spesimen diambil
                        </button>
                      )}
                      <button type="button" className="pp-link" onClick={() => setResulting(o.id)}>
                        {o.results.length ? 'Ubah hasil' : 'Isi hasil'}
                      </button>
                      <button
                        type="button"
                        className="pp-link danger"
                        disabled={saving}
                        onClick={() =>
                          run(() => diagnosticsApi.updateLab(encounterId, o.id, { status: 'cancelled' }), 'Permintaan dibatalkan')
                        }
                      >
                        Batalkan
                      </button>
                      {o.status === 'ordered' && (
                        <button
                          type="button"
                          className="pp-link danger"
                          onClick={() => setRemoval({ kind: 'lab', id: o.id, label: o.nameId })}
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Radiologi ── */}
      <section className="pp-card" aria-labelledby="pp-rad-title">
        <div className="pp-card-head">
          <h3 id="pp-rad-title">Radiologi</h3>
          <p>Permintaan dan bacaan radiologi, termasuk rontgen gigi (periapikal, panoramik, dll.).</p>
        </div>
        <CatalogSearch
          label="Cari pemeriksaan radiologi"
          placeholder="Cari pemeriksaan radiologi, mis. panoramik, periapikal, thorax"
          search={searchRad}
          onPick={(t: RadiologyTest) =>
            run(() => diagnosticsApi.createRadiology(encounterId, { code: t.code }), 'Permintaan radiologi ditambahkan')
          }
        />
        {rads.length === 0 ? (
          <p className="pp-empty">Belum ada permintaan radiologi.</p>
        ) : (
          <ul className="pp-list">
            {rads.map((o) => (
              <li key={o.id} className={`pp-item ${o.status === 'cancelled' ? 'cancelled' : ''}`}>
                <div className="pp-item-head">
                  <div>
                    <strong>{o.nameId}</strong>
                    <span className="pp-muted">
                      {o.modality} · No. akses {o.accessionNumber} · LOINC {o.code}
                    </span>
                  </div>
                  <span className={`pp-status st-${o.status}`}>{RAD_STATUS_LABEL[o.status]}</span>
                </div>
                {radEditing === o.id ? (
                  <form
                    className="pp-result-form"
                    aria-label={`Bacaan ${o.nameId}`}
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!radDraft.resultText.trim() && !radDraft.conclusion.trim()) {
                        error('Isi bacaan atau kesimpulan');
                        return;
                      }
                      const ok = await run(
                        () =>
                          diagnosticsApi.updateRadiology(encounterId, o.id, {
                            resultText: radDraft.resultText,
                            conclusion: radDraft.conclusion,
                          }),
                        'Hasil radiologi disimpan',
                      );
                      if (ok) setRadEditing(null);
                    }}
                  >
                    <label className="pp-field">
                      Bacaan / hasil
                      <textarea
                        rows={3}
                        value={radDraft.resultText}
                        onChange={(e) => setRadDraft((d) => ({ ...d, resultText: e.target.value }))}
                        placeholder="mis. Tampak radiolusen di apikal gigi 36"
                      />
                    </label>
                    <label className="pp-field">
                      Kesimpulan / kesan
                      <textarea
                        rows={2}
                        value={radDraft.conclusion}
                        onChange={(e) => setRadDraft((d) => ({ ...d, conclusion: e.target.value }))}
                        placeholder="mis. Abses periapikal gigi 36"
                      />
                    </label>
                    <div className="pp-actions-row">
                      <button type="button" className="btn-outline" onClick={() => setRadEditing(null)} disabled={saving}>
                        Batal
                      </button>
                      <button type="submit" className="btn-primary" disabled={saving}>
                        Simpan hasil
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {o.resultText && <div className="pp-note">{o.resultText}</div>}
                    {o.conclusion && <div className="pp-note">Kesan: {o.conclusion}</div>}
                    {o.status !== 'cancelled' && (
                      <div className="pp-actions">
                        <button
                          type="button"
                          className="pp-link"
                          onClick={() => {
                            setRadDraft({ resultText: o.resultText ?? '', conclusion: o.conclusion ?? '' });
                            setRadEditing(o.id);
                          }}
                        >
                          {o.resultText || o.conclusion ? 'Ubah hasil' : 'Isi hasil'}
                        </button>
                        <button
                          type="button"
                          className="pp-link danger"
                          disabled={saving}
                          onClick={() =>
                            run(
                              () => diagnosticsApi.updateRadiology(encounterId, o.id, { status: 'cancelled' }),
                              'Permintaan dibatalkan',
                            )
                          }
                        >
                          Batalkan
                        </button>
                        {o.status === 'ordered' && !o.resultText && !o.conclusion && (
                          <button
                            type="button"
                            className="pp-link danger"
                            onClick={() => setRemoval({ kind: 'rad', id: o.id, label: o.nameId })}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmationModal
        isOpen={!!removal}
        title="Hapus permintaan?"
        message={removal ? `Hapus permintaan ${removal.label}?` : ''}
        confirmLabel="Hapus"
        isDangerous
        onConfirm={async () => {
          const r = removal!;
          setRemoval(null);
          await run(
            () =>
              r.kind === 'lab'
                ? diagnosticsApi.removeLab(encounterId, r.id)
                : diagnosticsApi.removeRadiology(encounterId, r.id),
            'Permintaan dihapus',
          );
        }}
        onCancel={() => setRemoval(null)}
      />
    </div>
  );
}
