'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { seriesPhotosApi, type ContentPhotoFrame, type ContentPhotoSource, type SeriesPhoto } from '@/lib/contents';
import type { SeriesPhotoDraw } from '@/lib/series-canvas';
import { DEFAULT_FRAME } from '@/lib/story-canvas';
import { useToast } from '@/lib/toast-context';

export interface SeriesItem {
  photo: SeriesPhoto;
  img: HTMLImageElement | null;
  url: string | null;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
    img.src = src;
  });

async function hydrate(contentId: number, photo: SeriesPhoto): Promise<SeriesItem> {
  try {
    const url = await fetchProtectedFileUrl(seriesPhotosApi.fileUrl(contentId, photo.id));
    return { photo, img: await loadImage(url), url };
  } catch {
    return { photo, img: null, url: null };
  }
}

/** Satu foto di perpustakaan rekam medis yang dipilih untuk ditambahkan. */
export interface LibraryPick {
  sourceType: ContentPhotoSource;
  sourceId: number;
}

/**
 * Semua state foto layout "series": daftar, pilihan aktif, dan aksi
 * (tambah dari perangkat / rekam medis, atur frame, putar, tukar, hapus).
 * Perubahan tampil langsung; penyimpanan ke server di belakang layar.
 */
export function useSeriesPhotos(
  contentId: number | null,
  onNeedSave: () => Promise<number | null>,
  onChange: () => void,
) {
  const { error } = useToast();
  const [items, setItems] = useState<SeriesItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef<SeriesItem[]>([]);
  const loadedFor = useRef<number | null>(null);
  const frameTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const commit = useCallback((next: SeriesItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const fail = useCallback(
    (err: unknown, fallback: string) => error(err instanceof ApiError ? err.message : fallback),
    [error],
  );

  const load = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const photos = await seriesPhotosApi.list(id);
        commit(await Promise.all(photos.map((p) => hydrate(id, p))));
      } catch (err) {
        fail(err, 'Gagal memuat foto series');
      } finally {
        setLoading(false);
      }
    },
    [commit, fail],
  );

  useEffect(() => {
    if (contentId && loadedFor.current !== contentId) {
      loadedFor.current = contentId;
      load(contentId);
    } else if (!contentId) {
      loadedFor.current = null;
      commit([]);
      setSelected(null);
    }
  }, [contentId, load, commit]);

  useEffect(() => {
    const timers = frameTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      itemsRef.current.forEach((i) => i.url && URL.revokeObjectURL(i.url));
    };
  }, []);

  const ensureId = useCallback(async () => {
    if (contentId) return contentId;
    let id: number | null = null;
    try {
      id = await onNeedSave();
    } catch (err) {
      // Gagal menyimpan draf harus terlihat, bukan membuat foto diam-diam tak masuk.
      error(err instanceof Error && err.message ? err.message : 'Gagal menyimpan draf konten');
      return null;
    }
    // Record baru tidak punya foto di server; jangan muat ulang (menggandakan foto yang sedang ditambah).
    if (id) loadedFor.current = id;
    return id;
  }, [contentId, onNeedSave, error]);

  const append = useCallback(
    async (id: number, photos: SeriesPhoto[]) => {
      const loaded = await Promise.all(photos.map((p) => hydrate(id, p)));
      const next = [...itemsRef.current, ...loaded];
      commit(next);
      setSelected(next.length - loaded.length);
      onChangeRef.current();
    },
    [commit],
  );

  /** Foto dari perangkat (galeri / kamera / seret-lepas), satu atau banyak sekaligus. */
  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name));
      if (images.length === 0) {
        if (files.length) error('Pilih file gambar (JPG, PNG, atau WEBP)');
        return;
      }
      const id = await ensureId();
      if (!id) return;
      setBusy(true);
      try {
        const added: SeriesPhoto[] = [];
        for (const file of images) {
          try {
            added.push(await seriesPhotosApi.upload(id, file));
          } catch (err) {
            fail(err, `Gagal mengunggah ${file.name}`);
          }
        }
        if (added.length) await append(id, added);
      } finally {
        setBusy(false);
      }
    },
    [ensureId, append, error, fail],
  );

  /** Banyak foto rekam medis sekaligus (dipilih di pustaka). */
  const addFromLibrary = useCallback(
    async (picks: LibraryPick[]) => {
      if (picks.length === 0) return;
      const id = await ensureId();
      if (!id) return;
      setBusy(true);
      try {
        const added: SeriesPhoto[] = [];
        for (const pick of picks) {
          try {
            added.push(await seriesPhotosApi.add(id, pick.sourceType, pick.sourceId));
          } catch (err) {
            fail(err, 'Gagal menambah foto');
          }
        }
        if (added.length) await append(id, added);
      } finally {
        setBusy(false);
      }
    },
    [ensureId, append, fail],
  );

  const patchItem = (photoId: number, patch: Partial<SeriesPhoto>) =>
    commit(itemsRef.current.map((i) => (i.photo.id === photoId ? { ...i, photo: { ...i.photo, ...patch } } : i)));

  /** Frame baru tampil seketika; simpan ke server setelah jeda singkat. */
  const setFrame = useCallback(
    (index: number, frame: ContentPhotoFrame) => {
      const item = itemsRef.current[index];
      if (!item || !contentId) return;
      const photoId = item.photo.id;
      patchItem(photoId, { frame });
      onChangeRef.current();
      const timers = frameTimers.current;
      clearTimeout(timers.get(photoId));
      timers.set(
        photoId,
        setTimeout(() => {
          timers.delete(photoId);
          seriesPhotosApi.update(contentId, photoId, { frame }).catch((err) => fail(err, 'Gagal menyimpan posisi foto'));
        }, 500),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentId, fail],
  );

  const frameOf = (index: number): ContentPhotoFrame => itemsRef.current[index]?.photo.frame ?? DEFAULT_FRAME;

  const toggleBlur = async (index: number) => {
    const item = itemsRef.current[index];
    if (!item || !contentId) return;
    const blurFace = !item.photo.blurFace;
    patchItem(item.photo.id, { blurFace });
    onChangeRef.current();
    try {
      await seriesPhotosApi.update(contentId, item.photo.id, { blurFace });
    } catch (err) {
      fail(err, 'Gagal mengubah blur');
    }
  };

  const setCaptionLocal = (index: number, caption: string) => {
    const item = itemsRef.current[index];
    if (!item) return;
    patchItem(item.photo.id, { caption });
    onChangeRef.current();
  };

  const saveCaption = async (index: number) => {
    const item = itemsRef.current[index];
    if (!item || !contentId) return;
    try {
      await seriesPhotosApi.update(contentId, item.photo.id, { caption: item.photo.caption ?? '' });
    } catch (err) {
      fail(err, 'Gagal menyimpan caption');
    }
  };

  const remove = async (index: number) => {
    const item = itemsRef.current[index];
    if (!item || !contentId) return;
    setBusy(true);
    try {
      await seriesPhotosApi.remove(contentId, item.photo.id);
      if (item.url) URL.revokeObjectURL(item.url);
      const next = itemsRef.current.filter((_, i) => i !== index);
      commit(next);
      setSelected(next.length === 0 ? null : Math.min(index, next.length - 1));
      onChangeRef.current();
    } catch (err) {
      fail(err, 'Gagal menghapus foto');
    } finally {
      setBusy(false);
    }
  };

  /** Pindahkan foto `from` ke posisi `to` (geser ke depan/belakang atau seret). */
  const move = async (from: number, to: number) => {
    const list = itemsRef.current;
    if (!contentId || from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
    setSelected(to);
    onChangeRef.current();
    try {
      await seriesPhotosApi.reorder(contentId, next.map((i) => i.photo.id));
    } catch (err) {
      fail(err, 'Gagal mengurutkan foto');
      load(contentId);
    }
  };

  /** Tukar tempat dua foto. */
  const swap = async (a: number, b: number) => {
    const list = itemsRef.current;
    if (!contentId || a === b || !list[a] || !list[b]) return;
    const next = [...list];
    [next[a], next[b]] = [next[b], next[a]];
    commit(next);
    setSelected(b);
    onChangeRef.current();
    try {
      await seriesPhotosApi.reorder(contentId, next.map((i) => i.photo.id));
    } catch (err) {
      fail(err, 'Gagal menukar foto');
      load(contentId);
    }
  };

  const draws: SeriesPhotoDraw[] = useMemo(
    () =>
      items
        .filter((i): i is SeriesItem & { img: HTMLImageElement } => !!i.img)
        .map((i) => ({ img: i.img, caption: i.photo.caption || '', blurFace: i.photo.blurFace, frame: i.photo.frame })),
    [items],
  );

  // Indeks pada `draws` bisa bergeser bila ada foto gagal dimuat; peta ke item.
  const drawIndexOf = useMemo(() => {
    const map: number[] = [];
    items.forEach((i, idx) => {
      if (i.img) map.push(idx);
    });
    return map;
  }, [items]);

  return {
    items,
    draws,
    drawIndexOf,
    selected,
    select: setSelected,
    loading,
    busy,
    addFiles,
    addFromLibrary,
    setFrame,
    frameOf,
    toggleBlur,
    setCaptionLocal,
    saveCaption,
    remove,
    move,
    swap,
  };
}

export type SeriesPhotosController = ReturnType<typeof useSeriesPhotos>;
