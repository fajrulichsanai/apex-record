'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomSelect from '@/components/form/CustomSelect';
import { useToast } from '@/lib/toast-context';
import type { SoapDiagnosis } from '@/lib/terminology';
import {
  referralsApi,
  type AnswerValue,
  type QuestionnaireItem,
  type Referral,
  type ReferralOptions,
  type ReferralQuestionnaire,
} from '@/lib/referrals';
import '@/components/form/PharmacyPanel.css';
import './ReferralPanel.css';

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

const STATUS_LABEL: Record<Referral['status'], { label: string; ok?: boolean }> = {
  draft: { label: 'Menunggu data SATUSEHAT' },
  criteria: { label: 'Isi kriteria rujukan' },
  candidates: { label: 'Pilih RS tujuan' },
  sent: { label: 'Terkirim', ok: true },
  local: { label: 'Rujukan manual', ok: true },
  cancelled: { label: 'Dibatalkan' },
};

const EMPTY_FORM = {
  primary: '',
  secondary: [] as string[],
  serviceGroup: 'TK000584',
  specialty: '',
  performerType: '',
  reason: '',
  patientInstruction: '',
  plannedDate: today(),
  pcareNumber: '',
  manual: false,
  targetName: '',
};

/**
 * Rujukan pasien (Playbook SATUSEHAT "Rujukan Pasien", rawat jalan):
 * buat rujukan → jawab kriteria & wilayah → pilih RS rekomendasi SATUSEHAT
 * → kirim; Nomor Rujukan Nasional tampil setelah terkirim.
 */
