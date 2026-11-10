'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import CustomSelect from '@/components/form/CustomSelect';
import PharmacyPanel from '@/components/form/PharmacyPanel';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api-client';
import { pharmacyApi, type PharmacyQueueItem, type PharmacyQueueResponse, type PharmacyStatus } from '@/lib/pharmacy';
import { prescriptionsApi, type PrescriptionItem } from '@/lib/prescriptions';
import { practitionersApi, type Practitioner } from '@/lib/practitioners';
import '../../styles/kunjungan.css';
import '../../styles/farmasi.css';

type StatusFilter = 'semua' | PharmacyStatus;
type Period = 'today' | '7d' | '30d' | 'custom';

const PAGE_SIZE = 20;

const STATUS_META: Record<PharmacyStatus, { label: string; tag: string }> = {
  pending: { label: 'Belum diserahkan', tag: 'waiting' },
  partial: { label: 'Sebagian', tag: 'progress' },
  done: { label: 'Selesai', tag: 'done' },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
  { key: 'custom', label: 'Pilih tanggal' },
];

/** Tanggal klinik (WIB), sama seperti backend */
function clinicToday(offsetDays = 0): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function periodRange(period: Period, custom: { from: string; to: string }) {
  if (period === 'today') return { from: clinicToday(), to: clinicToday() };
  if (period === '7d') return { from: clinicToday(6), to: clinicToday() };
  if (period === '30d') return { from: clinicToday(29), to: clinicToday() };
  return { from: custom.from || undefined, to: custom.to || undefined };
}

