'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import ConfirmationModal from '@/components/feedback/ConfirmationModal';
import { MonthNav, Pager, currentMonth, monthLabel, shiftMonth } from '@/components/ui/PeriodNav';
import { ApiError } from '@/lib/api-client';
import { kategoriMeta, operationalApi, type OperationalRecord, type OperationalSummary } from '@/lib/operational';
import { useToast } from '@/lib/toast-context';
import ExpenseForm, { kategoriLabel, type FormSeed } from './ExpenseForm';
import '../../styles/catat-operasional.css';

const PAGE_SIZE = 20;
const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/** Awal dan akhir bulan (YYYY-MM-DD) untuk filter tanggal. */
function monthRange(ym: string): { startDate?: string; endDate?: string } {
  if (!ym) return {};
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { startDate: `${ym}-01`, endDate: `${ym}-${String(last).padStart(2, '0')}` };
}

function dayHeading(tanggal: string) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function PengeluaranPage() {
  const { success, error, warning } = useToast();

  const [month, setMonth] = useState(currentMonth);
  const [kategori, setKategori] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasAny, setHasAny] = useState<boolean | null>(null);

  const [seed, setSeed] = useState<FormSeed>({ key: 0 });
  const [confirmDelete, setConfirmDelete] = useState<OperationalRecord | null>(null);
  const listTop = useRef<HTMLDivElement>(null);

  // Pencarian ditunda sebentar supaya tidak memanggil server di tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const range = monthRange(month);
    operationalApi
      .list({ ...range, kategori: kategori || undefined, search: search || undefined, page, limit: PAGE_SIZE })
      .then((res) => {
        if (!active) return;
        setRecords(res.data);
        setSummary(res.summary ?? null);
        setMeta({
          total: res.meta.total,
          page: res.meta.page,
          limit: res.meta.limit,
          totalPages: res.meta.totalPages ?? Math.max(1, Math.ceil(res.meta.total / res.meta.limit)),
        });
        if (!month && !kategori && !search) setHasAny(res.meta.total > 0);
      })
      .catch((err) => {
        if (active) error(err instanceof ApiError ? err.message : 'Gagal memuat pengeluaran');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, kategori, search, page, reloadKey, error]);

  // Pembanding "dari bulan lalu" — hanya total, jadi cukup satu baris.
  useEffect(() => {
    if (!month) {
      setPrevTotal(null);
      return;
    }
    let active = true;
    operationalApi
      .list({ ...monthRange(shiftMonth(month, -1)), limit: 1 })
      .then((res) => {
        if (active) setPrevTotal(res.summary?.total ?? null);
      })
      .catch(() => {
        if (active) setPrevTotal(null);
      });
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  // Apakah klinik sudah pernah mencatat? (untuk sambutan awal yang ramah)
  useEffect(() => {
    if (hasAny !== null) return;
    operationalApi
      .list({ limit: 1 })
      .then((res) => setHasAny(res.meta.total > 0))
      .catch(() => setHasAny(true));
  }, [hasAny]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const changeMonth = (next: string) => {
    setMonth(next);
    setKategori('');
    setPage(1);
  };
  const changeKategori = (next: string) => {
    setKategori((cur) => (cur === next ? '' : next));
    setPage(1);
  };
  const changePage = (next: number) => {
    setPage(next);
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const periodLabel = month ? monthLabel(month) : 'semua periode';
  const total = summary?.total ?? 0;
  // Bulan yang masih berjalan belum bisa dibandingkan persentase (belum penuh),
  // jadi hanya tampilkan total bulan lalu; bulan yang sudah lewat dibandingkan %.
  const isCurrentMonth = month === currentMonth();
  const delta = useMemo(() => {
    if (!month || isCurrentMonth || prevTotal === null || prevTotal === 0) return null;
    return Math.round(((total - prevTotal) / prevTotal) * 100);
  }, [month, isCurrentMonth, prevTotal, total]);
  const maxCat = summary?.byKategori[0]?.total || 1;

  // Kelompokkan baris per tanggal (urutan dari server: tanggal terbaru dulu).
  const groups = useMemo(() => {
    const out: { tanggal: string; items: OperationalRecord[] }[] = [];
    for (const r of records) {
      const last = out[out.length - 1];
      if (last && last.tanggal === r.tanggal) last.items.push(r);
      else out.push({ tanggal: r.tanggal, items: [r] });
    }
    return out;
  }, [records]);

  const exportCsv = async () => {
    try {
      const all: OperationalRecord[] = [];
      for (let p = 1; p <= 20; p++) {
        const res = await operationalApi.list({
          ...monthRange(month),
          kategori: kategori || undefined,
          search: search || undefined,
          page: p,
          limit: 1000,
        });
        all.push(...res.data);
        if (all.length >= res.meta.total) break;
      }
      if (all.length === 0) {
        warning('Tidak ada pengeluaran untuk diekspor');
        return;
      }
      const lines = [
        ['Tanggal', 'Jenis', 'Keterangan', 'Jumlah (Rp)'].join(','),
        ...all.map((r) => [r.tanggal, kategoriLabel(r.kategori), r.deskripsi, r.nominal].map(csvCell).join(',')),
      ];
      const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pengeluaran-${month || 'semua'}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(`${all.length} pengeluaran diekspor`);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengekspor');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await operationalApi.delete(confirmDelete.id);
      success('Pengeluaran dihapus');
      if (seed.record?.id === confirmDelete.id) setSeed({ key: seed.key + 1 });
      setConfirmDelete(null);
      reload();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus');
    }
  };

  const filtering = !!kategori || !!search;

  return (
    <DashboardLayout>
      <FeatureGuard feature="operasional">
        <main className="content operasional-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Pengeluaran</h1>
              </div>
              <p className="page-subtitle">
                Catat semua biaya klinik — listrik, sewa, bahan, gaji, dan lainnya. Angkanya dipakai untuk menghitung laba di laporan keuangan.
              </p>
            </div>
            <div className="page-header-actions">
              <button className="btn-outline" type="button" onClick={exportCsv}>
                <span aria-hidden="true" className="material-symbols-rounded">download</span>
                Ekspor Excel
              </button>
            </div>
          </div>

          {hasAny === false && !seed.record && (
            <div className="ex-welcome" role="note">
              <span aria-hidden="true" className="material-symbols-rounded">waving_hand</span>
              <div>
                <strong>Belum ada pengeluaran tercatat.</strong> Isi jumlah dan pilih jenisnya di bawah ini untuk mencatat yang pertama — laba bersih di laporan akan lebih akurat.
              </div>
            </div>
          )}

          <ExpenseForm
            key={seed.key}
            seed={seed}
            onSaved={() => {
              setPage(1);
              reload();
              if (seed.record) setSeed({ key: seed.key + 1 });
              setHasAny(true);
            }}
            onCancelEdit={() => setSeed({ key: seed.key + 1 })}
          />

          <section className="ex-card" aria-label="Ringkasan pengeluaran" ref={listTop}>
            <div className="ex-summary-head">
              <MonthNav month={month} onChange={changeMonth} allowAll />
            </div>
            <div className="ex-summary">
              <div className="ex-total">
                <div className="ex-total-label">Total pengeluaran {periodLabel}</div>
                <div className="ex-total-value">{rupiah(total)}</div>
                <div className="ex-total-sub">
                  {summary?.count ?? 0} catatan
                  {isCurrentMonth && prevTotal !== null && prevTotal > 0 && (
                    <span className="ex-delta">Bulan lalu: {rupiah(prevTotal)}</span>
                  )}
                  {delta !== null && (
                    <span className={`ex-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                      <span aria-hidden="true" className="material-symbols-rounded">
                        {delta > 0 ? 'arrow_upward' : delta < 0 ? 'arrow_downward' : 'remove'}
                      </span>
                      {delta === 0 ? 'sama dengan bulan lalu' : `${Math.abs(delta)}% ${delta > 0 ? 'lebih tinggi' : 'lebih rendah'} dari bulan lalu`}
                    </span>
                  )}
                </div>
              </div>

              <div className="ex-breakdown">
                {summary && summary.byKategori.length > 0 ? (
                  <>
                    <div className="ex-breakdown-title">
                      Per jenis <em>(klik untuk menyaring daftar)</em>
                    </div>
                    {summary.byKategori.map((k) => {
                      const m = kategoriMeta(k.kategori);
                      const on = kategori === k.kategori;
                      return (
                        <button
                          key={k.kategori}
                          type="button"
                          className={`ex-bar tone-${m.tone}${on ? ' on' : ''}${kategori && !on ? ' dim' : ''}`}
                          aria-pressed={on}
                          onClick={() => changeKategori(k.kategori)}
                        >
                          <span aria-hidden="true" className="material-symbols-rounded ex-bar-icon">{m.icon}</span>
                          <span className="ex-bar-name">{kategoriLabel(k.kategori)}</span>
                          <span className="ex-bar-track" aria-hidden="true">
                            <span style={{ width: `${Math.max(3, (k.total / maxCat) * 100)}%` }} />
                          </span>
                          <span className="ex-bar-amount">{rupiah(k.total)}</span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="ex-breakdown-empty">Rincian per jenis akan muncul setelah ada pengeluaran.</div>
                )}
              </div>
            </div>
          </section>

          <section className="ex-card ex-list" aria-label="Daftar pengeluaran">
            <div className="ex-list-head">
              <h2>Riwayat pengeluaran</h2>
              <div className="search-box">
                <span aria-hidden="true" className="material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Cari keterangan…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Cari keterangan pengeluaran"
                />
              </div>
            </div>

            {filtering && (
              <div className="ex-filters">
                {kategori && (
                  <button type="button" className="ex-filter" onClick={() => changeKategori(kategori)}>
                    Jenis: {kategoriLabel(kategori)}
                    <span aria-hidden="true" className="material-symbols-rounded">close</span>
                    <span className="sr-only">Hapus filter jenis</span>
                  </button>
                )}
                {search && (
                  <button type="button" className="ex-filter" onClick={() => setSearchInput('')}>
                    Kata: “{search}”
                    <span aria-hidden="true" className="material-symbols-rounded">close</span>
                    <span className="sr-only">Hapus pencarian</span>
                  </button>
                )}
                <span className="ex-filtered-total">
                  {meta.total} catatan · {rupiah(summary?.filteredTotal ?? 0)}
                </span>
              </div>
            )}

            {loading && records.length === 0 ? (
              <div className="empty-list">
                <div className="empty-title">Memuat pengeluaran…</div>
              </div>
            ) : records.length === 0 ? (
              <div className="empty-list">
                <div className="empty-icon-wrap">
                  <span aria-hidden="true" className="material-symbols-rounded">{filtering ? 'search_off' : 'receipt_long'}</span>
                </div>
                <div className="empty-title">
                  {filtering ? 'Tidak ada yang cocok' : `Belum ada pengeluaran di ${periodLabel}`}
                </div>
                <div className="empty-sub">
                  {filtering
                    ? 'Coba hapus filter atau ganti kata kunci.'
                    : 'Isi formulir di atas untuk mencatat pengeluaran pertama pada periode ini.'}
                </div>
              </div>
            ) : (
              <div className={`ex-days${loading ? ' is-loading' : ''}`} aria-busy={loading}>
                {groups.map((g) => (
                  <div className="ex-day" key={g.tanggal}>
                    <div className="ex-day-head">{dayHeading(g.tanggal)}</div>
                    {g.items.map((r) => {
                      const m = kategoriMeta(r.kategori);
                      const label = kategoriLabel(r.kategori);
                      return (
                        <div className={`ex-item${seed.record?.id === r.id ? ' editing' : ''}`} key={r.id}>
                          <span aria-hidden="true" className={`ex-item-icon tone-${m.tone}`}>
                            <span className="material-symbols-rounded">{m.icon}</span>
                          </span>
                          <div className="ex-item-main">
                            <div className="ex-item-title">{r.deskripsi}</div>
                            {r.deskripsi !== label && <div className="ex-item-sub">{label}</div>}
                          </div>
                          <div className="ex-item-amount">{rupiah(r.nominal)}</div>
                          <div className="op-actions">
                            <button
                              type="button"
                              className="action-btn"
                              aria-label="Salin sebagai pengeluaran baru"
                              onClick={() => setSeed({ key: seed.key + 1, copyOf: r })}
                            >
                              <span aria-hidden="true" className="material-symbols-rounded">content_copy</span>
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              aria-label="Ubah"
                              onClick={() => setSeed({ key: seed.key + 1, record: r })}
                            >
                              <span aria-hidden="true" className="material-symbols-rounded">edit</span>
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              aria-label="Hapus"
                              onClick={() => setConfirmDelete(r)}
                            >
                              <span aria-hidden="true" className="material-symbols-rounded">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <Pager meta={meta} onPage={changePage} loading={loading} noun="catatan" />
          </section>

          <ConfirmationModal
            isOpen={!!confirmDelete}
            title="Hapus pengeluaran ini?"
            message={`“${confirmDelete?.deskripsi ?? ''}” sebesar ${rupiah(confirmDelete?.nominal ?? 0)} akan dihapus dan tidak bisa dikembalikan.`}
            confirmLabel="Ya, Hapus"
            cancelLabel="Batal"
            isDangerous
            onConfirm={doDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
