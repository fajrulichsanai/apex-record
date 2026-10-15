'use client';

import { useEffect, useMemo, useState } from 'react';
import { useEscapeKey } from '@/lib/a11y';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { ApiError } from '@/lib/api-client';
import { fillTemplate, soapTemplateApi, type SoapPreset, type SoapTemplate, type SoapTemplateBody } from '@/lib/soap-templates';
import type { SoapDiagnosis } from '@/lib/terminology';
import './SoapTemplatePicker.css';

export interface SoapValues {
  subjective: string;
  objective: string;
  assessment: string;
  treatment: string;
  plan: string;
  diagnoses: SoapDiagnosis[];
}

type Item = { id: string; name: string; group: string; body: SoapTemplateBody; own?: SoapTemplate };

/** Gabungkan diagnosis template ke daftar yang sudah ada tanpa duplikat. */
export function mergeDiagnoses(current: SoapDiagnosis[], incoming: SoapDiagnosis[] | null | undefined): SoapDiagnosis[] {
  const out = [...current];
  const hasPrimary = out.some((d) => d.primary);
  for (const d of incoming ?? []) {
    if (out.some((x) => x.system === d.system && x.code === d.code)) continue;
    out.push({ ...d, primary: hasPrimary ? false : d.primary });
  }
  return out;
}

/**
 * "Pakai template" & "Simpan sebagai template" untuk lembar SOAP. Template
 * bawaan (gigi) sudah membawa ICD-10 + SNOMED; `{gigi}` diganti nomor gigi.
 */
