'use client';

import { useState, type FormEvent } from 'react';
import KfaDrugPicker, { type KfaDrugValue } from '@/components/form/KfaDrugPicker';
import {
  COMPOUND_FORMS,
  ROUTE_OPTIONS,
  STRENGTH_UNITS,
  prescriptionsApi,
  type CompoundIngredient,
  type CompoundType,
  type PrescriptionItem,
} from '@/lib/prescriptions';
import './RxCodingFix.css';

interface IngredientDraft {
  drug: KfaDrugValue;
  amount: string;
  amountUnit: string;
}

const emptyIngredient = (): IngredientDraft => ({
  drug: { drugName: '', kfaCode: null, kfaName: null },
  amount: '',
  amountUnit: 'mg',
});

/**
 * Perbaiki obat yang belum bisa dikirim ke SATUSEHAT: pilih produk KFA,
 * atau jadikan racikan dengan bahan-bahan berkode KFA.
 */
export default function RxCodingFix({
  encounterId,
  item,
  onSaved,
  onCancel,
}: {
  encounterId: number;
  item: Pick<PrescriptionItem, 'id' | 'drugName'> & Partial<PrescriptionItem>;
  onSaved: (updated: PrescriptionItem) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const looksCompound = !!item.compoundType || /racik|puyer|pulv/i.test(item.drugName);
  const [mode, setMode] = useState<'kfa' | 'compound'>(looksCompound ? 'compound' : 'kfa');
  const [drug, setDrug] = useState<KfaDrugValue>({
    drugName: item.kfaCode ? (item.kfaName ?? item.drugName) : item.drugName,
    kfaCode: item.kfaCode ?? null,
    kfaName: item.kfaName ?? null,
  });
  const [compoundType, setCompoundType] = useState<CompoundType>(item.compoundType ?? 'SD');
  const [formCode, setFormCode] = useState(item.compoundFormCode ?? COMPOUND_FORMS[0].code);
  const [routeCode, setRouteCode] = useState(item.routeCode ?? 'O');
  /** EP (dibagi rata): jumlah total satuan hasil racikan, mis. 30 kapsul */
  const [divideInto, setDivideInto] = useState(
    item.compoundType === 'EP' && item.ingredients?.[0] ? String(item.ingredients[0].perAmount) : '',
  );
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    item.ingredients?.length
      ? item.ingredients.map((g) => ({
          drug: { drugName: g.name, kfaCode: g.kfaCode, kfaName: g.name },
          amount: String(g.amount),
          amountUnit: g.amountUnit,
        }))
      : [emptyIngredient()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = COMPOUND_FORMS.find((f) => f.code === formCode) ?? COMPOUND_FORMS[0];
  const setIngredient = (i: number, patch: Partial<IngredientDraft>) =>
    setIngredients((list) => list.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  const ingredientsReady = ingredients.length > 0 && ingredients.every((g) => g.drug.kfaCode && Number(g.amount) > 0);
  const perAmount = compoundType === 'EP' ? Number(divideInto) : 1;
  const ready = mode === 'kfa' ? !!drug.kfaCode : ingredientsReady && perAmount > 0;
  const formLabel = form.name.toLowerCase().replace(/\s*\(.*\)$/, '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated =
        mode === 'kfa'
          ? await prescriptionsApi.setCoding(encounterId, item.id, {
              kfaCode: drug.kfaCode!,
              kfaName: drug.kfaName ?? undefined,
            })
          : await prescriptionsApi.setCoding(encounterId, item.id, {
              compoundType,
              compoundFormCode: form.code,
              compoundFormName: form.name.replace(/\s*\(.*\)$/, ''),
              compoundUnit: form.unit,
              routeCode,
              ingredients: ingredients.map(
                (g): CompoundIngredient => ({
                  kfaCode: g.drug.kfaCode!,
                  name: g.drug.kfaName ?? g.drug.drugName,
                  amount: Number(g.amount),
                  amountUnit: g.amountUnit,
                  // d.t.d: per 1 satuan hasil (250 mg per 1 kapsul);
                  // dibagi rata: total bahan per total hasil (15 TAB per 30 CAP)
                  perAmount,
                  perUnit: form.unit,
                }),
              ),
            });
      await onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rxfix" onSubmit={submit}>
      <div className="rxfix-head">
        <strong>Perbaiki “{item.drugName}”</strong>
        <div className="rxfix-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'kfa'}
            className={mode === 'kfa' ? 'active' : ''}
            onClick={() => setMode('kfa')}
          >
            Obat jadi (produk KFA)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'compound'}
            className={mode === 'compound' ? 'active' : ''}
            onClick={() => setMode('compound')}
          >
            Racikan
          </button>
        </div>
      </div>

      {mode === 'kfa' ? (
        <div className="rxfix-body">
          <label className="rxfix-label">Cari produk di KFA</label>
          <KfaDrugPicker value={drug} onChange={setDrug} disabled={saving} />
          <small>Pilih salah satu hasil pencarian supaya kode KFA tersimpan.</small>
        </div>
      ) : (
        <div className="rxfix-body">
          <div className="rxfix-grid">
            <label>
              Jenis racikan
              <select value={compoundType} onChange={(e) => setCompoundType(e.target.value as CompoundType)}>
                <option value="SD">d.t.d — dosis per satuan (mis. per kapsul/bungkus)</option>
                <option value="EP">Dibagi rata (non-d.t.d)</option>
              </select>
            </label>
            <label>
              Bentuk sediaan
              <select value={formCode} onChange={(e) => setFormCode(e.target.value)}>
                {COMPOUND_FORMS.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rute
              <select value={routeCode} onChange={(e) => setRouteCode(e.target.value)}>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {compoundType === 'EP' && (
            <label className="rxfix-inline">
              Dibagi menjadi
              <input
                aria-label="Jumlah hasil racikan"
                inputMode="numeric"
                value={divideInto}
                onChange={(e) => setDivideInto(e.target.value.replace(/\D/g, ''))}
                placeholder="mis. 10"
              />
              {formLabel}
            </label>
          )}
          <div className="rxfix-label">
            {compoundType === 'EP' ? 'Bahan racikan (jumlah total bahan)' : `Bahan racikan (jumlah per 1 ${formLabel})`}
          </div>
          {ingredients.map((g, i) => (
            <div className="rxfix-ingredient" key={i}>
              <div className="rxfix-ing-drug">
                <KfaDrugPicker
                  value={g.drug}
                  onChange={(drugValue) => setIngredient(i, { drug: drugValue })}
                  disabled={saving}
                />
              </div>
              <input
                aria-label={`Jumlah bahan ${i + 1}`}
                inputMode="decimal"
                placeholder="Jumlah"
                value={g.amount}
                onChange={(e) =>
                  setIngredient(i, {
                    amount: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.'),
                  })
                }
              />
              <select
                aria-label={`Satuan bahan ${i + 1}`}
                value={g.amountUnit}
                onChange={(e) => setIngredient(i, { amountUnit: e.target.value })}
              >
                {STRENGTH_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rxfix-remove"
                aria-label={`Hapus bahan ${i + 1}`}
                disabled={ingredients.length === 1}
                onClick={() => setIngredients((list) => list.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rxfix-link"
            disabled={ingredients.length >= 15}
            onClick={() => setIngredients((list) => [...list, emptyIngredient()])}
          >
            + Tambah bahan
          </button>
          <small>Setiap bahan harus dipilih dari hasil pencarian KFA dan diisi jumlahnya.</small>
        </div>
      )}

      {error && <div className="rxfix-error">{error}</div>}
      <div className="rxfix-actions">
        <button type="submit" className="rxfix-primary" disabled={!ready || saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {onCancel && (
          <button type="button" className="rxfix-secondary" onClick={onCancel} disabled={saving}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
