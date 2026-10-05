'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import KfaDrugPicker, { type KfaDrugValue } from '@/components/form/KfaDrugPicker';
import RxCodingFix from '@/components/form/RxCodingFix';
import SignaturePad from '@/components/form/SignaturePad';
import { ApiError } from '@/lib/api-client';
import { kfaApi } from '@/lib/master-data';
import { prescriptionsApi, type PrescriptionItem, type PrescriptionSignature } from '@/lib/prescriptions';
import {
  DOSAGE_FORMS,
  WHEN_OPTIONS,
  buildSigna,
  guessDosageForm,
  rxLine,
  signaOptions,
  toRoman,
  usesWhen,
  type SignaWhen,
} from '@/lib/signa';
import { useToast } from '@/lib/toast-context';

interface PrescriptionPanelProps {
  encounterId: number;
}

interface Draft {
  drug: KfaDrugValue;
  dosageForm: string;
  dosage: string;
  numero: string;
  signaCode: string;
  when: SignaWhen | '';
}

const EMPTY_DRAFT: Draft = {
  drug: { drugName: '', kfaCode: null, kfaName: null },
  dosageForm: 'Tablet',
  dosage: '',
  numero: '',
  signaCode: '3x1',
  when: 'PC',
};

// Obat yang sering diresepkan — klik untuk mencari di KFA.
const DRUG_OPTIONS = ['Amoxicillin', 'Ibuprofen', 'Paracetamol', 'Asam Mefenamat'];

/**
 * Resep obat: nama obat (KFA), sediaan, dosis, numero, aturan pakai
 * (dropdown per jenis sediaan → tulisan resep), dan tanda tangan dokter.
 */
