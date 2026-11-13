'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiChevronRight, FiX } from 'react-icons/fi';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { contentsApi, type LibraryPatient, type LibraryPhoto } from '@/lib/contents';

interface PhotoLibraryPanelProps {
  /** Foto rekam medis yang sudah dipakai di konten ini, kunci "jenis:id". */
  usedKeys: Set<string>;
  busy: boolean;
  /** Ketuk foto: tambahkan bila belum dipakai, lepas bila sudah. */
  onToggle: (photo: LibraryPhoto, used: boolean) => void;
  onClose: () => void;
}

export const libraryKey = (p: Pick<LibraryPhoto, 'sourceType' | 'id'>) => `${p.sourceType}:${p.id}`;

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

/** Unduh thumbnail paling banyak 4 sekaligus: foto asli besar, 18 unduhan bersamaan membuat ponsel macet. */
const MAX_PARALLEL = 4;
let running = 0;
const waiting: Array<() => void> = [];
function limited<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      running += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          waiting.shift()?.();
        });
    };
    if (running < MAX_PARALLEL) run();
    else waiting.push(run);
  });
}

/** Thumbnail yang baru diunduh saat terlihat; gagal muat tampil sebagai kotak kosong yang jelas. */
function LazyThumb({ photo }: { photo: LibraryPhoto }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let url: string | null = null;
    let cancelled = false;
    const load = () => {
      limited(() => fetchProtectedFileUrl(photo.fileUrl))
        .then((u) => {
          if (cancelled) URL.revokeObjectURL(u);
          else {
            url = u;
            setSrc(u);
          }
        })
        .catch(() => !cancelled && setFailed(true));
    };
    if (typeof IntersectionObserver === 'undefined') {
      load();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        load();
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.fileUrl]);
  return (
    <span ref={ref} className={`kt-lib-img${failed ? ' failed' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
      {src ? <img src={src} alt={photo.label} /> : failed ? <b aria-hidden="true">!</b> : null}
    </span>
  );
}

/**
 * Pustaka foto rekam medis untuk Konten, dua langkah: (1) pilih pasien
 * (cari nama / no. RM), (2) lihat fotonya per tanggal lalu ketuk untuk
 * menambah atau melepas. Dibuka di kolom kanan (menggantikan preview) di
 * layar lebar, dan layar penuh di ponsel.
 */
export default function PhotoLibraryPanel({ usedKeys, busy, onToggle, onClose }: PhotoLibraryPanelProps) {
  const [patient, setPatient] = useState<LibraryPatient | null>(null);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<LibraryPatient[] | null>(null);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Langkah 1: daftar pasien (dicari di server, jeda 300 ms saat mengetik).
  useEffect(() => {
    if (patient) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setError(null);
      contentsApi
        .photoPatients(query.trim() || undefined)
        .then((list) => !cancelled && setPatients(list))
        .catch((err) => {
          if (cancelled) return;
          setPatients([]);
          setError(err instanceof ApiError ? err.message : 'Gagal memuat daftar pasien');
        });
    }, query ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [patient, query, attempt]);

  // Langkah 2: foto satu pasien.
  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    contentsApi
      .patientPhotos(patient.id)
      .then((list) => !cancelled && setPhotos(list))
      .catch((err) => {
        if (cancelled) return;
        setPhotos([]);
        setError(err instanceof ApiError ? err.message : 'Gagal memuat foto pasien');
      });
    return () => {
      cancelled = true;
    };
  }, [patient, attempt]);

  const pick = (p: LibraryPatient) => {
    setPhotos(null);
    setError(null);
    setPatient(p);
  };
  const back = () => {
    setPatient(null);
    setPhotos(null);
    setError(null);
  };

  const days = useMemo(() => {
    const map = new Map<string, { label: string; photos: LibraryPhoto[] }>();
    for (const p of photos ?? []) {
      const key = dayKey(p.takenAt);
      if (!map.has(key)) map.set(key, { label: dayLabel(p.takenAt), photos: [] });
      map.get(key)!.photos.push(p);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [photos]);

  const usedHere = (photos ?? []).filter((p) => usedKeys.has(libraryKey(p))).length;

  return (
    <aside className="kt-libpanel" aria-label="Foto dari rekam medis">
      <div className="kt-libpanel-head">
        {patient ? (
          <button type="button" className="kt-lib-back" onClick={back} aria-label="Kembali ke daftar pasien">
            <FiArrowLeft aria-hidden="true" />
          </button>
        ) : null}
        <div className="kt-libpanel-title">
          <h2>{patient ? patient.name : 'Foto rekam medis'}</h2>
          {patient && <small>{patient.noRm}</small>}
        </div>
        <button type="button" className="kt-btn" onClick={onClose}>
          <FiX aria-hidden="true" /> Selesai
        </button>
      </div>

      {error && (
        <div className="kt-lib-error" role="alert">
          <span>{error}</span>
          <button type="button" className="kt-link" onClick={retry}>
            Coba lagi
          </button>
        </div>
      )}

      {!patient ? (
        <>
          <input
            className="kt-lib-search"
            type="search"
            placeholder="Cari nama pasien atau no. RM…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari pasien"
          />
          <div className="kt-lib-body">
            {patients === null ? (
              <p className="kt-hint">Memuat pasien…</p>
            ) : patients.length === 0 && !error ? (
              <p className="kt-hint">
                {query
                  ? 'Tidak ada pasien yang cocok.'
                  : 'Belum ada pasien dengan foto yang bisa dipakai. Aktifkan izin konten pasien di rekam medis (tab Galeri Foto Klinis), atau unggah foto langsung dari perangkat.'}
              </p>
            ) : (
              <ul className="kt-lib-patients">
                {patients.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick(p)}>
                      <span className="kt-lib-avatar" aria-hidden="true">
                        {p.name.trim().charAt(0).toUpperCase() || '?'}
                      </span>
                      <span className="kt-lib-pinfo">
                        <strong>{p.name}</strong>
                        <small>
                          {p.noRm ? `${p.noRm} · ` : ''}
                          {p.photoCount} foto · terakhir {shortDate(p.lastAt)}
                        </small>
                      </span>
                      <FiChevronRight aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="kt-hint">
            {usedHere > 0 ? `${usedHere} foto dipakai. ` : ''}Ketuk foto untuk menambah, ketuk lagi untuk melepas.
          </p>
          <div className="kt-lib-body">
            {photos === null ? (
              <p className="kt-hint">Memuat foto…</p>
            ) : days.length === 0 && !error ? (
              <p className="kt-hint">Pasien ini belum punya foto yang bisa dipakai di Konten.</p>
            ) : (
              days.map(([key, day]) => (
                <section key={key} className="kt-lib-day">
                  <h3>
                    {day.label} <small>{day.photos.length} foto</small>
                  </h3>
                  <div className="kt-lib-grid">
                    {day.photos.map((photo) => {
                      const used = usedKeys.has(libraryKey(photo));
                      return (
                        <button
                          key={libraryKey(photo)}
                          type="button"
                          className={`kt-lib-thumb${used ? ' on' : ''}`}
                          onClick={() => onToggle(photo, used)}
                          disabled={busy}
                          aria-pressed={used}
                          title={photo.label}
                        >
                          <LazyThumb photo={photo} />
                          {used && (
                            <i className="kt-lib-check" aria-hidden="true">
                              <FiCheck />
                            </i>
                          )}
                          <span>{photo.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}
