'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { useToast } from '@/lib/toast-context';
import { useFeatures } from '@/lib/features-context';
import { terminologyApi, TERMINOLOGY_LABEL, type TerminologyHit, type TerminologySystem } from '@/lib/terminology';
import {
  clinicalRecordsApi,
  formatDate,
  labelOf,
  observationValueText,
  type ClinicalObservation,
  type ClinicalRecordOptions,
  type ConditionPayload,
  type ObservationType,
  type PatientCondition,
  type SyncState,
} from '@/lib/clinical-records';
import './ClinicalRecordsPanel.css';

const SYNC_LABEL: Record<SyncState, string> = {
  synced: 'Terkirim',
  pending: 'Belum terkirim',
  failed: 'Gagal kirim',
};

function SyncBadge({ status, error }: { status: SyncState; error: string | null }) {
  return (
    <span className={`cr-sync cr-sync-${status}`} title={error ?? undefined}>
      <span aria-hidden="true" className="material-symbols-rounded">
        {status === 'synced' ? 'cloud_done' : status === 'failed' ? 'error' : 'cloud_upload'}
      </span>
      {SYNC_LABEL[status]}
    </span>
  );
}

/** Tanggal hari ini (zona waktu perangkat) untuk batas input tanggal */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Nilai untuk <input type="datetime-local"> */
const localDateTime = (date = new Date()) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

// ── Pencarian kode ICD-10 / SNOMED (satu pilihan) ─────────────────────────

