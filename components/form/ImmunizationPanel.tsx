'use client';

import { useCallback, useEffect, useState } from 'react';
import KfaDrugPicker, { type KfaDrugValue } from '@/components/form/KfaDrugPicker';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { useToast } from '@/lib/toast-context';
import { immunizationsApi, type ImmunizationRecord } from '@/lib/immunizations';
import './PharmacyPanel.css';

const errMsg = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
type Opt = { value: string; label: string };

/**
 * Imunisasi / vaksin yang diberikan di kunjungan ini (Immunization
 * SATUSEHAT). Vaksin wajib dipilih dari KFA (kode produk 93…).
 * Hanya tampil untuk klinik yang mengaktifkan fitur Imunisasi.
 */
export default function ImmunizationPanel({ encounterId }: { encounterId: number }) {
  const { success, error } = useToast();
  const [rows, setRows] = useState<ImmunizationRecord[]>([]);
  const [opts, setOpts] = useState<{ routes: Opt[]; sites: Opt[] }>({ routes: [], sites: [] });
  const [adding, setAdding] = useState(false);
  const [vaccine, setVaccine] = useState<KfaDrugValue>({ drugName: '', kfaCode: null, kfaName: null });
  const [form, setForm] = useState({ doseNumber: '1', doseMl: '', route: '', site: '', lot: '', expiry: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<ImmunizationRecord | null>(null);

  const reload = useCallback(async () => {
    try {
      setRows(await immunizationsApi.list(encounterId));
    } catch (err) {
      error(errMsg(err, 'Gagal memuat imunisasi'));
    }
  }, [encounterId, error]);

  useEffect(() => {
    void reload();
    immunizationsApi.options().then(setOpts).catch(() => undefined);
  }, [reload]);

  const validKfa = !!vaccine.kfaCode && /^93\d{6}$/.test(vaccine.kfaCode);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validKfa) return;
    setBusy(true);
    try {
      await immunizationsApi.create(encounterId, {
        kfaCode: vaccine.kfaCode!,
        vaccineName: vaccine.kfaName || vaccine.drugName,
        doseNumber: Number(form.doseNumber),
        ...(form.doseMl ? { doseMl: Number(form.doseMl.replace(',', '.')) } : {}),
        ...(form.route ? { route: form.route } : {}),
        ...(form.site ? { site: form.site } : {}),
        ...(form.lot.trim() ? { lotNumber: form.lot.trim() } : {}),
        ...(form.expiry ? { expirationDate: form.expiry } : {}),
        ...(form.note.trim() ? { note: form.note.trim() } : {}),
      });
      await reload();
      success('Imunisasi dicatat');
      setAdding(false);
      setVaccine({ drugName: '', kfaCode: null, kfaName: null });
      setForm({ doseNumber: '1', doseMl: '', route: '', site: '', lot: '', expiry: '', note: '' });
    } catch (err) {
      error(errMsg(err, 'Gagal menyimpan imunisasi'));
    } finally {
      setBusy(false);
    }
  };

  const labelOf = (list: Opt[], v: string | null) => list.find((o) => o.value === v)?.label;

  return (
    <section className="ph-card" aria-labelledby="im-title" style={{ marginTop: 16 }}>
      <div className="ph-head">
        <h3 id="im-title">Imunisasi / Vaksin</h3>
        <p>Vaksin yang diberikan di kunjungan ini. Pilih vaksin dari KFA (kode produk 93…).</p>
      </div>

      {rows.length > 0 && (
        <ul className="ph-list">
          {rows.map((r) => (
            <li key={r.id} className="ph-item">
              <div className="ph-item-main">
                <strong>{r.vaccineName}</strong>
                <div className="ph-states">
                  <span className="ph-badge ok">Dosis ke-{r.doseNumber}</span>
                  {r.doseMl && <span className="ph-badge">{Number(r.doseMl).toLocaleString('id-ID')} mL</span>}
                  {r.route && <span className="ph-badge">{labelOf(opts.routes, r.route) ?? r.route}</span>}
                  {r.site && <span className="ph-badge">{labelOf(opts.sites, r.site) ?? r.site}</span>}
                  {r.lotNumber && <span className="ph-badge">Batch {r.lotNumber}</span>}
                </div>
                <span className="ph-hint">
                  {new Date(r.occurredAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · KFA{' '}
                  {r.kfaCode}
                  {r.note && ` · ${r.note}`}
                </span>
              </div>
              <div className="ph-actions">
                <button type="button" className="ph-link danger" onClick={() => setRemoving(r)}>
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form className="ph-form" onSubmit={submit} aria-label="Catat imunisasi">
          <div className="ph-span-2">
            <KfaDrugPicker value={vaccine} onChange={setVaccine} disabled={busy} />
            {vaccine.drugName && !validKfa && (
              <span className="ph-hint">Pilih vaksin dari daftar KFA (kode produk 93…).</span>
            )}
          </div>
          <label>
            Dosis ke-
            <input
              type="number"
              aria-label="Dosis ke"
              min={1}
              max={20}
              value={form.doseNumber}
              onChange={(e) => set('doseNumber', e.target.value)}
            />
          </label>
          <label>
            Volume (mL)
            <input
              type="number"
              aria-label="Volume dosis"
              step="0.01"
              min={0.01}
              max={10}
              value={form.doseMl}
              onChange={(e) => set('doseMl', e.target.value)}
              placeholder="mis. 0,5"
            />
          </label>
          <label>
            Rute
            <select aria-label="Rute pemberian" value={form.route} onChange={(e) => set('route', e.target.value)}>
              <option value="">— Tidak diisi —</option>
              {opts.routes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lokasi suntik
            <select aria-label="Lokasi suntik" value={form.site} onChange={(e) => set('site', e.target.value)}>
              <option value="">— Tidak diisi —</option>
              {opts.sites.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            No. batch
            <input type="text" aria-label="Nomor batch vaksin" maxLength={50} value={form.lot} onChange={(e) => set('lot', e.target.value)} />
          </label>
          <label>
            Kedaluwarsa
            <input type="date" aria-label="Kedaluwarsa vaksin" value={form.expiry} onChange={(e) => set('expiry', e.target.value)} />
          </label>
          <label className="ph-span-2">
            Catatan
            <input type="text" aria-label="Catatan imunisasi" maxLength={300} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </label>
          <div className="ph-actions-row ph-span-2">
            <button type="button" className="btn-outline" onClick={() => setAdding(false)} disabled={busy}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !validKfa || !form.doseNumber}>
              Simpan
            </button>
          </div>
        </form>
      ) : (
        <div className="ph-actions">
          <button type="button" className="ph-link" onClick={() => setAdding(true)}>
            + Catat imunisasi
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!removing}
        title="Hapus imunisasi?"
        message={removing ? `Hapus catatan ${removing.vaccineName}? Bila sudah terkirim, SATUSEHAT akan dikabari sebagai salah input.` : ''}
        confirmLabel="Hapus"
        isDangerous
        onConfirm={async () => {
          const r = removing!;
          setRemoving(null);
          try {
            const res = await immunizationsApi.remove(encounterId, r.id);
            await reload();
            success(res.pendingSync ? 'Dihapus — pembatalan akan dikirim ke SATUSEHAT' : 'Dihapus');
          } catch (err) {
            error(errMsg(err, 'Gagal menghapus'));
          }
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
