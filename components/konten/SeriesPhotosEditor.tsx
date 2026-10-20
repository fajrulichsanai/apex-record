'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiFolder, FiEyeOff, FiX } from 'react-icons/fi';
import ClinicalPhotoPickerModal from '@/components/konten/ClinicalPhotoPickerModal';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { seriesPhotosApi, type ContentPhotoSource, type PickerPhoto, type SeriesPhoto } from '@/lib/contents';
import { useToast } from '@/lib/toast-context';

interface Loaded {
  photo: SeriesPhoto;
  img: HTMLImageElement | null;
  url: string | null;
}

interface SeriesPhotosEditorProps {
  contentId: number | null;
  /** Saves the record if it isn't yet, returning its id (or null if it couldn't). */
  onNeedSave: () => Promise<number | null>;
  onPhotosChanged: (photos: { img: HTMLImageElement; caption: string; blurFace: boolean }[]) => void;
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
    img.src = src;
  });

/**
 * Case series (layout "series"): 3+ foto dari folder pasien/Pemeriksaan
 * Penunjang, diurutkan bebas (drag), tiap foto bisa diberi caption singkat
 * dan ditandai blur (lihat lib/series-canvas.ts — blur seluruh foto, bukan
 * deteksi wajah).
 */
export default function SeriesPhotosEditor({ contentId, onNeedSave, onPhotosChanged }: SeriesPhotosEditorProps) {
  const { error } = useToast();
  const [items, setItems] = useState<Loaded[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const photos = await seriesPhotosApi.list(id);
        const loaded = await Promise.all(
          photos.map(async (photo) => {
            try {
              const url = await fetchProtectedFileUrl(seriesPhotosApi.fileUrl(id, photo.id));
              const img = await loadImage(url);
              return { photo, img, url };
            } catch {
              return { photo, img: null, url: null };
            }
          }),
        );
        setItems(loaded);
      } catch (err) {
        error(err instanceof ApiError ? err.message : 'Gagal memuat foto series');
      } finally {
        setLoading(false);
      }
    },
    [error],
  );

  useEffect(() => {
    if (contentId) load(contentId);
    else setItems([]);
  }, [contentId, load]);

  useEffect(() => {
    onPhotosChanged(
      items.filter((i): i is Loaded & { img: HTMLImageElement } => !!i.img).map((i) => ({
        img: i.img,
        caption: i.photo.caption || '',
        blurFace: i.photo.blurFace,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openPicker = async () => {
    let id = contentId;
    if (!id) {
      id = await onNeedSave();
      if (!id) return;
    }
    setPickerOpen(true);
  };

  const handlePick = async (photo: PickerPhoto, sourceType: ContentPhotoSource) => {
    setPickerOpen(false);
    const id = contentId ?? (await onNeedSave());
    if (!id) return;
    setBusy(true);
    try {
      await seriesPhotosApi.add(id, sourceType, photo.id);
      await load(id);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menambah foto');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (photoId: number) => {
    if (!contentId) return;
    setBusy(true);
    try {
      await seriesPhotosApi.remove(contentId, photoId);
      await load(contentId);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menghapus foto');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlur = async (photoId: number, blurFace: boolean) => {
    if (!contentId) return;
    setItems((prev) => prev.map((i) => (i.photo.id === photoId ? { ...i, photo: { ...i.photo, blurFace } } : i)));
    try {
      await seriesPhotosApi.update(contentId, photoId, { blurFace });
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengubah blur');
    }
  };

  const handleCaptionBlur = async (photoId: number, caption: string) => {
    if (!contentId) return;
    try {
      await seriesPhotosApi.update(contentId, photoId, { caption });
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menyimpan caption');
    }
  };

  const handleDrop = async (targetIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex || !contentId) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    try {
      await seriesPhotosApi.reorder(contentId, next.map((i) => i.photo.id));
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengurutkan foto');
      if (contentId) load(contentId);
    }
  };

  return (
    <div className="kt-series">
      {loading && <p className="kt-hint">Memuat foto…</p>}
      {items.length < 3 && items.length > 0 && (
        <p className="kt-hint">Case series idealnya 3 foto atau lebih (minimal 2 untuk dipublikasikan).</p>
      )}
      <div className="kt-series-grid">
        {items.map((item, index) => (
          <div
            key={item.photo.id}
            className="kt-series-item"
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
          >
            <div className="kt-series-thumb">
              {item.url && (
                // eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload
                <img src={item.url} alt={item.photo.caption || 'Foto'} style={item.photo.blurFace ? { filter: 'blur(6px)' } : undefined} />
              )}
              <button
                type="button"
                className={`kt-series-blur${item.photo.blurFace ? ' on' : ''}`}
                onClick={() => handleToggleBlur(item.photo.id, !item.photo.blurFace)}
                aria-pressed={item.photo.blurFace}
                title="Blur foto ini (identitas pasien tidak tampil)"
              >
                <FiEyeOff aria-hidden="true" />
              </button>
              <button type="button" className="kt-series-remove" onClick={() => handleRemove(item.photo.id)} title="Hapus foto" disabled={busy}>
                <FiX aria-hidden="true" />
              </button>
            </div>
            <input
              className="kt-series-caption"
              defaultValue={item.photo.caption || ''}
              placeholder="Caption (opsional)"
              maxLength={160}
              onBlur={(e) => handleCaptionBlur(item.photo.id, e.target.value)}
            />
          </div>
        ))}
        <button type="button" className="kt-series-add" onClick={openPicker} disabled={busy}>
          <FiFolder aria-hidden="true" />
          Tambah dari Rekam Medis
        </button>
      </div>
      <p className="kt-hint">Seret kartu foto untuk mengubah urutan.</p>

      {pickerOpen && <ClinicalPhotoPickerModal onClose={() => setPickerOpen(false)} onPick={handlePick} />}
    </div>
  );
}
