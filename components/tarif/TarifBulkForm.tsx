'use client';

import { useState } from 'react';
import { FiPlus, FiTrash2, FiZap } from 'react-icons/fi';
import { tarifApi } from '@/lib/tarif';
import { formatCurrencyInput, parseCurrency } from '@/lib/format';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import './TarifBulkForm.css';

/** Kategori bidang + contoh tindakan (nama saja — harga diisi klinik). */
export const BIDANG: { kategori: string; contoh: string[] }[] = [
  { kategori: 'Konsultasi & Pemeriksaan', contoh: ['Konsultasi', 'Pemeriksaan Gigi & Mulut', 'Rontgen Periapikal'] },
  { kategori: 'Konservasi (Tambal)', contoh: ['Tambal Komposit Kecil', 'Tambal Komposit Besar', 'Tambal Sementara'] },
  { kategori: 'Endodonti (Saluran Akar)', contoh: ['Perawatan Saluran Akar Gigi Depan', 'Perawatan Saluran Akar Gigi Belakang', 'Pulpotomi'] },
  { kategori: 'Periodonti', contoh: ['Scaling Rahang Atas & Bawah', 'Kuretase', 'Splinting'] },
  { kategori: 'Bedah Mulut', contoh: ['Cabut Gigi Biasa', 'Cabut Gigi dengan Komplikasi', 'Odontektomi'] },
  { kategori: 'Ortodonti', contoh: ['Pasang Behel Metal', 'Pasang Behel Keramik', 'Kontrol Behel', 'Lepas Behel', 'Retainer'] },
  { kategori: 'Prostodonti (Gigi Tiruan)', contoh: ['Gigi Tiruan Lepasan Akrilik', 'Crown PFM', 'Crown Zirconia', 'Veneer'] },
  { kategori: 'Pedodonti (Gigi Anak)', contoh: ['Cabut Gigi Susu', 'Fissure Sealant', 'Topikal Aplikasi Fluor'] },
  { kategori: 'Estetik', contoh: ['Bleaching In-Office', 'Bleaching Home Kit'] },
  { kategori: 'Umum', contoh: ['Konsultasi Dokter Umum', 'Perawatan Luka', 'Nebulizer', 'Pemeriksaan Gula Darah'] },
];

interface Row {
  key: string;
  name: string;
  deskripsi: string;
  hargaPokok: string;
  hargaJual: string;
  diskonMaksimal: string;
  kodeIcd9: string;
}

interface Group {
  key: string;
  kategori: string;
  rows: Row[];
}

let seq = 0;
const uid = () => `k${Date.now().toString(36)}-${++seq}`;
const newRow = (name = ''): Row => ({
  key: uid(),
  name,
  deskripsi: '',
  hargaPokok: '',
  hargaJual: '',
  diskonMaksimal: '',
  kodeIcd9: '',
});
const newGroup = (kategori = ''): Group => ({ key: uid(), kategori, rows: [newRow()] });
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const digitsOnly = (v: string) => v.replace(/\D/g, '');

/**
 * Input tarif per rumpun: Kategori bidang → tindakan (nama, deskripsi, modal,
 * jual, margin otomatis; diskon maksimal & ICD-9-CM opsional) → tambah tindakan
 * lain di rumpun yang sama. Dipakai di onboarding & halaman Tambah Tarif.
 */
