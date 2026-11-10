'use client';

import { useState } from 'react';
import KfaDrugPicker, { type KfaDrugValue } from '@/components/form/KfaDrugPicker';

export interface MedicationRow {
  key?: string;
  kfaCode: string | null;
  name: string;
  dosage: string;
  active: boolean;
}

/** Kode produk KFA yang diterima SATUSEHAT untuk riwayat pengobatan */
const KFA_PRODUCT = /^9[23]\d{6}$/;
const EMPTY_DRUG: KfaDrugValue = { drugName: '', kfaCode: null, kfaName: null };

/**
 * Riwayat obat yang dikonsumsi pasien (di luar resep klinik ini).
 * Disimpan bersama data pasien; obat berkode KFA dikirim ke SATUSEHAT
 * sebagai MedicationStatement saat kunjungan.
 */
export default function MedicationHistoryEditor({
  value,
  onChange,
}: {
  value: MedicationRow[];
  onChange: (rows: MedicationRow[]) => void;
}) {
  const [drug, setDrug] = useState<KfaDrugValue>(EMPTY_DRUG);
  const [dosage, setDosage] = useState('');
  const [active, setActive] = useState(true);
  const name = (drug.kfaName || drug.drugName).trim();

  const add = () => {
    if (!name) return;
    const kfaCode = drug.kfaCode && KFA_PRODUCT.test(drug.kfaCode) ? drug.kfaCode : null;
    onChange([...value, { kfaCode, name, dosage: dosage.trim(), active }]);
    setDrug(EMPTY_DRUG);
    setDosage('');
    setActive(true);
  };

  return (
    <div className="form-field full fh-editor">
      <label>Riwayat Obat yang Dikonsumsi</label>
      {value.length > 0 && (
        <ul className="fh-list">
          {value.map((r, i) => (
            <li key={r.key ?? `new-${i}`}>
              <span>
                <strong>{r.name}</strong>
                {r.kfaCode ? (
                  <>
                    {' '}
                    <span className="fh-code">KFA {r.kfaCode}</span>
                  </>
                ) : (
                  <span className="fh-note"> · tanpa kode KFA (tidak dikirim ke SATUSEHAT)</span>
                )}
                {r.dosage && <span className="fh-note"> · {r.dosage}</span>}
                <span className="fh-note"> · {r.active ? 'masih dikonsumsi' : 'sudah berhenti'}</span>
              </span>
              <button
                type="button"
                className="fh-remove"
                aria-label={`Hapus ${r.name}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mh-add">
        <KfaDrugPicker value={drug} onChange={setDrug} />
        <input
          type="text"
          aria-label="Aturan pakai obat"
          placeholder="Aturan pakai, mis. 1 tablet sehari"
          value={dosage}
          maxLength={200}
          onChange={(e) => setDosage(e.target.value)}
        />
        <label className="mh-active">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Masih dikonsumsi
        </label>
        <button type="button" className="mh-btn" onClick={add} disabled={!name}>
          Tambah
        </button>
      </div>
      <small className="fh-muted">
        Cari obat dari KFA agar ikut terkirim ke SATUSEHAT. Obat yang diketik bebas hanya tersimpan di klinik.
      </small>
    </div>
  );
}