function CodeSearch({ onPick, disabled }: { onPick: (hit: TerminologyHit) => void; disabled?: boolean }) {
  const id = useId();
  const [system, setSystem] = useState<TerminologySystem>('icd10');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<{ key: string; items: TerminologyHit[] }>({ key: '', items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const q = query.trim();
  const key = `${system}:${q}`;

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      terminologyApi
        .search(system, q, 10)
        .then((items) => {
          if (!alive) return;
          setHits({ key: `${system}:${q}`, items });
          setError('');
        })
        .catch((err) => alive && setError(errMsg(err, 'Pencarian gagal')))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [system, q]);

  const items = q.length >= 2 && hits.key === key ? hits.items : [];

  return (
    <div className="cr-code-search">
      <div className="cr-code-head">
        <label htmlFor={`${id}-q`}>Cari penyakit / kondisi</label>
        <div className="cr-tabs" role="tablist" aria-label="Sistem kode kondisi">
          {(['icd10', 'snomed'] as TerminologySystem[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={system === s}
              className={system === s ? 'active' : ''}
              onClick={() => setSystem(s)}
              disabled={disabled}
            >
              {TERMINOLOGY_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <input
        id={`${id}-q`}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={system === 'icd10' ? 'mis. hipertensi, diabetes, I10' : 'mis. asma, 195967001'}
        disabled={disabled}
        autoComplete="off"
      />
      {q.length >= 2 && (
        <ul className="cr-code-results" aria-label="Hasil pencarian kode">
          {loading && !items.length && <li className="cr-muted">Mencari…</li>}
          {error && <li className="cr-error">{error}</li>}
          {!loading && !error && !items.length && <li className="cr-muted">Tidak ditemukan</li>}
          {items.map((h) => (
            <li key={h.code}>
              <button
                type="button"
                onClick={() => {
                  onPick(h);
                  setQuery('');
                }}
              >
                <span className="cr-code">{h.code}</span>
                <span>
                  {h.nameId && <strong>{h.nameId}</strong>}
                  <span className={h.nameId ? 'cr-muted' : ''}>{h.display}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Form kondisi (tambah & ubah) ──────────────────────────────────────────

type ConditionDraft = Required<{ [K in keyof ConditionPayload]: string }>;

const emptyDraft = (): ConditionDraft => ({
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  severity: '',
  onsetDate: '',
  abatementDate: '',
  note: '',
});

function ConditionForm({
  options,
  initial,
  picked,
  onPickCode,
  onCancel,
  onSubmit,
  saving,
}: {
  options: ClinicalRecordOptions;
  initial?: PatientCondition;
  picked?: TerminologyHit | null;
  onPickCode?: (hit: TerminologyHit | null) => void;
  onCancel: () => void;
  onSubmit: (payload: ConditionPayload) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<ConditionDraft>(() =>
    initial
      ? {
          clinicalStatus: initial.clinicalStatus,
          verificationStatus: initial.verificationStatus,
          severity: initial.severity ?? '',
          onsetDate: initial.onsetDate ?? '',
          abatementDate: initial.abatementDate ?? '',
          note: initial.note ?? '',
        }
      : emptyDraft(),
  );
  const set = (k: keyof ConditionDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const abated = options.abatedStatuses.includes(draft.clinicalStatus);
  const max = today();
  const needsCode = !initial && !picked;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      clinicalStatus: draft.clinicalStatus,
      verificationStatus: draft.verificationStatus,
      severity: draft.severity || null,
      onsetDate: draft.onsetDate || null,
      abatementDate: abated ? draft.abatementDate || null : null,
      note: draft.note.trim() || null,
    });
  };

  return (
    <form className="cr-form" onSubmit={submit} aria-label={initial ? 'Ubah kondisi' : 'Tambah kondisi'}>
      {!initial && (
        <div className="cr-span-2">
          {picked ? (
            <div className="cr-picked">
              <span className="cr-code">{picked.code}</span>
              <span>
                <strong>{picked.nameId ?? picked.display}</strong>
                {picked.nameId && <span className="cr-muted"> · {picked.display}</span>}
              </span>
              <button type="button" className="cr-link" onClick={() => onPickCode?.(null)}>
                Ganti
              </button>
            </div>
          ) : (
            <CodeSearch onPick={(h) => onPickCode?.(h)} disabled={saving} />
          )}
        </div>
      )}
      <label>
        Status
        <select
          aria-label="Status kondisi"
          value={draft.clinicalStatus}
          onChange={(e) => set('clinicalStatus', e.target.value)}
        >
          {options.clinicalStatuses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kepastian
        <select
          aria-label="Kepastian kondisi"
          value={draft.verificationStatus}
          onChange={(e) => set('verificationStatus', e.target.value)}
        >
          {options.verificationStatuses.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tingkat keparahan
        <select aria-label="Tingkat keparahan" value={draft.severity} onChange={(e) => set('severity', e.target.value)}>
          <option value="">— Tidak diisi —</option>
          {options.severities.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Mulai sejak
        <input
          type="date"
          aria-label="Mulai sejak"
          value={draft.onsetDate}
          max={max}
          onChange={(e) => set('onsetDate', e.target.value)}
        />
      </label>
      {abated && (
        <label>
          Tanggal sembuh / berhenti
          <input
            type="date"
            aria-label="Tanggal sembuh"
            value={draft.abatementDate}
            min={draft.onsetDate || undefined}
            max={max}
            onChange={(e) => set('abatementDate', e.target.value)}
          />
          {draft.clinicalStatus === 'resolved' && !draft.abatementDate && (
            <small>Kosong = hari ini</small>
          )}
        </label>
      )}
      <label className="cr-span-2">
        Catatan
        <input
          type="text"
          aria-label="Catatan kondisi"
          value={draft.note}
          maxLength={500}
          placeholder="opsional, mis. terkontrol dengan amlodipin 5 mg"
          onChange={(e) => set('note', e.target.value)}
        />
      </label>
      <div className="cr-form-actions cr-span-2">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={saving || needsCode}>
          {saving ? 'Menyimpan…' : initial ? 'Simpan perubahan' : 'Tambahkan'}
        </button>
      </div>
    </form>
  );
}

// ── Form observasi ────────────────────────────────────────────────────────

function ObservationForm({
  options,
  initial,
  suggestedBmi,
  onCancel,
  onSubmit,
  saving,
}: {
  options: ClinicalRecordOptions;
  initial?: ClinicalObservation;
  suggestedBmi: number | null;
  onCancel: () => void;
  onSubmit: (key: string, payload: { value?: number | null; valueCode?: string | null; effectiveAt: string; note: string | null }) => void;
  saving: boolean;
}) {
  const [key, setKey] = useState(initial?.observationKey ?? '');
  const [value, setValue] = useState(initial?.valueNumber != null ? String(initial.valueNumber) : '');
  const [valueCode, setValueCode] = useState(initial?.valueCode ?? '');
  const [when, setWhen] = useState(localDateTime(initial ? new Date(initial.effectiveAt) : new Date()));
  const [note, setNote] = useState(initial?.note ?? '');
  const type = options.observations.find((o) => o.key === key);

  const groups = useMemo(() => {
    const map = new Map<string, ObservationType[]>();
    for (const o of options.observations) map.set(o.group, [...(map.get(o.group) ?? []), o]);
    return [...map.entries()];
  }, [options.observations]);

  const num = value.trim() === '' ? null : Number(value.replace(',', '.'));
  const outOfRange =
    type?.kind === 'quantity' &&
    num !== null &&
    (Number.isNaN(num) || (type.min !== null && num < type.min) || (type.max !== null && num > type.max));
  const ready = !!type && (type.kind === 'coded' ? !!valueCode : num !== null && !outOfRange);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !ready) return;
    onSubmit(type.key, {
      ...(type.kind === 'coded' ? { valueCode } : { value: num }),
      effectiveAt: new Date(when).toISOString(),
      note: note.trim() || null,
    });
  };

  return (
    <form className="cr-form" onSubmit={submit} aria-label={initial ? 'Ubah observasi' : 'Tambah observasi'}>
      <label className="cr-span-2">
        Jenis pemeriksaan
        <select
          aria-label="Jenis observasi"
          value={key}
          disabled={!!initial}
          onChange={(e) => {
            setKey(e.target.value);
            setValue('');
            setValueCode('');
          }}
        >
          <option value="">— Pilih —</option>
          {groups.map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {type?.kind === 'quantity' && (
        <label>
          Hasil
          <span className="cr-input-unit">
            <input
              type="number"
              inputMode="decimal"
              aria-label={`Nilai ${type.label}`}
              value={value}
              step={type.decimals ? 1 / 10 ** type.decimals : 1}
              min={type.min ?? undefined}
              max={type.max ?? undefined}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={outOfRange || undefined}
            />
            {type.unit && <span>{type.unit}</span>}
          </span>
          <small className={outOfRange ? 'cr-error' : undefined}>
            Rentang wajar {type.min}–{type.max} {type.unit}
          </small>
          {type.key === 'bmi' && suggestedBmi !== null && (
            <button type="button" className="cr-link" onClick={() => setValue(String(suggestedBmi))}>
              Hitung dari TB/BB: {suggestedBmi.toLocaleString('id-ID')}
            </button>
          )}
        </label>
      )}

      {type?.kind === 'coded' && (
        <fieldset className="cr-span-2 cr-choices">
          <legend>Hasil</legend>
          {type.answers?.map((a) => (
            <label key={a.code} className={valueCode === a.code ? 'active' : ''}>
              <input
                type="radio"
                name={`obs-${type.key}`}
                value={a.code}
                checked={valueCode === a.code}
                onChange={() => setValueCode(a.code)}
              />
              {a.label}
            </label>
          ))}
        </fieldset>
      )}

      {type && (
        <>
          <label>
            Waktu pemeriksaan
            <input
              type="datetime-local"
              aria-label="Waktu pemeriksaan"
              value={when}
              max={localDateTime()}
              onChange={(e) => setWhen(e.target.value)}
            />
          </label>
          <label className="cr-span-2">
            Catatan
            <input
              type="text"
              aria-label="Catatan observasi"
              value={note}
              maxLength={500}
              placeholder="opsional"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </>
      )}

      <div className="cr-form-actions cr-span-2">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={saving || !ready}>
          {saving ? 'Menyimpan…' : initial ? 'Simpan perubahan' : 'Tambahkan'}
        </button>
      </div>
    </form>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────

type Removal = { kind: 'condition' | 'observation'; id: number; label: string; sent: boolean };

/**
 * Kondisi & Observasi — daftar masalah pasien (Condition) dan observasi
 * tambahan (Observation) dengan kode baku, siap dikirim ke SATUSEHAT.
 */
export default function ClinicalRecordsPanel({
  encounterId,
  heightCm,
  weightKg,
}: {
  encounterId: number;
  heightCm?: number | null;
  weightKg?: number | null;
}) {
  const { success, error } = useToast();
  const { can } = useFeatures();
  const [options, setOptions] = useState<ClinicalRecordOptions | null>(null);
  const [conditions, setConditions] = useState<PatientCondition[]>([]);
  const [observations, setObservations] = useState<ClinicalObservation[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [adding, setAdding] = useState<'condition' | 'observation' | null>(null);
  const [picked, setPicked] = useState<TerminologyHit | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  /** Penghapusan data terkirim yang pembatalannya belum dikirim */
  const [removalPending, setRemovalPending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const [opts, data] = await Promise.all([clinicalRecordsApi.options(), clinicalRecordsApi.forEncounter(encounterId)]);
      if (!mounted.current) return;
      setOptions(opts);
      setConditions(data.conditions);
      setObservations(data.observations);
      setLoadError('');
    } catch (err) {
      if (mounted.current) setLoadError(errMsg(err, 'Gagal memuat kondisi & observasi'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const suggestedBmi =
    heightCm && weightKg && heightCm > 0 ? Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10 : null;

  const typeOf = (key: string) => options?.observations.find((o) => o.key === key);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setSaving(true);
    try {
      await fn();
      success(done);
      setAdding(null);
      setEditing(null);
      setPicked(null);
      await reload();
    } catch (err) {
      error(errMsg(err, 'Gagal menyimpan'));
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const r = await clinicalRecordsApi.send(encounterId);
      if (r.success) setRemovalPending(false);
      if (r.success) success(r.sent ? `${r.sent} data terkirim ke SATUSEHAT` : 'Tidak ada data baru untuk dikirim');
      else
        error(
          `Sebagian gagal dikirim: ${r.steps
            .filter((s) => s.status === 'failed')
            .map((s) => s.message)
            .filter(Boolean)
            .slice(0, 2)
            .join(' | ')}`,
        );
    } catch (err) {
      error(errMsg(err, 'Gagal mengirim ke SATUSEHAT'));
    } finally {
      if (mounted.current) setSending(false);
      await reload();
    }
  };

  const confirmRemove = async () => {
    if (!removal) return;
    const r = removal;
    setRemoval(null);
    await run(async () => {
      const res =
        r.kind === 'condition'
          ? await clinicalRecordsApi.removeCondition(encounterId, r.id)
          : await clinicalRecordsApi.removeObservation(encounterId, r.id);
      if (res.pendingSync) setRemovalPending(true);
    }, r.sent ? 'Dihapus — pembatalan akan dikirim ke SATUSEHAT' : 'Dihapus',
    );
  };

  if (loading) return <div className="rm-loading">Memuat kondisi & observasi…</div>;
  if (loadError || !options) return <div className="rm-loading error">{loadError || 'Gagal memuat'}</div>;

  const abated = (c: PatientCondition) => options.abatedStatuses.includes(c.clinicalStatus);
  const activeConditions = conditions.filter((c) => !abated(c));
  const pastConditions = conditions.filter(abated);
  const all = [...conditions, ...observations];
  const pending = all.filter((r) => r.syncStatus !== 'synced').length + (removalPending ? 1 : 0);
  const failed = all.filter((r) => r.syncStatus === 'failed').length;

  const renderCondition = (c: PatientCondition) => {
    const editKey = `c${c.id}`;
    if (editing === editKey) {
      return (
        <li key={c.id} className="cr-item editing">
          <div className="cr-item-title">
            <span className="cr-code">{c.code}</span>
            <strong>{c.nameId ?? c.display}</strong>
          </div>
          <ConditionForm
            options={options}
            initial={c}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSubmit={(p) => run(() => clinicalRecordsApi.updateCondition(encounterId, c.id, p), 'Kondisi diperbarui')}
          />
        </li>
      );
    }
    return (
      <li key={c.id} className={`cr-item ${abated(c) ? 'past' : ''}`}>
        <div className="cr-item-main">
          <div className="cr-item-title">
            <span className="cr-code" title={c.codeSystem === 'icd10' ? 'ICD-10' : 'SNOMED CT'}>
              {c.code}
            </span>
            <strong>{c.nameId ?? c.display}</strong>
          </div>
          {c.nameId && <div className="cr-muted cr-small">{c.display}</div>}
          <div className="cr-tags">
            <span className={`cr-tag status-${c.clinicalStatus}`}>{labelOf(options.clinicalStatuses, c.clinicalStatus)}</span>
            {c.verificationStatus !== 'confirmed' && (
              <span className="cr-tag">{labelOf(options.verificationStatuses, c.verificationStatus)}</span>
            )}
            {c.severity && <span className="cr-tag">{labelOf(options.severities, c.severity)}</span>}
            {c.onsetDate && <span className="cr-muted cr-small">Sejak {formatDate(c.onsetDate)}</span>}
            {c.abatementDate && <span className="cr-muted cr-small">Sembuh {formatDate(c.abatementDate)}</span>}
          </div>
          {c.note && <div className="cr-note">{c.note}</div>}
          {c.syncStatus === 'failed' && c.syncError && <div className="cr-error cr-small">{c.syncError}</div>}
        </div>
        <div className="cr-item-side">
          <SyncBadge status={c.syncStatus} error={c.syncError} />
          <div className="cr-actions">
            {!abated(c) && (
              <button
                type="button"
                className="cr-link"
                disabled={saving}
                onClick={() =>
                  run(
                    () => clinicalRecordsApi.updateCondition(encounterId, c.id, { clinicalStatus: 'resolved' }),
                    'Ditandai sembuh',
                  )
                }
              >
                Tandai sembuh
              </button>
            )}
            <button type="button" className="cr-link" onClick={() => setEditing(editKey)} aria-label={`Ubah ${c.nameId ?? c.display}`}>
              Ubah
            </button>
            <button
              type="button"
              className="cr-link danger"
              aria-label={`Hapus ${c.nameId ?? c.display}`}
              onClick={() => setRemoval({ kind: 'condition', id: c.id, label: c.nameId ?? c.display, sent: !!c.satusehatId })}
            >
              Hapus
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="cr-panel">
      <div className="cr-sync-bar">
        <div>
          <strong>SATUSEHAT</strong>
          <span className="cr-muted">
            {all.length === 0 && !removalPending
              ? 'Belum ada data'
              : pending === 0
                ? 'Semua data sudah terkirim'
                : `${pending} data belum terkirim${failed ? ` (${failed} gagal)` : ''} — terkirim otomatis saat kunjungan selesai`}
          </span>
        </div>
        {can('satusehat') && (all.length > 0 || removalPending) && (
          <button type="button" className="btn-outline" onClick={sendNow} disabled={sending || pending === 0}>
            <span aria-hidden="true" className="material-symbols-rounded">
              cloud_upload
            </span>
            {sending ? 'Mengirim…' : 'Kirim sekarang'}
          </button>
        )}
      </div>

      {/* ── Kondisi ── */}
      <section className="cr-card" aria-labelledby="cr-cond-title">
        <div className="cr-card-head">
          <div>
            <h3 id="cr-cond-title">Daftar Masalah Pasien</h3>
            <p>
              Penyakit kronis / kondisi yang dipantau lintas kunjungan (mis. hipertensi, diabetes, asma). Diagnosis
              kunjungan ini tetap diisi di Catatan SOAP.
            </p>
          </div>
          {adding !== 'condition' && (
            <button type="button" className="btn-outline" onClick={() => setAdding('condition')}>
              <span aria-hidden="true" className="material-symbols-rounded">
                add
              </span>
              Tambah kondisi
            </button>
          )}
        </div>

        {adding === 'condition' && (
          <div className="cr-item editing">
            <ConditionForm
              options={options}
              picked={picked}
              onPickCode={setPicked}
              saving={saving}
              onCancel={() => {
                setAdding(null);
                setPicked(null);
              }}
              onSubmit={(p) =>
                picked &&
                run(
                  () => clinicalRecordsApi.createCondition(encounterId, { system: picked.system, code: picked.code, ...p }),
                  'Kondisi ditambahkan',
                )
              }
            />
          </div>
        )}

        {activeConditions.length === 0 && adding !== 'condition' ? (
          <p className="cr-empty">Belum ada kondisi aktif.</p>
        ) : (
          <ul className="cr-list">{activeConditions.map(renderCondition)}</ul>
        )}

        {pastConditions.length > 0 && (
          <>
            <button type="button" className="cr-link cr-toggle" onClick={() => setShowResolved((v) => !v)}>
              {showResolved ? 'Sembunyikan' : 'Tampilkan'} riwayat kondisi yang sudah sembuh ({pastConditions.length})
            </button>
            {showResolved && <ul className="cr-list">{pastConditions.map(renderCondition)}</ul>}
          </>
        )}
      </section>

      {/* ── Observasi ── */}
      <section className="cr-card" aria-labelledby="cr-obs-title">
        <div className="cr-card-head">
          <div>
            <h3 id="cr-obs-title">Observasi Tambahan</h3>
            <p>
              Pengukuran di luar tanda vital: IMT, lingkar perut/kepala, GCS, status merokok, cek gula darah/kolesterol
              dengan alat cepat. Tanda vital tetap di Pemeriksaan Fisik.
            </p>
          </div>
          {adding !== 'observation' && (
            <button type="button" className="btn-outline" onClick={() => setAdding('observation')}>
              <span aria-hidden="true" className="material-symbols-rounded">
                add
              </span>
              Tambah observasi
            </button>
          )}
        </div>

        {adding === 'observation' && (
          <div className="cr-item editing">
            <ObservationForm
              options={options}
              suggestedBmi={suggestedBmi}
              saving={saving}
              onCancel={() => setAdding(null)}
              onSubmit={(key, p) =>
                run(() => clinicalRecordsApi.createObservation(encounterId, { observationKey: key, ...p }), 'Observasi ditambahkan')
              }
            />
          </div>
        )}

        {observations.length === 0 && adding !== 'observation' ? (
          <p className="cr-empty">Belum ada observasi tambahan di kunjungan ini.</p>
        ) : (
          <ul className="cr-list">
            {observations.map((o) => {
              const type = typeOf(o.observationKey);
              const editKey = `o${o.id}`;
              if (editing === editKey) {
                return (
                  <li key={o.id} className="cr-item editing">
                    <ObservationForm
                      options={options}
                      initial={o}
                      suggestedBmi={suggestedBmi}
                      saving={saving}
                      onCancel={() => setEditing(null)}
                      onSubmit={(_key, p) =>
                        run(() => clinicalRecordsApi.updateObservation(encounterId, o.id, p), 'Observasi diperbarui')
                      }
                    />
                  </li>
                );
              }
              return (
                <li key={o.id} className="cr-item">
                  <div className="cr-item-main">
                    <div className="cr-item-title">
                      <strong>{type?.label ?? o.observationKey}</strong>
                      <span className="cr-value">{observationValueText(type, o)}</span>
                    </div>
                    <div className="cr-muted cr-small">
                      {new Date(o.effectiveAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      {type && ` · LOINC ${type.loinc}`}
                    </div>
                    {o.note && <div className="cr-note">{o.note}</div>}
                    {o.syncStatus === 'failed' && o.syncError && <div className="cr-error cr-small">{o.syncError}</div>}
                  </div>
                  <div className="cr-item-side">
                    <SyncBadge status={o.syncStatus} error={o.syncError} />
                    <div className="cr-actions">
                      <button type="button" className="cr-link" onClick={() => setEditing(editKey)} aria-label={`Ubah ${type?.label}`}>
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="cr-link danger"
                        aria-label={`Hapus ${type?.label}`}
                        onClick={() =>
                          setRemoval({ kind: 'observation', id: o.id, label: type?.label ?? 'observasi', sent: !!o.satusehatId })
                        }
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmationModal
        isOpen={!!removal}
        title="Hapus data?"
        message={
          removal
            ? removal.sent
              ? `${removal.label} sudah terkirim ke SATUSEHAT. Data akan ditandai "salah input" (entered-in-error) dan pembatalannya dikirim ke SATUSEHAT.`
              : `Hapus ${removal.label}?`
            : ''
        }
        confirmLabel="Hapus"
        isDangerous
        onConfirm={confirmRemove}
        onCancel={() => setRemoval(null)}
      />
    </div>
  );
}