export default function ReferralPanel({
  encounterId,
  diagnoses,
}: {
  encounterId: number;
  diagnoses: SoapDiagnosis[];
}) {
  const { success, error } = useToast();
  const [rows, setRows] = useState<Referral[]>([]);
  const [opts, setOpts] = useState<ReferralOptions | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const icd = useMemo(() => diagnoses.filter((d) => d.system === 'icd10'), [diagnoses]);

  const reload = useCallback(async () => {
    try {
      setRows(await referralsApi.list(encounterId));
    } catch {
      setRows([]);
    }
  }, [encounterId]);

  useEffect(() => {
    reload();
    referralsApi
      .options()
      .then(setOpts)
      .catch(() => setOpts(null));
  }, [reload]);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const startAdding = () => {
    const primary = icd.find((d) => d.primary)?.code ?? icd[0]?.code ?? '';
    setForm({ ...EMPTY_FORM, primary, plannedDate: today() });
    setAdding(true);
  };

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      await reload();
      success(done);
      return true;
    } catch (err) {
      error(errMsg(err, 'Gagal memproses rujukan'));
      await reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      () =>
        referralsApi.create(encounterId, {
          careType: 'outpatient',
          primaryDiagnosis: form.primary,
          secondaryDiagnoses: form.secondary.filter((c) => c !== form.primary),
          serviceGroup: form.serviceGroup,
          specialty: form.specialty,
          performerType: form.performerType || undefined,
          reason: form.reason.trim(),
          patientInstruction: form.patientInstruction.trim() || undefined,
          plannedDate: form.plannedDate,
          pcareNumber: form.pcareNumber.trim() || undefined,
          manual: form.manual || undefined,
          targetName: form.manual ? form.targetName.trim() : undefined,
        }),
      form.manual ? 'Rujukan manual dicatat' : 'Rujukan dibuat',
    );
    if (ok) setAdding(false);
  };

  const canSubmit =
    !!form.primary &&
    !!form.specialty &&
    !!form.serviceGroup &&
    form.reason.trim().length > 0 &&
    !!form.plannedDate &&
    (!form.manual || form.targetName.trim().length > 0);

  return (
    <section className="ph-card" aria-labelledby="ref-title">
      <div className="ph-head">
        <h3 id="ref-title">Rujukan Pasien</h3>
        <p>
          Rujukan rawat jalan ke rumah sakit lewat SATUSEHAT Rujukan. RS tujuan dipilih dari rekomendasi SATUSEHAT dan
          Nomor Rujukan Nasional terbit otomatis.
        </p>
      </div>

      {rows.length > 0 && (
        <ul className="ph-list">
          {rows.map((r) => (
            <ReferralItem key={r.id} referral={r} busy={busy} run={run} />
          ))}
        </ul>
      )}

      {adding ? (
        <form className="ph-form ref-form" onSubmit={submit} aria-label="Buat rujukan">
          {icd.length === 0 && (
            <p className="ref-warn ph-span-2">
              Isi diagnosis (ICD-10) di Catatan SOAP terlebih dahulu — rujukan memakai diagnosis kunjungan.
            </p>
          )}
          <label>
            Diagnosis utama
            <select aria-label="Diagnosis utama" value={form.primary} onChange={(e) => set('primary', e.target.value)}>
              <option value="">Pilih diagnosis</option>
              {icd.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} — {d.nameId ?? d.display}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tanggal rencana kunjungan
            <input
              type="date"
              aria-label="Tanggal rencana kunjungan"
              min={today()}
              value={form.plannedDate}
              onChange={(e) => set('plannedDate', e.target.value)}
            />
          </label>
          {icd.length > 1 && (
            <fieldset className="ph-group ph-span-2">
              <legend>Diagnosis sekunder</legend>
              <div className="ref-checks">
                {icd
                  .filter((d) => d.code !== form.primary)
                  .map((d) => (
                    <label key={d.code} className="ref-check">
                      <input
                        type="checkbox"
                        checked={form.secondary.includes(d.code)}
                        onChange={(e) =>
                          set(
                            'secondary',
                            e.target.checked ? [...form.secondary, d.code] : form.secondary.filter((c) => c !== d.code),
                          )
                        }
                      />
                      {d.code} — {d.nameId ?? d.display}
                    </label>
                  ))}
              </div>
            </fieldset>
          )}
          <label>
            Kelompok layanan
            <CustomSelect
              value={form.serviceGroup}
              onChange={(v) => set('serviceGroup', v)}
              options={opts?.serviceGroups ?? []}
              placeholder="Pilih kelompok layanan"
            />
          </label>
          <label>
            Poli tujuan
            <CustomSelect
              value={form.specialty}
              onChange={(v) => set('specialty', v)}
              options={opts?.specialties ?? []}
              placeholder="Cari poli, mis. Bedah Mulut"
            />
          </label>
          <label className="ph-span-2">
            Tenaga kesehatan yang dituju (opsional)
            <CustomSelect
              value={form.performerType}
              onChange={(v) => set('performerType', v)}
              options={[{ value: '', label: 'Tidak ditentukan' }, ...(opts?.performerTypes ?? [])]}
              placeholder="Cari, mis. Oral surgeon"
            />
          </label>
          <label className="ph-span-2">
            Alasan rujukan / ringkasan klinis
            <textarea
              aria-label="Alasan rujukan"
              rows={3}
              maxLength={1000}
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="mis. Abses periapikal meluas ke submandibula, perlu tindakan bedah mulut"
            />
          </label>
          <label>
            Pesan untuk pasien (opsional)
            <input
              type="text"
              aria-label="Pesan untuk pasien"
              maxLength={500}
              value={form.patientInstruction}
              onChange={(e) => set('patientInstruction', e.target.value)}
              placeholder="mis. Bawa hasil rontgen"
            />
          </label>
          <label>
            No. rujukan PCare (peserta BPJS, opsional)
            <input
              type="text"
              aria-label="Nomor rujukan PCare"
              maxLength={50}
              value={form.pcareNumber}
              onChange={(e) => set('pcareNumber', e.target.value)}
            />
          </label>
          <label className="ref-check ph-span-2">
            <input type="checkbox" checked={form.manual} onChange={(e) => set('manual', e.target.checked)} />
            Rujukan manual (surat rujukan saja, tidak lewat SATUSEHAT)
          </label>
          {form.manual && (
            <label className="ph-span-2">
              Nama RS / fasyankes tujuan
              <input
                type="text"
                aria-label="Nama RS tujuan"
                maxLength={255}
                value={form.targetName}
                onChange={(e) => set('targetName', e.target.value)}
              />
            </label>
          )}
          <div className="ph-actions-row ph-span-2">
            <button type="button" className="btn-outline" onClick={() => setAdding(false)} disabled={busy}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !canSubmit}>
              {form.manual ? 'Simpan rujukan' : 'Buat rujukan'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button type="button" className="btn-outline" onClick={startAdding}>
            + Buat rujukan
          </button>
        </div>
      )}
    </section>
  );
}

