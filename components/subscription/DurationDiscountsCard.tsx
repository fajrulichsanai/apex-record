'use client';

import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { subscriptionPlanApi } from '@/lib/subscription';
import { useToast } from '@/lib/toast-context';
import { DURATION_OPTIONS } from '@/types/subscription';

const EDITABLE = DURATION_OPTIONS.filter((m) => m !== 1);

/** Super Admin: diskon lama langganan 3/6/12 bulan (persen, 0–50). */
export default function DurationDiscountsCard() {
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<number, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    subscriptionPlanApi
      .durationDiscounts()
      .then((d) => alive && setValues(Object.fromEntries(EDITABLE.map((m) => [m, String(d[m] ?? 0)]))))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const parsed = values ? EDITABLE.map((m) => Number(values[m])) : [];
  const valid = !!values && parsed.every((v, i) => values[EDITABLE[i]] !== '' && Number.isFinite(v) && v >= 0 && v <= 50);

  async function save() {
    if (!values || !valid) return;
    setBusy(true);
    try {
      const saved = await subscriptionPlanApi.setDurationDiscounts(
        Object.fromEntries(EDITABLE.map((m) => [m, Number(values[m])])),
      );
      setValues(Object.fromEntries(EDITABLE.map((m) => [m, String(saved[m] ?? 0)])));
      showToast('Diskon lama langganan disimpan', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Gagal menyimpan diskon', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Diskon lama langganan</h3>
      <p className="ft-setting-desc" style={{ marginBottom: 12 }}>
        Potongan untuk klinik yang membayar beberapa bulan sekaligus. Dihitung dari harga yang berlaku (setelah promo);
        storage tambahan tidak didiskon. Berlaku untuk klaim pembayaran berikutnya.
      </p>
      {failed ? (
        <div className="alert-error">Gagal memuat diskon.</div>
      ) : !values ? (
        <p className="ft-empty">Memuat…</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          {EDITABLE.map((m) => (
            <div key={m} className="sa-field" style={{ width: 120 }}>
              <label htmlFor={`duration-discount-${m}`}>{m === 12 ? '1 tahun' : `${m} bulan`} (%)</label>
              <input
                id={`duration-discount-${m}`}
                type="number"
                min={0}
                max={50}
                step={0.5}
                inputMode="decimal"
                value={values[m]}
                onChange={(e) => setValues({ ...values, [m]: e.target.value })}
              />
            </div>
          ))}
          <button type="button" className="btn-primary" disabled={!valid || busy} onClick={save}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      )}
      {values && !valid && <p className="ft-setting-desc" style={{ color: 'var(--red, #b42318)' }}>Isi 0–50%.</p>}
    </div>
  );
}
