'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { contentsApi, type LibraryPhoto } from '@/lib/contents';
import { useToast } from '@/lib/toast-context';

interface PhotoLibraryPanelProps {
  /** id foto rekam medis yang sudah dipakai di konten ini. */
  usedIds: Set<number>;
  busy: boolean;
  /** Ketuk foto: tambahkan bila belum dipakai, lepas bila sudah. */
  onToggle: (photo: LibraryPhoto, used: boolean) => void;
  onClose: () => void;
}

/** Thumbnail yang baru diunduh saat terlihat — pustaka bisa berisi ratusan foto. */
function LazyThumb({ photo, label }: { photo: LibraryPhoto; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let url: string | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        fetchProtectedFileUrl(photo.fileUrl)
          .then((u) => {
            if (cancelled) URL.revokeObjectURL(u);
            else {
              url = u;
              setSrc(u);
            }
          })
          .catch(() => {});
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.fileUrl]);
  return (
    <span ref={ref} className="kt-lib-img">
      {/* eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload */}
      {src ? <img src={src} alt={label} /> : null}
    </span>
  );
}

/**
 * Pustaka foto rekam medis, tampil di kolom kanan menggantikan preview story
 * selama dibuka. Ketuk foto untuk menambah (ketuk lagi untuk melepas); foto
 * semua pasien yang izin kontennya aktif langsung tampil, per pasien.
 */
export default function PhotoLibraryPanel({ usedIds, busy, onToggle, onClose }: PhotoLibraryPanelProps) {
  const { error } = useToast();
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    contentsApi
      .photoLibrary()
      .then(setPhotos)
      .catch((err) => {
        setPhotos([]);
        error(err instanceof ApiError ? err.message : 'Gagal memuat foto rekam medis');
      });
  }, [error]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<number, { name: string; noRm: string; photos: LibraryPhoto[] }>();
    for (const p of photos ?? []) {
      if (q && !`${p.patientName} ${p.patientNoRm}`.toLowerCase().includes(q)) continue;
      if (!map.has(p.patientId)) map.set(p.patientId, { name: p.patientName, noRm: p.patientNoRm, photos: [] });
      map.get(p.patientId)!.photos.push(p);
    }
    return [...map.entries()];
  }, [photos, query]);

  return (
    <aside className="kt-libpanel" aria-label="Foto dari rekam medis">
      <div className="kt-libpanel-head">
        <h2>Foto rekam medis</h2>
        <button type="button" className="kt-btn" onClick={onClose}>
          <FiX aria-hidden="true" /> Selesai
        </button>
      </div>
      <input
        className="kt-lib-search"
        type="search"
        placeholder="Cari nama pasien atau no. RM…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Cari pasien"
      />
      <p className="kt-hint">
        {usedIds.size > 0 ? `${usedIds.size} foto dipakai. ` : ''}Ketuk foto untuk menambah, ketuk lagi untuk melepas.
      </p>
      <div className="kt-lib-body">
        {photos === null ? (
          <p className="kt-hint">Memuat foto…</p>
        ) : photos.length === 0 ? (
          <p className="kt-hint">
            Belum ada foto yang bisa dipakai. Foto pasien muncul di sini setelah izin konten pasien diaktifkan di rekam medis
            (tab Galeri Foto Klinis). Kamu juga bisa langsung unggah dari perangkat.
          </p>
        ) : groups.length === 0 ? (
          <p className="kt-hint">Tidak ada pasien yang cocok.</p>
        ) : (
          groups.map(([patientId, g]) => (
            <section key={patientId} className="kt-picker-folder">
              <h3>
                {g.name} <small>{g.noRm}</small>
              </h3>
              <div className="kt-lib-grid">
                {g.photos.map((photo) => {
                  const used = usedIds.has(photo.id);
                  const label = photo.template?.name || 'Foto';
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      className={`kt-lib-thumb${used ? ' on' : ''}`}
                      onClick={() => onToggle(photo, used)}
                      disabled={busy}
                      aria-pressed={used}
                      title={label}
                    >
                      <LazyThumb photo={photo} label={label} />
                      {used && (
                        <i className="kt-lib-check" aria-hidden="true">
                          <FiCheck />
                        </i>
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