function ReferralItem({
  referral: r,
  busy,
  run,
}: {
  referral: Referral;
  busy: boolean;
  run: (fn: () => Promise<unknown>, done: string) => Promise<boolean>;
}) {
  const st = STATUS_LABEL[r.status];
  return (
    <li className="ph-item">
      <div className="ph-item-main">
        <strong>
          {r.specialty.display}
          {r.targetName && ` · ${r.targetName}`}
        </strong>
        <div className="ph-states">
          <span className={`ph-badge ${st.ok ? 'ok' : ''}`}>{st.label}</span>
          <span className="ph-badge">
            {r.primaryDiagnosis.code} — {r.primaryDiagnosis.display}
          </span>
          <span className="ph-badge">Rencana {new Date(r.plannedDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
          {r.referralNumber && <span className="ph-badge ok">No. Rujukan {r.referralNumber}</span>}
        </div>
        <span className="ph-hint">{r.reason}</span>
        {r.lastError && r.status !== 'sent' && <span className="ref-warn">{r.lastError}</span>}
      </div>

      {r.status === 'criteria' && <CriteriaForm referral={r} busy={busy} run={run} />}
      {r.status === 'candidates' && <CandidateList referral={r} busy={busy} run={run} />}

      <div className="ph-actions">
        {(r.status === 'draft' || (r.status === 'candidates' && !r.candidates?.length) || (r.status === 'sent' && !r.referralNumber)) && (
          <button type="button" className="ph-link" disabled={busy} onClick={() => run(() => referralsApi.retry(r.id), 'Rujukan diperbarui')}>
            {r.status === 'draft' ? 'Lanjutkan ke SATUSEHAT' : 'Muat ulang'}
          </button>
        )}
        {r.status !== 'sent' && r.status !== 'cancelled' && r.status !== 'local' && (
          <button type="button" className="ph-link danger" disabled={busy} onClick={() => run(() => referralsApi.cancel(r.id), 'Rujukan dibatalkan')}>
            Batalkan
          </button>
        )}
      </div>
    </li>
  );
}

/** Kuesioner kriteria & jejaring wilayah dari SATUSEHAT Rujukan */
function CriteriaForm({
  referral: r,
  busy,
  run,
}: {
  referral: Referral;
  busy: boolean;
  run: (fn: () => Promise<unknown>, done: string) => Promise<boolean>;
}) {
  const [criteria, setCriteria] = useState<Record<string, AnswerValue>>({});
  const [area, setArea] = useState<Record<string, AnswerValue>>({});
  const q = r.questionnaires;

  return (
    <form
      className="ref-q"
      aria-label="Kriteria rujukan"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => referralsApi.candidates(r.id, { criteria, ...(q?.area ? { areaAnswers: area } : {}) }),
          'Rekomendasi RS diterima',
        );
      }}
    >
      {q?.criteria && <QuestionnaireForm title="Kriteria rujukan" q={q.criteria} value={criteria} onChange={setCriteria} />}
      {q?.area ? (
        <QuestionnaireForm title="Wilayah rujukan" q={q.area} value={area} onChange={setArea} />
      ) : (
        <p className="ph-hint">Wilayah rujukan: sesuai provinsi & kabupaten/kota klinik.</p>
      )}
      <div className="ph-actions-row">
        <button type="submit" className="btn-primary" disabled={busy}>
          Cari RS rujukan
        </button>
      </div>
    </form>
  );
}