function initials(name?: string | null) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function fmtDate(value: string, withTime = false) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function drugSummary(names: string[]) {
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} lainnya`;
}

export default function FarmasiPage() {
  return (
    <Suspense fallback={null}>
      <FarmasiPageInner />
    </Suspense>
  );
}

function FarmasiPageInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isClinician = user?.role === 'dokter' || user?.role === 'perawat';

  // ── Filter ──
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [period, setPeriod] = useState<Period>('today');
  const [custom, setCustom] = useState({ from: clinicToday(6), to: clinicToday() });
  const [practitionerId, setPractitionerId] = useState('');
  const [patient, setPatient] = useState<{ id: number; name: string } | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);

  // ── Data ──
  const [rows, setRows] = useState<PharmacyQueueItem[]>([]);
  const [stats, setStats] = useState<PharmacyQueueResponse['stats']>({ total: 0, pending: 0, partial: 0, done: 0 });
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Detail ──
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const requestSeq = useRef(0);

  // Pencarian ditunda sebentar agar tidak memanggil API tiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (isClinician) return;
    practitionersApi
      .list()
      .then(setPractitioners)
      .catch(() => setPractitioners([]));
  }, [isClinician]);

  // Buka langsung dari tautan ?encounterId= (mis. dari rekam medis)
  useEffect(() => {
    const id = Number(searchParams.get('encounterId'));
    if (id) {
      setSelectedId(id);
      setStatus('semua');
    }
  }, [searchParams]);

  const query = useMemo(() => {
    const range = patient ? {} : periodRange(period, custom);
    return {
      search: search || undefined,
      status: status === 'semua' ? undefined : status,
      practitionerId: practitionerId ? Number(practitionerId) : undefined,
      patientId: patient?.id,
      limit: PAGE_SIZE,
      ...range,
    };
  }, [search, status, period, custom, practitionerId, patient]);

  const load = useCallback(
    async (page = 1) => {
      const seq = ++requestSeq.current;
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setLoadError(null);
      try {
        const res = await pharmacyApi.queue({ ...query, page });
        if (seq !== requestSeq.current) return;
        setRows((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
        setStats(res.stats);
        setMeta(res.meta);
        if (page === 1) {
          setSelectedId((prev) =>
            prev && (res.data.some((r) => r.encounterId === prev) || searchParams.get('encounterId'))
              ? prev
              : (res.data[0]?.encounterId ?? null),
          );
        }
      } catch (err) {
        if (seq === requestSeq.current) {
          setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat antrean farmasi');
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, searchParams],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const loadItems = useCallback(async (encounterId: number) => {
    setItemsLoading(true);
    try {
      setItems(await prescriptionsApi.list(encounterId));
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadItems(selectedId);
    else setItems([]);
  }, [selectedId, loadItems]);

  const selected = rows.find((r) => r.encounterId === selectedId) ?? null;

  /** Setelah serah/beri obat: muat ulang obat, perbarui progres baris & statistik */
  const handleChanged = async () => {
    if (!selectedId) return;
    const fresh = await prescriptionsApi.list(selectedId);
    setItems(fresh);
    const total = fresh.length;
    const dispensed = fresh.filter((i) => i.dispensedAt).length;
    const administered = fresh.filter((i) => i.administeredAt).length;
    const handled = fresh.filter((i) => i.dispensedAt || i.administeredAt).length;
    // Baris tetap tampil walau statusnya berubah, supaya pasien yang sedang
    // dilayani tidak "hilang" dari daftar sampai filter diganti
    setRows((prev) =>
      prev.map((r) =>
        r.encounterId === selectedId
          ? {
              ...r,
              itemCount: total,
              dispensedCount: dispensed,
              administeredCount: administered,
              handledCount: handled,
              pharmacyStatus: handled === 0 ? 'pending' : handled >= total ? 'done' : 'partial',
            }
          : r,
      ),
    );
    pharmacyApi
      .queue({ ...query, page: 1, limit: 1 })
      .then((res) => setStats(res.stats))
      .catch(() => undefined);
  };

  const selectRow = (id: number) => {
    setSelectedId(id);
    setShowDetailOnMobile(true);
  };

  const filterByPatient = (row: PharmacyQueueItem) => {
    setPatient({ id: row.patientId, name: row.patientName || `Pasien #${row.patientId}` });
    setStatus('semua');
    setSearchInput('');
  };

  const resetFilters = () => {
    setSearchInput('');
    setStatus('semua');
    setPeriod('today');
    setPractitionerId('');
    setPatient(null);
  };

  const hasExtraFilter = !!(search || practitionerId || patient || period !== 'today' || status !== 'pending');

  const statCards = [
    { key: 'semua', cls: 'total', icon: 'medication', value: stats.total, label: 'Total Resep' },
    { key: 'pending', cls: 'pending', icon: 'pending_actions', value: stats.pending, label: 'Belum Diserahkan' },
    { key: 'partial', cls: 'partial', icon: 'hourglass_top', value: stats.partial, label: 'Sebagian' },
    { key: 'done', cls: 'done', icon: 'task_alt', value: stats.done, label: 'Selesai' },
  ] as const;

  return (
    <DashboardLayout>
      <FeatureGuard feature="farmasi">
        <main className="content kunjungan-page farmasi-page">
          <div className="page-header">
            <div className="page-title-block">
              <div className="page-title">
                <h1>Farmasi</h1>
                <span className="badge-count">{stats.pending}</span>
              </div>
              <p className="page-subtitle">
                Serahkan obat ke pasien, catat pemberian obat di klinik, dan kaji resep dokter
              </p>
            </div>
          </div>

          <div className="stat-grid">
            {statCards.map((card) => (
              <button
                key={card.key}
                type="button"
                className={`stat-card ${card.cls} ${status === card.key ? 'active' : ''}`}
                aria-pressed={status === card.key}
                onClick={() => setStatus(card.key)}
              >
                <div className="stat-icon">
                  <span aria-hidden="true" className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {card.icon}
                  </span>
                </div>
                <div className="stat-info">
                  <div className="stat-value">{card.value}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              </button>
            ))}
          </div>

          <div className={`content-area ${showDetailOnMobile ? 'detail-open' : ''}`}>
            {/* Daftar resep */}
            <div className="panel">
              <div className="panel-toolbar">
                <div className="search-box">
                  <span aria-hidden="true" className="material-symbols-rounded">search</span>
                  <input
                    type="text"
                    aria-label="Cari resep"
                    placeholder="Cari pasien, No. RM, atau nama obat…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button type="button" className="search-clear" aria-label="Hapus pencarian" onClick={() => setSearchInput('')}>
                      <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        close
                      </span>
                    </button>
                  )}
                </div>

                {patient ? (
                  <div className="fm-patient-chip">
                    <span aria-hidden="true" className="material-symbols-rounded">person</span>
                    <span>
                      Riwayat obat <strong>{patient.name}</strong> · semua tanggal
                    </span>
                    <button type="button" aria-label="Hapus filter pasien" onClick={() => setPatient(null)}>
                      <span aria-hidden="true" className="material-symbols-rounded">close</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="filter-tabs" role="group" aria-label="Periode kunjungan">
                      {PERIODS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          className={`filter-tab ${period === p.key ? 'active' : ''}`}
                          aria-pressed={period === p.key}
                          onClick={() => setPeriod(p.key)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {period === 'custom' && (
                      <div className="fm-date-range">
                        <label>
                          Dari
                          <input
                            type="date"
                            value={custom.from}
                            max={custom.to || undefined}
                            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                          />
                        </label>
                        <label>
                          Sampai
                          <input
                            type="date"
                            value={custom.to}
                            min={custom.from || undefined}
                            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                          />
                        </label>
                      </div>
                    )}
                  </>
                )}

                {!isClinician && practitioners.length > 0 && (
                  <CustomSelect
                    value={practitionerId}
                    onChange={setPractitionerId}
                    options={[
                      { value: '', label: 'Semua dokter' },
                      ...practitioners.map((p) => ({ value: String(p.id), label: p.name })),
                    ]}
                    placeholder="Semua dokter"
                  />
                )}
              </div>

              <div className="panel-sort">
                <span className="sort-label">
                  {loading ? 'Memuat…' : `${meta.total} resep${status !== 'semua' ? ` · ${STATUS_META[status].label.toLowerCase()}` : ''}`}
                </span>
                {hasExtraFilter && (
                  <button type="button" className="fm-reset" onClick={resetFilters}>
                    Reset filter
                  </button>
                )}
              </div>

              {loadError ? (
                <div className="inline-error">{loadError}</div>
              ) : !loading && rows.length === 0 ? (
                <div className="detail-empty" style={{ padding: '32px 16px' }}>
                  <div className="empty-icon-wrap">
                    <span aria-hidden="true" className="material-symbols-rounded">
                      {stats.total === 0 ? 'medication' : 'search_off'}
                    </span>
                  </div>
                  <div className="empty-title">
                    {status === 'pending' && stats.total > 0 ? 'Semua obat sudah diserahkan' : 'Tidak ada resep'}
                  </div>
                  <div className="empty-sub">
                    {stats.total === 0
                      ? 'Resep yang ditulis dokter di rekam medis akan muncul di sini.'
                      : 'Ubah filter untuk melihat resep lainnya.'}
                  </div>
                  {hasExtraFilter && (
                    <button type="button" className="btn-outline" style={{ marginTop: 12 }} onClick={resetFilters}>
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="visit-list">
                  {rows.map((row) => {
                    const st = STATUS_META[row.pharmacyStatus];
                    return (
                      <div
                        key={row.encounterId}
                        className={`visit-row-item ${row.encounterId === selectedId ? 'selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectRow(row.encounterId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectRow(row.encounterId);
                          }
                        }}
                      >
                        <div className="visit-avatar">{initials(row.patientName)}</div>
                        <div className="visit-row-info">
                          <div className="visit-row-top">
                            <div className="visit-row-name">{row.patientName || `Pasien #${row.patientId}`}</div>
                            <span className={`tag ${st.tag}`}>{st.label}</span>
                          </div>
                          <div className="visit-row-sub">
                            {row.noRM || '—'} · {fmtDate(row.arrivedTime)}
                            {row.practitionerName ? ` · ${row.practitionerName}` : ''}
                          </div>
                          <div className="fm-row-drugs">{drugSummary(row.drugNames)}</div>
                          <div className="fm-progress" aria-label={`${row.handledCount} dari ${row.itemCount} obat`}>
                            <span style={{ width: `${(row.handledCount / Math.max(row.itemCount, 1)) * 100}%` }} />
                          </div>
                        </div>
                        <span aria-hidden="true" className="material-symbols-rounded chevron-icon">chevron_right</span>
                      </div>
                    );
                  })}
                  {meta.page < meta.totalPages && (
                    <button
                      type="button"
                      className="btn-outline fm-more"
                      disabled={loadingMore}
                      onClick={() => load(meta.page + 1)}
                    >
                      {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detail resep */}
            <div className={`detail-panel ${showDetailOnMobile ? 'show' : ''}`}>
              {!selectedId ? (
                <div className="detail-empty">
                  <div className="empty-icon-wrap">
                    <span aria-hidden="true" className="material-symbols-rounded">medication</span>
                  </div>
                  <div className="empty-title">Belum ada resep dipilih</div>
                  <div className="empty-sub">Pilih resep dari daftar untuk menyerahkan atau memberikan obat</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
                  <button type="button" className="detail-back" onClick={() => setShowDetailOnMobile(false)}>
                    <span aria-hidden="true" className="material-symbols-rounded">arrow_back</span>
                    Kembali ke daftar
                  </button>
                  {selected && (
                    <>
                      <div className="detail-header">
                        <div className="detail-avatar">{initials(selected.patientName)}</div>
                        <div className="detail-name-block">
                          <div className="detail-name">{selected.patientName || `Pasien #${selected.patientId}`}</div>
                          <div className="detail-rm">{selected.noRM || '—'}</div>
                          <div className="detail-tags">
                            <span className={`tag ${STATUS_META[selected.pharmacyStatus].tag}`}>
                              {STATUS_META[selected.pharmacyStatus].label}
                            </span>
                            {selected.reviewedAt && <span className="tag primary">Resep dikaji</span>}
                          </div>
                        </div>
                        {patient?.id !== selected.patientId && (
                          <button type="button" className="btn-outline" onClick={() => filterByPatient(selected)}>
                            <span aria-hidden="true" className="material-symbols-rounded">history</span>
                            Riwayat obat
                          </button>
                        )}
                      </div>

                      <div className="detail-info-grid">
                        <div className="info-cell">
                          <div className="info-label">Tanggal Kunjungan</div>
                          <div className="info-value">{fmtDate(selected.arrivedTime, true)}</div>
                        </div>
                        <div className="info-cell">
                          <div className="info-label">Dokter</div>
                          <div className="info-value">{selected.practitionerName || '—'}</div>
                        </div>
                        <div className="info-cell">
                          <div className="info-label">Diserahkan</div>
                          <div className="info-value">
                            {selected.dispensedCount} dari {selected.itemCount} obat
                          </div>
                        </div>
                        <div className="info-cell">
                          <div className="info-label">Diberikan di Klinik</div>
                          <div className="info-value">
                            {selected.administeredCount} dari {selected.itemCount} obat
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="detail-section">
                    {itemsLoading && items.length === 0 ? (
                      <div className="empty-sub">Memuat resep…</div>
                    ) : items.length === 0 ? (
                      <div className="empty-sub">Kunjungan ini belum punya resep.</div>
                    ) : (
                      <PharmacyPanel key={selectedId} encounterId={selectedId} items={items} onChanged={handleChanged} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
