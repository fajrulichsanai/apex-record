'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import {
  KATEGORI_FORM_ORDER,
  OPERASIONAL_KATEGORI_OPTIONS,
  kategoriMeta,
  operationalApi,
  type OperationalRecord,
} from '@/lib/operational';
import { useToast } from '@/lib/toast-context';

/** Tanggal (YYYY-MM-DD) di zona waktu klinik (WIB), digeser `offsetDays` hari. */
export function clinicDate(offsetDays = 0): string {
  return new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

const MAX_NOMINAL = 9_999_999_999;
const LABELS = Object.fromEntries(OPERASIONAL_KATEGORI_OPTIONS.map((o) => [o.value, o.label]));
export const kategoriLabel = (value: string) => LABELS[value] ?? value;

const digitsOnly = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const withDots = (digits: string) => (digits ? Number(digits).toLocaleString('id-ID') : '');

export interface FormSeed {
  /** Berubah setiap kali formulir perlu dimulai ulang (ubah / salin). */
  key: number;
  record?: OperationalRecord;
  /** Salinan dari catatan lain: kategori, keterangan, dan nominal terisi; tanggal hari ini. */
  copyOf?: OperationalRecord;
}

interface Props {
  seed: FormSeed;
  onSaved: () => void;
  onCancelEdit: () => void;
}

export default function ExpenseForm({ seed, onSaved, onCancelEdit }: Props) {
  const { success, error } = useToast();
  const editing = seed.record ?? null;
  const base = seed.record ?? seed.copyOf ?? null;
  const baseIsPreset = !!base && base.kategori in LABELS;

  const [nominal, setNominal] = useState(base ? String(base.nominal) : '');
  const [tanggal, setTanggal] = useState(editing ? editing.tanggal : clinicDate());
  const [kategori, setKategori] = useState(base ? (baseIsPreset ? base.kategori : 'lainnya') : '');
  const [kategoriSendiri, setKategoriSendiri] = useState(base && !baseIsPreset ? base.kategori : '');
  const [deskripsi, setDeskripsi] = useState(
    base && base.deskripsi !== kategoriLabel(base.kategori) ? base.deskripsi : '',
  );
  const [errors, setErrors] = useState<{ nominal?: string; kategori?: string; tanggal?: string }>({});
  const [saving, setSaving] = useState(false);

  const nominalRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Mulai mengubah/menyalin: bawa formulir ke layar dan fokus ke nominal.
  useEffect(() => {
    if (seed.record || seed.copyOf) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nominalRef.current?.focus({ preventScroll: true });
    }
  }, [seed.record, seed.copyOf]);

  const today = clinicDate();
  const yesterday = clinicDate(-1);
  const meta = kategori ? kategoriMeta(kategori) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const amount = Number(nominal);
    if (!nominal || !Number.isFinite(amount) || amount < 1) next.nominal = 'Isi jumlah pengeluaran';
    else if (amount > MAX_NOMINAL) next.nominal = 'Jumlah terlalu besar';
    if (!kategori) next.kategori = 'Pilih jenis pengeluaran';
    if (!tanggal) next.tanggal = 'Pilih tanggal';
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.nominal) nominalRef.current?.focus();
      return;
    }

    const kategoriValue = kategori === 'lainnya' && kategoriSendiri.trim() ? kategoriSendiri.trim() : kategori;
    const payload = {
      tanggal,
      kategori: kategoriValue,
      // Keterangan boleh kosong: pakai nama kategori supaya laporan tetap jelas.
      deskripsi: deskripsi.trim() || kategoriLabel(kategoriValue),
      nominal: amount,
    };
    try {
      setSaving(true);
      if (editing) {
        await operationalApi.update(editing.id, payload);
        success('Pengeluaran diperbarui');
      } else {
        await operationalApi.create(payload);
        success(`Tersimpan: ${kategoriLabel(kategoriValue)} Rp ${amount.toLocaleString('id-ID')}`);
        // Siap mencatat berikutnya: tanggal dipertahankan, sisanya dikosongkan.
        setNominal('');
        setKategori('');
        setKategoriSendiri('');
        setDeskripsi('');
        setErrors({});
        nominalRef.current?.focus({ preventScroll: true });
      }
      onSaved();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan pengeluaran');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} className={`ex-form${editing ? ' editing' : ''}`} onSubmit={submit} noValidate>
      <div className="ex-form-head">
        <div>
          <h2>{editing ? 'Ubah pengeluaran' : seed.copyOf ? 'Pengeluaran baru (salinan)' : 'Catat pengeluaran'}</h2>
          <p>
            {editing
              ? 'Perubahan akan tercatat di log aktivitas.'
              : 'Isi jumlah dan pilih jenisnya — selesai dalam beberapa detik.'}
          </p>
        </div>
        {(editing || seed.copyOf) && (
          <button type="button" className="btn-outline" onClick={onCancelEdit}>
            {editing ? 'Batal ubah' : 'Batal'}
          </button>
        )}
      </div>

      <div className="ex-row">
        <div className={`ex-field ex-amount${errors.nominal ? ' error' : ''}`}>
          <label htmlFor="ex-nominal">Jumlah</label>
          <div className="ex-money">
            <span aria-hidden="true">Rp</span>
            <input
              id="ex-nominal"
              ref={nominalRef}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={withDots(nominal)}
              aria-invalid={!!errors.nominal}
              aria-describedby={errors.nominal ? 'ex-nominal-err' : undefined}
              onChange={(e) => {
                setNominal(digitsOnly(e.target.value));
                if (errors.nominal) setErrors((p) => ({ ...p, nominal: undefined }));
              }}
            />
          </div>
          {errors.nominal && <span id="ex-nominal-err" className="ex-error">{errors.nominal}</span>}
        </div>

        <div className={`ex-field ex-date${errors.tanggal ? ' error' : ''}`}>
          <label htmlFor="ex-tanggal">Tanggal</label>
          <div className="ex-date-row">
            <button type="button" className={`ex-chip${tanggal === today ? ' on' : ''}`} onClick={() => setTanggal(today)}>
              Hari ini
            </button>
            <button type="button" className={`ex-chip${tanggal === yesterday ? ' on' : ''}`} onClick={() => setTanggal(yesterday)}>
              Kemarin
            </button>
            <input
              id="ex-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              aria-label="Pilih tanggal lain"
            />
          </div>
          {errors.tanggal && <span className="ex-error">{errors.tanggal}</span>}
        </div>
      </div>

      <div className={`ex-field${errors.kategori ? ' error' : ''}`}>
        <span className="ex-label" id="ex-kategori-label">Untuk apa?</span>
        <div className="ex-cats" role="radiogroup" aria-labelledby="ex-kategori-label">
          {KATEGORI_FORM_ORDER.map((value) => {
            const m = kategoriMeta(value);
            const on = kategori === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                className={`ex-cat tone-${m.tone}${on ? ' on' : ''}`}
                onClick={() => {
                  setKategori(value);
                  if (errors.kategori) setErrors((p) => ({ ...p, kategori: undefined }));
                }}
              >
                <span aria-hidden="true" className="material-symbols-rounded">{m.icon}</span>
                {kategoriLabel(value)}
              </button>
            );
          })}
        </div>
        {errors.kategori && <span className="ex-error">{errors.kategori}</span>}
      </div>

      <div className="ex-row">
        <div className="ex-field ex-grow">
          <label htmlFor="ex-deskripsi">Keterangan <em>(boleh dikosongkan)</em></label>
          <input
            id="ex-deskripsi"
            value={deskripsi}
            maxLength={200}
            placeholder={meta?.example || 'mis. Tagihan listrik Oktober'}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>
        {kategori === 'lainnya' && (
          <div className="ex-field ex-grow">
            <label htmlFor="ex-kategori-sendiri">Nama jenis sendiri <em>(opsional)</em></label>
            <input
              id="ex-kategori-sendiri"
              value={kategoriSendiri}
              maxLength={50}
              placeholder="mis. Parkir"
              onChange={(e) => setKategoriSendiri(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="ex-actions">
        <button className="btn-primary ex-save" type="submit" disabled={saving}>
          <span aria-hidden="true" className="material-symbols-rounded">{editing ? 'check' : 'add'}</span>
          {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
        </button>
        {!editing && <span className="ex-hint">Setelah disimpan, formulir siap untuk pengeluaran berikutnya.</span>}
      </div>
    </form>
  );
}