function QuestionnaireForm({
  title,
  q,
  value,
  onChange,
}: {
  title: string;
  q: ReferralQuestionnaire;
  value: Record<string, AnswerValue>;
  onChange: (v: Record<string, AnswerValue>) => void;
}) {
  const setAnswer = (linkId: string, v: AnswerValue | undefined) => {
    const next = { ...value };
    if (v === undefined || v === '') delete next[linkId];
    else next[linkId] = v;
    onChange(next);
  };
  // Kab/kota (kode 4 digit) disaring sesuai provinsi (kode 2 digit) yang dipilih
  const province = Object.values(value).find(
    (v): v is { code: string } => typeof v === 'object' && /^\d{2}$/.test(v.code),
  )?.code;

  const renderItem = (it: QuestionnaireItem): React.ReactNode => {
    if (it.type === 'group' || (it.item?.length && !it.type)) {
      return (
        <fieldset key={it.linkId} className="ph-group">
          {it.text && <legend>{it.text}</legend>}
          {(it.item ?? []).map(renderItem)}
        </fieldset>
      );
    }
    const label = it.text ?? it.linkId;
    if (it.type === 'boolean') {
      const v = value[it.linkId];
      return (
        <div key={it.linkId} className="ph-q" role="radiogroup" aria-label={label}>
          <span>{label}</span>
          <div className="ph-opts">
            {([
              [true, 'Ya'],
              [false, 'Tidak'],
            ] as const).map(([opt, text]) => (
              <label key={text} className={v === opt ? 'active' : ''}>
                <input type="radio" name={`${title}-${it.linkId}`} checked={v === opt} onChange={() => setAnswer(it.linkId, opt)} />
                {text}
              </label>
            ))}
          </div>
        </div>
      );
    }
    if (it.type === 'choice' || it.type === 'open-choice') {
      let options = (it.answerOption ?? []).map((o) => o.valueCoding).filter((c): c is NonNullable<typeof c> => !!c);
      if (province && options.some((c) => /^\d{4}$/.test(c.code)))
        options = options.filter((c) => c.code.startsWith(province));
      const v = value[it.linkId];
      return (
        <label key={it.linkId} className="ref-field">
          {label}
          <CustomSelect
            value={typeof v === 'object' ? v.code : ''}
            onChange={(code) => setAnswer(it.linkId, code ? { code } : undefined)}
            options={options.map((c) => ({ value: c.code, label: c.display ?? c.code }))}
            placeholder={`Pilih ${label.toLowerCase()}`}
          />
        </label>
      );
    }
    const v = value[it.linkId];
    return (
      <label key={it.linkId} className="ref-field">
        {label}
        <input type="text" aria-label={label} value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(it.linkId, e.target.value)} />
      </label>
    );
  };

  return (
    <div className="ref-qblock">
      <h4>{q.title || title}</h4>
      {(q.item ?? []).map(renderItem)}
    </div>
  );
}

function CandidateList({
  referral: r,
  busy,
  run,
}: {
  referral: Referral;
  busy: boolean;
  run: (fn: () => Promise<unknown>, done: string) => Promise<boolean>;
}) {
  const [pick, setPick] = useState('');
  const list = r.candidates ?? [];
  if (!list.length) return null;
  return (
    <div className="ref-cands" role="radiogroup" aria-label="RS rujukan">
      {list.map((c) => (
        <label key={c.orgId} className={`ref-cand ${pick === c.orgId ? 'active' : ''}`}>
          <input type="radio" name={`cand-${r.id}`} checked={pick === c.orgId} onChange={() => setPick(c.orgId)} />
          <span>
            <strong>{c.name}</strong>
            <span className="ph-hint">
              {[c.distanceKm != null && `${c.distanceKm.toLocaleString('id-ID')} km`, c.strata && `Strata ${c.strata}`]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
        </label>
      ))}
      <div className="ph-actions-row">
        <button
          type="button"
          className="btn-primary"
          disabled={busy || !pick}
          onClick={() => run(() => referralsApi.send(r.id, pick), 'Rujukan terkirim ke SATUSEHAT')}
        >
          Kirim rujukan
        </button>
      </div>
    </div>
  );
}
