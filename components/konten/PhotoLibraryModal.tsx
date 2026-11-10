'use client';

import { FiX } from 'react-icons/fi';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { contentsApi, type LibraryPhoto } from '@/lib/contents';
import { useEscapeKey } from '@/lib/a11y';
import { useToast } from '@/lib/toast-context';

interface PhotoLibraryModalProps {
  onClose: () => void;
  /** Dipanggil sekali dengan semua foto yang dicentang. */
  onAdd: (photos: LibraryPhoto[]) => void;
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
 * Pustaka foto untuk Konten: foto klinis semua pasien yang izin kontennya
 * sudah diaktifkan di rekam medis, langsung tampil — tanpa memilih pasien
 * dulu, tanpa persetujuan lagi di sini. Centang banyak foto lalu tambahkan
 * sekaligus.
 */
export default function PhotoLibraryModal({ onClose, onAdd }: PhotoLibraryModalProps) {
  const { error } = useToast();
  useEscapeKey(onClose, true);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<number[]>([]);

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

  const toggle = (id: number) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleGroup = (list: LibraryPhoto[]) => {
    const ids = list.map((p) => p.id);
    setPicked((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };
  const submit = () => {
    const byId = new Map((photos ?? []).map((p) => [p.id, p]));
    onAdd(picked.map((id) => byId.get(id)).filter((p): p is LibraryPhoto => !!p));
  };

  return (
    <div className="kt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Foto dari rekam medis">
      <div className="kt-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="kt-modal-head">
          <h2>Foto dari rekam medis</h2>
          <button aria-label="Tutup" type="button" className="kt-modal-close" onClick={onClose}>
            <FiX aria-hidden="true" />
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

        <div className="kt-lib-body">
          {photos === null ? (
            <p className="kt-hint">Memuat foto…</p>
          ) : photos.length === 0 ? (
            <p className="kt-hint">
              Belum ada foto yang bisa dipakai. Foto pasien muncul di sini setelah izin konten pasien diaktifkan di rekam
              medis (tab Galeri Foto Klinis). Kamu juga bisa langsung unggah dari perangkat.
            </p>
          ) : groups.length === 0 ? (
            <p className="kt-hint">Tidak ada pasien yang cocok.</p>
          ) : (
            groups.map(([patientId, g]) => (
              <div key={patientId} className="kt-picker-folder">
                <div className="kt-lib-head">
                  <h3>
                    {g.name} <small>{g.noRm}</small>
                  </h3>
                  <button type="button" className="kt-link" onClick={() => toggleGroup(g.photos)}>
                    {g.photos.every((p) => picked.includes(p.id)) ? 'Batal semua' : 'Pilih semua'}
                  </button>
                </div>
                <div className="kt-picker-grid">
                  {g.photos.map((photo) => {
                    const on = picked.includes(photo.id);
                    const label = photo.template?.name || 'Foto';
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        className={`kt-picker-thumb kt-lib-thumb${on ? ' on' : ''}`}
                        onClick={() => toggle(photo.id)}
                        aria-pressed={on}
                        title={label}
                      >
                        <LazyThumb photo={photo} label={label} />
                        {on && <i className="kt-lib-check" aria-hidden="true">✓</i>}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="kt-lib-foot">
          <span className="kt-hint">{picked.length ? `${picked.length} foto dipilih` : 'Ketuk foto untuk memilih'}</span>
          <button type="button" className="kt-btn primary" disabled={picked.length === 0} onClick={submit}>
            Tambahkan {picked.length > 0 ? `${picked.length} foto` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