export default function SoapTemplatePicker({
  values,
  onApply,
  disabled,
}: {
  values: SoapValues;
  onApply: (next: SoapValues) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [open, setOpen] = useState<'pick' | 'save' | null>(null);
  const [presets, setPresets] = useState<SoapPreset[]>([]);
  const [mine, setMine] = useState<SoapTemplate[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const [gigi, setGigi] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [saveName, setSaveName] = useState('');
  const [saveShared, setSaveShared] = useState(false);
  const [busy, setBusy] = useState(false);

  useEscapeKey(() => setOpen(null), open !== null);

  useEffect(() => {
    if (open !== 'pick') return;
    Promise.all([soapTemplateApi.presets(), soapTemplateApi.list()])
      .then(([p, m]) => {
        setPresets(p);
        setMine(m);
      })
      .catch((err) => showError(err instanceof ApiError ? err.message : 'Gagal memuat template'));
  }, [open, showError]);

  const items = useMemo<Item[]>(() => {
    const own: Item[] = mine.map((t) => ({
      id: `t${t.id}`,
      name: t.name,
      group: t.isShared ? 'Template klinik' : 'Template saya',
      body: t,
      own: t,
    }));
    const builtin: Item[] = presets.map((p) => ({ id: p.key, name: p.name, group: `Bawaan · ${p.category}`, body: p }));
    const q = query.trim().toLowerCase();
    const all = [...own, ...builtin];
    return q
      ? all.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.body.diagnoses ?? []).some((d) => d.code.toLowerCase().includes(q) || (d.nameId ?? d.display).toLowerCase().includes(q)),
        )
      : all;
  }, [mine, presets, query]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) m.set(i.group, [...(m.get(i.group) ?? []), i]);
    return [...m.entries()];
  }, [items]);

  const usesGigi = selected
    ? ['subjective', 'objective', 'assessment', 'treatment', 'plan'].some((k) =>
        (selected.body[k as keyof SoapTemplateBody] as string | null | undefined)?.includes('{gigi}'),
      )
    : false;
  const hasContent = [values.subjective, values.objective, values.assessment, values.treatment, values.plan].some((v) => v.trim());

  const apply = () => {
    if (!selected) return;
    const b = selected.body;
    const join = (cur: string, add: string) => (mode === 'append' && cur.trim() ? `${cur.trim()}\n${add}`.trim() : add || cur);
    onApply({
      subjective: join(values.subjective, fillTemplate(b.subjective, gigi)),
      objective: join(values.objective, fillTemplate(b.objective, gigi)),
      assessment: join(values.assessment, fillTemplate(b.assessment, gigi)),
      treatment: join(values.treatment, fillTemplate(b.treatment, gigi)),
      plan: join(values.plan, fillTemplate(b.plan, gigi)),
      diagnoses: mergeDiagnoses(values.diagnoses, b.diagnoses),
    });
    success(`Template "${selected.name}" dipakai — periksa & sesuaikan sebelum disimpan`);
    setOpen(null);
    setSelected(null);
  };

  const remove = async (t: SoapTemplate) => {
    try {
      await soapTemplateApi.remove(t.id);
      setMine((m) => m.filter((x) => x.id !== t.id));
      if (selected?.own?.id === t.id) setSelected(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menghapus template');
    }
  };

  const save = async () => {
    if (!saveName.trim()) return showError('Beri nama template');
    setBusy(true);
    try {
      await soapTemplateApi.create({
        name: saveName.trim(),
        isShared: saveShared,
        subjective: values.subjective || undefined,
        objective: values.objective || undefined,
        assessment: values.assessment || undefined,
        treatment: values.treatment || undefined,
        plan: values.plan || undefined,
        diagnoses: values.diagnoses,
      });
      success('Template disimpan');
      setOpen(null);
      setSaveName('');
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan template');
    } finally {
      setBusy(false);
    }
  };

  const canEdit = (t: SoapTemplate) => user?.role === 'owner' || t.createdBy === user?.id;

  return (
    <>
      <div className="stp-bar">
        <button type="button" className="stp-btn primary" disabled={disabled} onClick={() => setOpen('pick')}>
          <span aria-hidden="true" className="material-symbols-rounded">auto_awesome</span>
          Pakai template
        </button>
        <button
          type="button"
          className="stp-btn"
          disabled={disabled || !hasContent}
          onClick={() => setOpen('save')}
          title={hasContent ? undefined : 'Isi SOAP dulu untuk disimpan sebagai template'}
        >
          <span aria-hidden="true" className="material-symbols-rounded">bookmark_add</span>
          Simpan sebagai template
        </button>
        <span className="stp-hint">Template mengisi S/O/A/P, tindakan, serta diagnosis ICD-10 &amp; SNOMED CT.</span>
      </div>

      {open && (
        <div className="stp-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="stp-modal" role="dialog" aria-modal="true" aria-label={open === 'pick' ? 'Pilih template SOAP' : 'Simpan template SOAP'}>
            <div className="stp-head">
              <h3>{open === 'pick' ? 'Pilih template SOAP' : 'Simpan sebagai template'}</h3>
              <button type="button" className="stp-close" aria-label="Tutup" onClick={() => setOpen(null)}>
                <span aria-hidden="true" className="material-symbols-rounded">close</span>
              </button>
            </div>

            {open === 'pick' ? (
              <div className="stp-body">
                <div className="stp-pick">
                  <input
                    className="stp-input"
                    placeholder="Cari template, diagnosis, atau kode (mis. K04)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="stp-list">
                    {groups.length === 0 && <p className="stp-muted">Template tidak ditemukan.</p>}
                    {groups.map(([group, list]) => (
                      <div key={group}>
                        <div className="stp-group">{group}</div>
                        {list.map((i) => (
                          <div key={i.id} className={`stp-item ${selected?.id === i.id ? 'active' : ''}`}>
                            <button type="button" className="stp-item-main" onClick={() => setSelected(i)}>
                              <span className="stp-item-name">{i.name}</span>
                              <span className="stp-codes">
                                {(i.body.diagnoses ?? []).map((d) => (
                                  <span key={`${d.system}-${d.code}`} className={`stp-code ${d.system}`}>
                                    {d.system === 'icd10' ? 'ICD-10' : 'SNOMED'} {d.code}
                                  </span>
                                ))}
                              </span>
                            </button>
                            {i.own && canEdit(i.own) && (
                              <button
                                type="button"
                                className="stp-del"
                                aria-label={`Hapus template ${i.name}`}
                                onClick={() => remove(i.own!)}
                              >
                                <span aria-hidden="true" className="material-symbols-rounded">delete</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="stp-preview">
                  {!selected ? (
                    <p className="stp-muted">Pilih template di kiri untuk melihat isinya.</p>
                  ) : (
                    <>
                      {usesGigi && (
                        <label className="stp-field">
                          <span>Nomor gigi (mengganti {'{gigi}'})</span>
                          <input
                            className="stp-input"
                            placeholder="mis. 36 atau 46, 47"
                            value={gigi}
                            maxLength={40}
                            onChange={(e) => setGigi(e.target.value)}
                          />
                        </label>
                      )}
                      {(['subjective', 'objective', 'assessment', 'treatment', 'plan'] as const).map((k) =>
                        selected.body[k] ? (
                          <div key={k} className="stp-sec">
                            <div className="stp-sec-label">
                              {{ subjective: 'S', objective: 'O', assessment: 'A', treatment: 'Tindakan', plan: 'P' }[k]}
                            </div>
                            <p>{fillTemplate(selected.body[k], gigi)}</p>
                          </div>
                        ) : null,
                      )}
                      {(selected.body.diagnoses ?? []).length > 0 && (
                        <div className="stp-sec">
                          <div className="stp-sec-label">Diagnosis</div>
                          <ul className="stp-dx">
                            {(selected.body.diagnoses ?? []).map((d) => (
                              <li key={`${d.system}-${d.code}`}>
                                <strong>{d.code}</strong> {d.nameId ? `${d.nameId} · ` : ''}
                                <span className="stp-muted">{d.display}</span>
                                {d.primary && <span className="stp-primary">utama</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {hasContent && (
                        <div className="stp-mode" role="radiogroup" aria-label="Cara mengisi">
                          <label>
                            <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Ganti isi SOAP
                          </label>
                          <label>
                            <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} /> Tambahkan di bawah isi
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="stp-body single">
                <label className="stp-field">
                  <span>Nama template</span>
                  <input
                    className="stp-input"
                    placeholder="mis. Tambal komposit kelas I"
                    maxLength={100}
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    autoFocus
                  />
                </label>
                {user?.role === 'owner' && (
                  <label className="stp-check">
                    <input type="checkbox" checked={saveShared} onChange={(e) => setSaveShared(e.target.checked)} />
                    Bagikan ke semua dokter di klinik
                  </label>
                )}
                <p className="stp-muted">
                  Isi S/O/A/P, tindakan, dan {values.diagnoses.length} diagnosis saat ini disimpan. Tip: tulis {'{gigi}'} di teks agar nomor
                  gigi bisa diisi setiap kali template dipakai.
                </p>
              </div>
            )}

            <div className="stp-foot">
              <button type="button" className="stp-btn" onClick={() => setOpen(null)}>
                Batal
              </button>
              {open === 'pick' ? (
                <button type="button" className="stp-btn primary" disabled={!selected} onClick={apply}>
                  Pakai template
                </button>
              ) : (
                <button type="button" className="stp-btn primary" disabled={busy} onClick={save}>
                  {busy ? 'Menyimpan…' : 'Simpan template'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
