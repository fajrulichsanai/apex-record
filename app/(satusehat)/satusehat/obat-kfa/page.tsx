'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { SatusehatShell } from '@/components/satusehat/SatusehatShell';
import { satusehatApi, type MedicationKfa } from '@/lib/satusehat';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

const PAGE_SIZE = 50;

export default function ObatKfaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canEdit = user?.role === 'owner' || user?.role === 'super_admin';
  const [items, setItems] = useState<MedicationKfa[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await satusehatApi.listMedications({ page, limit: PAGE_SIZE, search: search || undefined });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat data obat', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function save(med: MedicationKfa) {
    const code = (drafts[med.medicationId] ?? med.kfaCode ?? '').trim();
    if (!/^\d{8}$/.test(code)) {
      showToast('Kode KFA harus 8 digit angka (mis. 93002013)', 'error');
      return;
    }
    setSavingId(med.medicationId);
    try {
      await satusehatApi.updateMedicationKfa(med.medicationId, code);
      setItems((prev) => prev.map((m) => (m.medicationId === med.medicationId ? { ...m, kfaCode: code } : m)));
      setDrafts(({ [med.medicationId]: _, ...rest }) => rest);
      showToast(`Kode KFA ${med.name} disimpan`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan kode KFA', 'error');
    } finally {
      setSavingId(null);
    }
  }

  const visible = onlyMissing ? items.filter((m) => !m.kfaCode) : items;
  const missingCount = items.filter((m) => !m.kfaCode).length;

  return (
    <SatusehatShell
      title="Kode KFA Obat"
      subtitle="Resep dan pengeluaran obat hanya bisa dikirim ke SATUSEHAT bila obat memiliki kode KFA (Kamus Farmasi & Alkes)"
    >
      <div className="ss-notice">
        Cari kode KFA di portal SATUSEHAT (menu Kamus Farmasi &amp; Alat Kesehatan). Gunakan kode produk 8 digit:
        <b> 93xxxxxx</b> untuk obat bermerek / produk jadi, <b>92xxxxxx</b> untuk obat generik.
      </div>

      <div className="ss-card">
        <form className="ss-toolbar" onSubmit={onSearch}>
          <input
            className="ss-input grow"
            placeholder="Cari nama obat"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="ss-btn">
            Cari
          </button>
          <label className="ss-muted" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Hanya yang belum ada kode ({missingCount})
          </label>
        </form>

        <div className="ss-table-wrap">
          <table className="ss-table">
            <thead>
              <tr>
                <th>Obat</th>
                <th>Kode KFA</th>
                <th>Status</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="ss-empty">
                    Memuat...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ss-empty">
                    Tidak ada data obat.
                  </td>
                </tr>
              ) : (
                visible.map((m) => (
                  <tr key={m.medicationId}>
                    <td>
                      {m.name}
                      <span className="sub">
                        {[m.genericName, m.strength, m.dosageForm].filter(Boolean).join(' · ') || '-'}
                      </span>
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          className="ss-input ss-mono"
                          style={{ width: 130 }}
                          inputMode="numeric"
                          maxLength={8}
                          placeholder="93xxxxxx"
                          value={drafts[m.medicationId] ?? m.kfaCode ?? ''}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [m.medicationId]: e.target.value.replace(/\D/g, '') }))
                          }
                        />
                      ) : (
                        <span className="ss-mono">{m.kfaCode || '-'}</span>
                      )}
                    </td>
                    <td>
                      <span className={`ss-badge ${m.kfaCode ? 'synced' : 'pending'}`}>
                        {m.kfaCode ? 'Siap dikirim' : 'Belum ada kode'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          type="button"
                          className="ss-btn sm"
                          disabled={savingId !== null || drafts[m.medicationId] === undefined}
                          onClick={() => save(m)}
                        >
                          {savingId === m.medicationId ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ss-pager">
          <button type="button" className="ss-btn sm" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>
            ‹ Sebelumnya
          </button>
          <span>Hal {page}</span>
          <button
            type="button"
            className="ss-btn sm"
            disabled={loading || items.length < PAGE_SIZE}
            onClick={() => setPage(page + 1)}
          >
            Berikutnya ›
          </button>
        </div>
      </div>
    </SatusehatShell>
  );
}