export default function PrescriptionPanel({ encounterId }: PrescriptionPanelProps) {
  const { success, error } = useToast();
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  /** Obat yang sedang diperbaiki kodenya (KFA / racikan) */
  const [fixingId, setFixingId] = useState<number | null>(null);
  const [signature, setSignature] = useState<PrescriptionSignature | null>(null);
  const [signDraft, setSignDraft] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [resign, setResign] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, sig] = await Promise.all([
        prescriptionsApi.list(encounterId),
        prescriptionsApi.getSignature(encounterId).catch(() => null),
      ]);
      setItems(data);
      setSignature(sig);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat resep obat');
    } finally {
      setLoading(false);
    }
  }, [encounterId, error]);

  useEffect(() => {
    load();
  }, [load]);

  const options = signaOptions(draft.dosageForm);
  const showWhen = usesWhen(draft.dosageForm);
  const signa = buildSigna(draft.dosageForm, draft.signaCode, showWhen && draft.when ? draft.when : null);
  const numero = Number(draft.numero);
  const numeroValid = Number.isInteger(numero) && numero >= 1 && numero <= 9999;

  /** Pilih obat dari KFA → isi sediaan & dosis dari detail produk */
  async function pickDrug(value: KfaDrugValue) {
    setDraft((d) => ({ ...d, drug: value }));
    if (!value.kfaCode) return;
    try {
      const product = await kfaApi.get(value.kfaCode);
      const form = guessDosageForm(product.dosageForm?.name);
      const strength = product.activeIngredients.length === 1 ? product.activeIngredients[0].strength : null;
      setDraft((d) => {
        if (d.drug.kfaCode !== value.kfaCode) return d;
        const dosageForm = form ?? d.dosageForm;
        const opts = signaOptions(dosageForm);
        return {
          ...d,
          dosageForm,
          dosage: d.dosage || strength || '',
          signaCode: opts.some((o) => o.code === d.signaCode) ? d.signaCode : opts[0].code,
        };
      });
    } catch {
      // Detail KFA opsional — isian manual tetap bisa
    }
  }

  function changeForm(dosageForm: string) {
    const opts = signaOptions(dosageForm);
    setDraft((d) => ({
      ...d,
      dosageForm,
      signaCode: opts.some((o) => o.code === d.signaCode) ? d.signaCode : opts[0].code,
    }));
  }

  const handleAdd = async () => {
    if (!draft.drug.drugName.trim() || !signa || !numeroValid) return;
    try {
      setSubmitting(true);
      await prescriptionsApi.create(encounterId, {
        drugName: draft.drug.drugName.trim(),
        kfaCode: draft.drug.kfaCode || undefined,
        kfaName: draft.drug.kfaName || undefined,
        dosageForm: draft.dosageForm,
        dosage: draft.dosage.trim() || undefined,
        numero,
        signa,
      });
      success('Obat telah ditambahkan ke resep');
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menambah obat ke resep');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await prescriptionsApi.remove(encounterId, confirmDelete.id);
      success(`Obat "${confirmDelete.name}" telah dihapus dari resep`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus obat dari resep');
    }
  };

  async function saveSignature() {
    if (!signDraft) return;
    try {
      setSigning(true);
      setSignature(await prescriptionsApi.saveSignature(encounterId, signDraft));
      setSignDraft(null);
      setResign(false);
      success('Tanda tangan dokter disimpan');
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan tanda tangan');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="rx-panel">
      {loading ? (
        <div className="rx-empty">Memuat resep obat…</div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="rx-table-wrap">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>Obat</th>
                    <th>Numero</th>
                    <th>Aturan Pakai</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <Fragment key={item.id}>
                      <tr>
                        <td className="rx-drug-name">
                          <span className="rx-r">R/</span> {rxLine(item.drugName, item.dosage, item.dosageForm)}
                          {item.kfaCode ? (
                            <button
                              type="button"
                              className="rx-kfa ok"
                              title="Ganti produk KFA"
                              onClick={() => setFixingId(fixingId === item.id ? null : item.id)}
                            >
                              KFA {item.kfaCode}
                            </button>
                          ) : item.compoundType && item.ingredients?.length ? (
                            <button
                              type="button"
                              className="rx-kfa ok"
                              title="Ubah racikan"
                              onClick={() => setFixingId(fixingId === item.id ? null : item.id)}
                            >
                              Racikan · {item.ingredients.length} bahan
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rx-kfa warn"
                              title="Belum bisa dikirim ke SATUSEHAT — pilih produk KFA atau isi racikan"
                              onClick={() => setFixingId(fixingId === item.id ? null : item.id)}
                            >
                              tanpa KFA · Perbaiki
                            </button>
                          )}
                        </td>
                        <td className="rx-numero">
                          {item.numero ? `No. ${toRoman(item.numero)}` : item.quantity ? `No. ${item.quantity}` : '—'}
                          {item.numero ? <span className="rx-drug-sub">({item.numero})</span> : null}
                        </td>
                        <td>
                          {item.signa ? (
                            <>
                              <span className="rx-signa">{item.signa.latin}</span>
                              <span className="rx-drug-sub">{item.signa.text}</span>
                            </>
                          ) : (
                            [item.frequency, item.instructions].filter(Boolean).join(' · ') || '—'
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rx-delete-btn"
                            aria-label="Hapus"
                            onClick={() => setConfirmDelete({ id: item.id, name: item.drugName })}
                          >
                            <span aria-hidden="true" className="material-symbols-rounded">delete</span>
                          </button>
                        </td>
                      </tr>
                      {fixingId === item.id && (
                        <tr className="rx-fix-row">
                          <td colSpan={4}>
                            <RxCodingFix
                              encounterId={encounterId}
                              item={item}
                              onCancel={() => setFixingId(null)}
                              onSaved={async () => {
                                setFixingId(null);
                                success('Obat diperbarui — siap dikirim ke SATUSEHAT');
                                await load();
                              }}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <div className="rx-empty">
              <span aria-hidden="true" className="material-symbols-rounded">medication</span>
              Belum ada obat yang diresepkan
            </div>
          )}

          <div className="rx-add-row">
            <div className="rx-form">
              <label className="rx-field rx-field-drug">
                <span>Nama obat</span>
                <KfaDrugPicker value={draft.drug} onChange={pickDrug} quickPicks={DRUG_OPTIONS} />
              </label>
              <label className="rx-field">
                <span>Sediaan</span>
                <select value={draft.dosageForm} onChange={(e) => changeForm(e.target.value)}>
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rx-field">
                <span>Dosis</span>
                <input
                  type="text"
                  placeholder="mis. 500 mg"
                  value={draft.dosage}
                  maxLength={100}
                  onChange={(e) => setDraft((d) => ({ ...d, dosage: e.target.value }))}
                />
              </label>
              <label className="rx-field">
                <span>Numero (jumlah)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={9999}
                  placeholder="mis. 15"
                  value={draft.numero}
                  onChange={(e) => setDraft((d) => ({ ...d, numero: e.target.value.replace(/\D/g, '') }))}
                />
                {numeroValid && <small className="rx-hint">No. {toRoman(numero)}</small>}
              </label>
              <label className="rx-field rx-field-signa">
                <span>Aturan pakai</span>
                <select value={draft.signaCode} onChange={(e) => setDraft((d) => ({ ...d, signaCode: e.target.value }))}>
                  {options.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {showWhen && (
                <label className="rx-field">
                  <span>Waktu</span>
                  <select
                    value={draft.when}
                    onChange={(e) => setDraft((d) => ({ ...d, when: e.target.value as SignaWhen | '' }))}
                  >
                    {WHEN_OPTIONS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.label}
                      </option>
                    ))}
                    <option value="">—</option>
                  </select>
                </label>
              )}
            </div>

            {draft.drug.drugName.trim() && signa && (
              <div className="rx-preview" aria-live="polite">
                <div>
                  <span className="rx-r">R/</span>{' '}
                  <strong>{rxLine(draft.drug.drugName, draft.dosage, draft.dosageForm)}</strong>
                  {numeroValid && <span className="rx-preview-no">No. {toRoman(numero)}</span>}
                </div>
                <div className="rx-signa">{signa.latin}</div>
                <div className="rx-drug-sub">{signa.text}</div>
              </div>
            )}

            <button
              type="button"
              className="btn-outline rx-add-btn"
              onClick={handleAdd}
              disabled={submitting || !draft.drug.drugName.trim() || !signa || !numeroValid}
              title={!numeroValid ? 'Isi numero (jumlah obat)' : ''}
            >
              <span aria-hidden="true" className="material-symbols-rounded">add</span>
              Tambah Obat
            </button>
          </div>

          <div className="rx-sign">
            <div className="rx-sign-head">
              <strong>Tanda tangan dokter</strong>
              {signature && !resign && (
                <span className="rx-drug-sub">
                  Ditandatangani {new Date(signature.signedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              )}
            </div>
            {signature && !resign ? (
              <div className="rx-sign-saved">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signature.signature} alt="Tanda tangan dokter" />
                <button type="button" className="btn-outline" onClick={() => setResign(true)}>
                  Tanda tangan ulang
                </button>
              </div>
            ) : (
              <>
                <SignaturePad value={signDraft ?? undefined} onChange={setSignDraft} height={140} />
                <div className="rx-sign-actions">
                  <button type="button" className="btn-outline" onClick={saveSignature} disabled={!signDraft || signing}>
                    {signing ? 'Menyimpan…' : 'Simpan tanda tangan'}
                  </button>
                  {resign && (
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setResign(false);
                        setSignDraft(null);
                      }}
                    >
                      Batal
                    </button>
                  )}
                </div>
                <small className="rx-hint">Tanda tangan dicetak di lembar resep (PDF).</small>
              </>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Hapus Obat dari Resep?"
        message={`Apakah Anda yakin ingin menghapus "${confirmDelete?.name}" dari resep ini?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
