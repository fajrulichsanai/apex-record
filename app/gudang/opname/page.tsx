'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { ApiError } from '@/lib/api-client';
import { gudangApi, type Barang, type StockOpnameDetail, type StockOpnameSummary } from '@/lib/gudang';
import { useToast } from '@/lib/toast-context';
import { useAuth } from '@/lib/auth-context';
import { isFeatureViewOnly } from '@/lib/permissions';
import GudangTabs from '../GudangTabs';
import '../../styles/gudang.css';
import '../../styles/stock-opname.css';

const rp = (n: number) => {
  const v = Math.round(n || 0);
  return `${v < 0 ? '−' : ''}Rp ${Math.abs(v).toLocaleString('id-ID')}`;
};
const today = () => new Date().toISOString().slice(0, 10);
const tgl = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

type Count = { fisik: string; catatan: string };

/** Hitung fisik BMHP, sistem menyesuaikan stok sebesar selisih & menyimpan berita acara. */
export default function StockOpnamePage() {
  const { user } = useAuth();
  const viewOnly = isFeatureViewOnly(user?.role, 'gudang');
  const { success, error: showError } = useToast();
  const [history, setHistory] = useState<StockOpnameSummary[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [counting, setCounting] = useState(false);
  const [counts, setCounts] = useState<Record<number, Count>>({});
  const [tanggal, setTanggal] = useState(today());
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<StockOpnameDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, b] = await Promise.all([gudangApi.listOpname(), gudangApi.listBarang({ limit: 1000, isActive: true })]);
      setHistory(h);
      setBarang(b.data);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat data stock opname');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = () => {
    setCounts(Object.fromEntries(barang.map((b) => [b.id, { fisik: String(b.stokSaatIni), catatan: '' }])));
    setTanggal(today());
    setNote('');
    setCounting(true);
    setDetail(null);
  };

  const rows = useMemo(
    () =>
      barang.map((b) => {
        const c = counts[b.id];
        const fisik = c && c.fisik !== '' ? Number(c.fisik) : b.stokSaatIni;
        const selisih = fisik - b.stokSaatIni;
        return { b, c, fisik, selisih, nilai: selisih * Number(b.hargaBeli || 0) };
      }),
    [barang, counts],
  );
  const q = search.trim().toLowerCase();
  const shown = rows.filter(
    (r) => (!q || r.b.name.toLowerCase().includes(q) || r.b.sku?.toLowerCase().includes(q)) && (!onlyDiff || r.selisih !== 0),
  );
  const diffRows = rows.filter((r) => r.selisih !== 0);
  const totalNilai = diffRows.reduce((s, r) => s + r.nilai, 0);
  const invalid = rows.some((r) => !Number.isInteger(r.fisik) || r.fisik < 0);

  const save = async () => {
    setConfirm(false);
    setSaving(true);
    try {
      const res = await gudangApi.createOpname({
        tanggal,
        note: note.trim() || undefined,
        items: rows.map((r) => ({ barangId: r.b.id, stokFisik: r.fisik, catatan: r.c?.catatan.trim() || undefined })),
      });
      success(`Stock opname disimpan — ${diffRows.length} barang disesuaikan`);
      setCounting(false);
      setDetail(res);
      void load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal menyimpan stock opname');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id: number) => {
    try {
      setDetail(await gudangApi.getOpname(id));
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Gagal memuat berita acara');
    }
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="gudang">
        <main className="content gudang-page opname-page">
          <GudangTabs active="opname" />

          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Stock Opname BMHP</h1>
              </div>
              <p className="page-subtitle">
                Hitung stok fisik bahan habis pakai. Selisih dengan stok sistem otomatis dibuatkan transaksi penyesuaian
                dan tercatat di berita acara.
              </p>
            </div>
            <div className="page-header-actions">
              {!viewOnly && !counting && (
                <button className="btn-primary" type="button" onClick={start} disabled={loading || barang.length === 0}>
                  <span aria-hidden="true" className="material-symbols-rounded">fact_check</span>
                  Mulai stock opname
                </button>
              )}
            </div>
          </div>

          {counting && (
            <div className="panel opname-count">
              <div className="opname-form">
                <label>
                  <span>Tanggal opname</span>
                  <input type="date" value={tanggal} max={today()} onChange={(e) => setTanggal(e.target.value)} />
                </label>
                <label className="grow">
                  <span>Catatan</span>
                  <input value={note} maxLength={255} placeholder="mis. Opname akhir bulan Oktober" onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>
              <div className="opname-tools">
                <input
                  className="opname-search"
                  placeholder="Cari barang / SKU"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <label className="opname-check">
                  <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
                  Hanya yang selisih
                </label>
                <span className="opname-summary">
                  {diffRows.length} barang selisih · nilai <strong className={totalNilai < 0 ? 'neg' : ''}>{rp(totalNilai)}</strong>
                </span>
              </div>
              <div className="gudang-table-wrap">
                <table className="gudang-table">
                  <thead>
                    <tr>
                      <th>Barang</th>
                      <th>Stok sistem</th>
                      <th>Stok fisik</th>
                      <th>Selisih</th>
                      <th>Nilai selisih</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(({ b, c, selisih, nilai }) => (
                      <tr key={b.id} className={selisih !== 0 ? 'opname-diff' : undefined}>
                        <td>
                          <div className="gudang-name">{b.name}</div>
                          <div className="gudang-code">{b.sku}</div>
                        </td>
                        <td>
                          {b.stokSaatIni} {b.satuanPakai}
                        </td>
                        <td>
                          <input
                            className="opname-input"
                            type="number"
                            min={0}
                            step={1}
                            inputMode="numeric"
                            aria-label={`Stok fisik ${b.name}`}
                            value={c?.fisik ?? ''}
                            onChange={(e) => setCounts((m) => ({ ...m, [b.id]: { fisik: e.target.value, catatan: m[b.id]?.catatan ?? '' } }))}
                          />
                        </td>
                        <td className={selisih < 0 ? 'neg' : selisih > 0 ? 'pos' : undefined}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </td>
                        <td className={nilai < 0 ? 'neg' : undefined}>{selisih ? rp(nilai) : '-'}</td>
                        <td>
                          {selisih !== 0 && (
                            <input
                              className="opname-note"
                              placeholder="mis. rusak, kedaluwarsa"
                              maxLength={255}
                              aria-label={`Keterangan ${b.name}`}
                              value={c?.catatan ?? ''}
                              onChange={(e) => setCounts((m) => ({ ...m, [b.id]: { fisik: m[b.id]?.fisik ?? '', catatan: e.target.value } }))}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="opname-actions">
                <button type="button" className="btn-outline" onClick={() => setCounting(false)} disabled={saving}>
                  Batal
                </button>
                <button type="button" className="btn-primary" onClick={() => setConfirm(true)} disabled={saving || invalid}>
                  {saving ? 'Menyimpan…' : 'Simpan & sesuaikan stok'}
                </button>
              </div>
            </div>
          )}

          {detail && !counting && (
            <div className="panel opname-detail">
              <div className="opname-detail-head">
                <div>
                  <h2>Berita Acara Stock Opname #{detail.id}</h2>
                  <p className="page-subtitle">
                    {tgl(detail.tanggal)} · oleh {detail.createdByName || '-'}
                    {detail.note ? ` · ${detail.note}` : ''}
                  </p>
                </div>
                <div className="opname-detail-actions">
                  <button type="button" className="btn-outline" onClick={() => window.print()}>
                    <span aria-hidden="true" className="material-symbols-rounded">print</span>
                    Cetak
                  </button>
                  <button type="button" className="btn-outline" onClick={() => setDetail(null)}>
                    Tutup
                  </button>
                </div>
              </div>
              <div className="gudang-table-wrap">
                <table className="gudang-table">
                  <thead>
                    <tr>
                      <th>Barang</th>
                      <th>Sistem</th>
                      <th>Fisik</th>
                      <th>Selisih</th>
                      <th>Harga beli</th>
                      <th>Nilai selisih</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((i) => (
                      <tr key={i.id} className={i.selisih !== 0 ? 'opname-diff' : undefined}>
                        <td>{i.name}</td>
                        <td>{i.stokSistem}</td>
                        <td>{i.stokFisik}</td>
                        <td className={i.selisih < 0 ? 'neg' : i.selisih > 0 ? 'pos' : undefined}>
                          {i.selisih > 0 ? `+${i.selisih}` : i.selisih}
                        </td>
                        <td>{rp(i.hargaBeli)}</td>
                        <td className={i.selisih < 0 ? 'neg' : undefined}>{i.selisih ? rp(i.selisih * i.hargaBeli) : '-'}</td>
                        <td>{i.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}>Total nilai selisih</td>
                      <td className={detail.totalSelisihNilai < 0 ? 'neg' : undefined}>
                        <strong>{rp(detail.totalSelisihNilai)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="opname-sign">
                <div>
                  Dihitung oleh,
                  <span>( {detail.createdByName || '................'} )</span>
                </div>
                <div>
                  Diperiksa oleh,
                  <span>( ................ )</span>
                </div>
              </div>
            </div>
          )}

          {!counting && (
            <div className="panel">
              <div className="panel-sort">
                <span className="sort-label">Riwayat stock opname</span>
              </div>
              {loading ? (
                <div className="empty-list">
                  <div className="empty-title">Memuat…</div>
                </div>
              ) : history.length === 0 ? (
                <div className="empty-list">
                  <div className="empty-icon-wrap">
                    <span aria-hidden="true" className="material-symbols-rounded">inventory</span>
                  </div>
                  <div className="empty-title">Belum ada stock opname</div>
                  <div className="empty-sub">Lakukan stock opname rutin (mis. akhir bulan) agar stok sistem sesuai fisik.</div>
                </div>
              ) : (
                <div className="gudang-table-wrap">
                  <table className="gudang-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Barang dihitung</th>
                        <th>Selisih</th>
                        <th>Nilai selisih</th>
                        <th>Oleh</th>
                        <th>Catatan</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td>{tgl(h.tanggal)}</td>
                          <td>{h.itemCount}</td>
                          <td>{h.selisihCount} barang</td>
                          <td className={h.totalSelisihNilai < 0 ? 'neg' : undefined}>{rp(h.totalSelisihNilai)}</td>
                          <td>{h.createdByName || '-'}</td>
                          <td>{h.note || '-'}</td>
                          <td>
                            <button type="button" className="btn-outline opname-view" onClick={() => openDetail(h.id)}>
                              Lihat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <ConfirmationModal
            isOpen={confirm}
            title="Simpan stock opname?"
            message={`${diffRows.length} barang akan disesuaikan ke jumlah fisik (nilai selisih ${rp(totalNilai)}). Riwayat tidak bisa diubah setelah disimpan.`}
            confirmLabel="Simpan"
            onConfirm={save}
            onCancel={() => setConfirm(false)}
          />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