export default function TarifBulkForm({
  knownKategori = [],
  cancelLabel = 'Batal',
  submitLabel = 'Simpan Tarif',
  allowEmptySubmit = false,
  onCancel,
  onSaved,
}: {
  /** Kategori yang sudah ada di klinik — muncul sebagai saran */
  knownKategori?: string[];
  cancelLabel?: string;
  submitLabel?: string;
  /** true: boleh lanjut tanpa menambah tarif (mis. onboarding yang sudah punya tarif) */
  allowEmptySubmit?: boolean;
  onCancel: () => void;
  onSaved: (added: number) => void;
}) {
  const { success, error: showError, warning } = useToast();
  const [groups, setGroups] = useState<Group[]>([newGroup()]);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const used = new Set(groups.map((g) => g.kategori.trim().toLowerCase()).filter(Boolean));
  const suggestions = Array.from(new Set([...knownKategori, ...BIDANG.map((b) => b.kategori)]));

  const patchGroup = (key: string, patch: Partial<Group>) =>
    setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const patchRow = (gk: string, rk: string, patch: Partial<Row>) =>
    setGroups((gs) =>
      gs.map((g) => (g.key === gk ? { ...g, rows: g.rows.map((r) => (r.key === rk ? { ...r, ...patch } : r)) } : g)),
    );

  function addBidang(kategori: string) {
    setGroups((gs) => {
      const empty = gs.find((g) => !g.kategori.trim() && g.rows.every((r) => !r.name.trim()));
      if (empty) return gs.map((g) => (g.key === empty.key ? { ...g, kategori } : g));
      return [...gs, newGroup(kategori)];
    });
  }

  function fillExamples(g: Group) {
    const contoh = BIDANG.find((b) => b.kategori.toLowerCase() === g.kategori.trim().toLowerCase())?.contoh ?? [];
    const existing = new Set(g.rows.map((r) => r.name.trim().toLowerCase()));
    const kept = g.rows.filter((r) => r.name.trim() || r.hargaJual);
    const add = contoh.filter((c) => !existing.has(c.toLowerCase())).map((c) => newRow(c));
    const rows = [...kept, ...add];
    patchGroup(g.key, { rows: rows.length ? rows : [newRow()] });
  }

  async function save() {
    const items = groups.flatMap((g) => g.rows.filter((r) => r.name.trim() || r.hargaJual).map((r) => ({ g, r })));
    for (const { g, r } of items) {
      if (!g.kategori.trim()) return showError('Isi kategori bidang terlebih dahulu');
      if (!r.name.trim()) return showError(`Nama tindakan di ${g.kategori} belum diisi`);
      if (!parseCurrency(r.hargaJual)) return showError(`Harga jual "${r.name}" wajib diisi`);
      if (parseCurrency(r.diskonMaksimal) > parseCurrency(r.hargaJual)) {
        return showError(`Diskon maksimal "${r.name}" melebihi harga jual`);
      }
    }
    if (!items.length) {
      if (allowEmptySubmit) return onSaved(0);
      return showError('Isi minimal 1 tindakan beserta harga jualnya');
    }
    const rugi = items.filter(({ r }) => parseCurrency(r.hargaPokok) > parseCurrency(r.hargaJual));
    if (rugi.length) warning(`${rugi.length} tindakan harga jualnya di bawah modal — periksa lagi bila tidak disengaja`);

    setSaving(true);
    let added = 0;
    try {
      for (const { g, r } of items) {
        await tarifApi.create({
          name: r.name.trim(),
          kategori: g.kategori.trim(),
          ...(r.deskripsi.trim() ? { deskripsi: r.deskripsi.trim() } : {}),
          hargaPokok: parseCurrency(r.hargaPokok),
          hargaJual: parseCurrency(r.hargaJual),
          diskonMaksimal: parseCurrency(r.diskonMaksimal),
          ...(r.kodeIcd9.trim() ? { kodeIcd9: r.kodeIcd9.trim() } : {}),
        });
        added++;
        // Baris tersimpan dibuang dari form → aman bila disimpan ulang setelah galat
        setGroups((gs) => gs.map((x) => (x.key === g.key ? { ...x, rows: x.rows.filter((y) => y.key !== r.key) } : x)));
      }
      success(`${added} tarif ditambahkan`);
      setGroups([newGroup()]);
      onSaved(added);
    } catch (err) {
      showError(`${added ? `${added} tarif tersimpan, ` : ''}${err instanceof ApiError ? err.message : 'gagal menyimpan tarif'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tbf">
      <div className="tbf-chips" aria-label="Tambah kategori bidang">
        <span className="tbf-chips-label">Kategori bidang:</span>
        {BIDANG.filter((b) => !used.has(b.kategori.toLowerCase())).map((b) => (
          <button key={b.kategori} type="button" className="tbf-chip" onClick={() => addBidang(b.kategori)}>
            <FiPlus /> {b.kategori}
          </button>
        ))}
      </div>

      <div className="tbf-groups">
        {groups.map((g, gi) => {
          const hasExamples = BIDANG.some((b) => b.kategori.toLowerCase() === g.kategori.trim().toLowerCase());
          return (
            <section key={g.key} className="tbf-group" aria-label={`Kategori ${gi + 1}`}>
              <div className="tbf-group-head">
                <label className="tbf-field tbf-kategori">
                  <span>1. Kategori bidang *</span>
                  <input
                    list="tbf-kategori-list"
                    value={g.kategori}
                    placeholder="mis. Ortodonti"
                    onChange={(e) => patchGroup(g.key, { kategori: e.target.value })}
                  />
                </label>
                <div className="tbf-group-actions">
                  {hasExamples && (
                    <button type="button" className="tbf-btn" onClick={() => fillExamples(g)}>
                      <FiZap /> Isi contoh tindakan
                    </button>
                  )}
                  {groups.length > 1 && (
                    <button
                      type="button"
                      className="tbf-icon-btn"
                      aria-label={`Hapus kategori ${g.kategori}`}
                      onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>

              <div className="tbf-items">
                {g.rows.map((r, ri) => {
                  const modal = parseCurrency(r.hargaPokok);
                  const jual = parseCurrency(r.hargaJual);
                  const margin = jual - modal;
                  return (
                    <div key={r.key} className="tbf-item">
                      <div className="tbf-item-head">
                        <span className="tbf-item-no">Tindakan {ri + 1}</span>
                        <button
                          type="button"
                          className="tbf-icon-btn"
                          aria-label="Hapus tindakan"
                          disabled={g.rows.length === 1}
                          onClick={() => patchGroup(g.key, { rows: g.rows.filter((x) => x.key !== r.key) })}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      <label className="tbf-field">
                        <span>2. Nama tindakan *</span>
                        <input
                          value={r.name}
                          maxLength={150}
                          placeholder="mis. Pasang Behel Metal"
                          onChange={(e) => patchRow(g.key, r.key, { name: e.target.value })}
                        />
                      </label>
                      <label className="tbf-field">
                        <span>3. Deskripsi</span>
                        <textarea
                          rows={2}
                          value={r.deskripsi}
                          placeholder="Opsional — mis. termasuk kontrol 1x, per rahang"
                          onChange={(e) => patchRow(g.key, r.key, { deskripsi: e.target.value })}
                        />
                      </label>
                      <div className="tbf-prices">
                        <label className="tbf-field">
                          <span>4. Harga modal</span>
                          <input
                            inputMode="numeric"
                            placeholder="Rp 0"
                            value={formatCurrencyInput(r.hargaPokok)}
                            onChange={(e) => patchRow(g.key, r.key, { hargaPokok: digitsOnly(e.target.value) })}
                          />
                        </label>
                        <label className="tbf-field">
                          <span>5. Harga jual *</span>
                          <input
                            inputMode="numeric"
                            placeholder="Rp 0"
                            value={formatCurrencyInput(r.hargaJual)}
                            onChange={(e) => patchRow(g.key, r.key, { hargaJual: digitsOnly(e.target.value) })}
                          />
                        </label>
                        <div className={`tbf-margin ${jual && margin < 0 ? 'neg' : ''}`} aria-label="Margin">
                          <span>Margin</span>
                          <strong>{jual ? rp(margin) : '—'}</strong>
                          {jual > 0 && modal > 0 && <small>{Math.round((margin / jual) * 100)}% dari harga jual</small>}
                        </div>
                      </div>
                      {showAdvanced && (
                        <div className="tbf-prices tbf-adv">
                          <label className="tbf-field">
                            <span>Diskon maksimal (Rp)</span>
                            <input
                              inputMode="numeric"
                              placeholder="0 = tanpa diskon"
                              value={formatCurrencyInput(r.diskonMaksimal)}
                              onChange={(e) => patchRow(g.key, r.key, { diskonMaksimal: digitsOnly(e.target.value) })}
                            />
                          </label>
                          <label className="tbf-field">
                            <span>Kode ICD-9-CM</span>
                            <input
                              maxLength={20}
                              placeholder="mis. 24.7"
                              value={r.kodeIcd9}
                              onChange={(e) => patchRow(g.key, r.key, { kodeIcd9: e.target.value })}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="tbf-add" onClick={() => patchGroup(g.key, { rows: [...g.rows, newRow()] })}>
                <FiPlus /> Tambah tindakan lain di {g.kategori.trim() || 'kategori ini'}
              </button>
            </section>
          );
        })}
      </div>

      <datalist id="tbf-kategori-list">
        {suggestions.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      <div className="tbf-footer-tools">
        <button type="button" className="tbf-add" onClick={() => setGroups((gs) => [...gs, newGroup()])}>
          <FiPlus /> Tambah kategori bidang lain
        </button>
        <label className="tbf-toggle">
          <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} />
          Atur diskon maksimal & kode ICD-9-CM
        </label>
      </div>

      <div className="tbf-actions">
        <button type="button" className="tbf-btn" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </button>
        <button type="button" className="tbf-btn primary" onClick={save} disabled={saving}>
          {saving ? 'Menyimpan...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
