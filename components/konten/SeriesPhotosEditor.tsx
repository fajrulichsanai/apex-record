'use client';

import { useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiEyeOff, FiFolder, FiRefreshCcw, FiRepeat, FiRotateCcw, FiRotateCw, FiShuffle, FiTrash2, FiUpload } from 'react-icons/fi';
import PhotoLibraryModal from '@/components/konten/PhotoLibraryModal';
import type { LibraryPhoto } from '@/lib/contents';
import { DEFAULT_FRAME, MAX_ZOOM, MIN_ZOOM, normalizeAngle } from '@/lib/story-canvas';
import type { SeriesPhotosController } from '@/lib/use-series-photos';

interface SeriesPhotosEditorProps {
  ctl: SeriesPhotosController;
  /** Mengatur ulang posisi sebuah foto agar tetap di dalam selnya (clamp). */
  onFrame: (index: number, patch: Partial<typeof DEFAULT_FRAME>) => void;
  swapMode: boolean;
  onSwapMode: (on: boolean) => void;
}

/**
 * Case series: tambah foto dari perangkat atau rekam medis (banyak sekaligus),
 * lalu atur tiap foto — geser/zoom langsung di preview, atau pakai tombol di
 * bawah: putar, cermin, zoom, geser urutan, tukar, blur, hapus.
 */
export default function SeriesPhotosEditor({ ctl, onFrame, swapMode, onSwapMode }: SeriesPhotosEditorProps) {
  const { items, selected, select, busy, loading } = ctl;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const current = selected !== null ? items[selected] : undefined;
  const frame = current?.photo.frame ?? DEFAULT_FRAME;
  const rot = frame.rot ?? 0;

  const onFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    void ctl.addFiles(Array.from(list));
  };

  const addFromLibrary = (photos: LibraryPhoto[]) => {
    setLibraryOpen(false);
    void ctl.addFromLibrary(photos.map((p) => ({ sourceType: 'patient_photo' as const, sourceId: p.id })));
  };

  const onThumbClick = (index: number) => {
    if (swapMode && selected !== null && selected !== index) {
      void ctl.swap(selected, index);
      onSwapMode(false);
      return;
    }
    select(index);
  };

  return (
    <div className="kt-series">
      <div
        className={`kt-drop${dragOver ? ' over' : ''}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          setDragOver(false);
          if (e.dataTransfer.files.length) {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }
        }}
      >
        <button type="button" className="kt-btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FiUpload aria-hidden="true" /> Dari perangkat
        </button>
        <button type="button" className="kt-btn" onClick={() => setLibraryOpen(true)} disabled={busy}>
          <FiFolder aria-hidden="true" /> Dari rekam medis
        </button>
        <span className="kt-hint">{busy ? 'Memproses foto…' : 'Pilih banyak foto sekaligus, atau seret ke sini.'}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {loading && <p className="kt-hint">Memuat foto…</p>}

      {items.length > 0 && (
        <>
          <div className="kt-strip" role="listbox" aria-label="Foto series">
            {items.map((item, index) => (
              <button
                key={item.photo.id}
                type="button"
                role="option"
                aria-selected={selected === index}
                className={`kt-strip-item${selected === index ? ' on' : ''}${swapMode && selected !== index ? ' swap' : ''}`}
                draggable
                onDragStart={() => {
                  dragIndex.current = index;
                }}
                onDragOver={(e) => {
                  if (dragIndex.current !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndex.current;
                  dragIndex.current = null;
                  if (from !== null) void ctl.move(from, index);
                }}
                onClick={() => onThumbClick(index)}
                title={swapMode && selected !== index ? 'Ketuk untuk menukar' : `Foto ${index + 1}`}
              >
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- backend-hosted upload
                  <img src={item.url} alt={`Foto ${index + 1}`} style={item.photo.blurFace ? { filter: 'blur(4px)' } : undefined} />
                ) : (
                  <span className="kt-strip-miss">!</span>
                )}
                <b>{index + 1}</b>
              </button>
            ))}
          </div>
          {items.length < 3 && <p className="kt-hint">Case series idealnya 3 foto atau lebih (minimal 2 untuk dipublikasikan).</p>}

          {current && selected !== null ? (
            <div className="kt-stools" aria-label={`Atur foto ${selected + 1}`}>
              <div className="kt-stools-row">
                <strong>Foto {selected + 1}</strong>
                <button type="button" className="kt-stool" onClick={() => onFrame(selected, { rot: normalizeAngle(rot - 90) })} title="Putar ke kiri 90°">
                  <FiRotateCcw aria-hidden="true" />
                  <span>Kiri</span>
                </button>
                <button type="button" className="kt-stool" onClick={() => onFrame(selected, { rot: normalizeAngle(rot + 90) })} title="Putar ke kanan 90°">
                  <FiRotateCw aria-hidden="true" />
                  <span>Kanan</span>
                </button>
                <button type="button" className={`kt-stool${frame.flip ? ' on' : ''}`} onClick={() => onFrame(selected, { flip: !frame.flip })} title="Cermin kiri-kanan" aria-pressed={!!frame.flip}>
                  <FiRepeat aria-hidden="true" />
                  <span>Cermin</span>
                </button>
                <button type="button" className={`kt-stool${current.photo.blurFace ? ' on' : ''}`} onClick={() => void ctl.toggleBlur(selected)} title="Blur foto ini (identitas pasien tidak tampil)" aria-pressed={current.photo.blurFace}>
                  <FiEyeOff aria-hidden="true" />
                  <span>Blur</span>
                </button>
                <button type="button" className="kt-stool" onClick={() => onFrame(selected, { ...DEFAULT_FRAME })} title="Kembalikan posisi, zoom, dan putaran">
                  <FiRefreshCcw aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>

              <label className="kt-zoom">
                <span>Zoom</span>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.05}
                  value={frame.zoom}
                  onChange={(e) => onFrame(selected, { zoom: Number(e.target.value) })}
                  aria-label="Zoom foto"
                />
                <output className="kt-deg">{frame.zoom.toFixed(1)}×</output>
              </label>
              <label className="kt-zoom">
                <span>Miring</span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={rot - Math.round(rot / 90) * 90}
                  onChange={(e) => {
                    const quarter = Math.round(rot / 90) * 90;
                    onFrame(selected, { rot: normalizeAngle(quarter + Number(e.target.value)) });
                  }}
                  aria-label="Kemiringan halus"
                />
                <output className="kt-deg">{Math.round(rot - Math.round(rot / 90) * 90)}°</output>
              </label>

              <div className="kt-stools-row">
                <button type="button" className="kt-stool" disabled={selected === 0} onClick={() => void ctl.move(selected, selected - 1)} title="Geser ke depan">
                  <FiArrowLeft aria-hidden="true" />
                  <span>Maju</span>
                </button>
                <button type="button" className="kt-stool" disabled={selected === items.length - 1} onClick={() => void ctl.move(selected, selected + 1)} title="Geser ke belakang">
                  <FiArrowRight aria-hidden="true" />
                  <span>Mundur</span>
                </button>
                <button type="button" className={`kt-stool${swapMode ? ' on' : ''}`} disabled={items.length < 2} onClick={() => onSwapMode(!swapMode)} title="Tukar tempat dengan foto lain" aria-pressed={swapMode}>
                  <FiShuffle aria-hidden="true" />
                  <span>Tukar</span>
                </button>
                <button type="button" className="kt-stool danger" onClick={() => void ctl.remove(selected)} disabled={busy} title="Hapus foto ini dari konten">
                  <FiTrash2 aria-hidden="true" />
                  <span>Hapus</span>
                </button>
              </div>
              {swapMode && <p className="kt-hint">Ketuk foto lain (di preview atau daftar) untuk menukar tempatnya.</p>}

              <input
                className="kt-series-caption"
                value={current.photo.caption || ''}
                placeholder="Caption foto ini (opsional)"
                maxLength={160}
                onChange={(e) => ctl.setCaptionLocal(selected, e.target.value)}
                onBlur={() => void ctl.saveCaption(selected)}
              />
            </div>
          ) : (
            <p className="kt-hint">Ketuk sebuah foto di preview atau daftar untuk mengatur.</p>
          )}
          <p className="kt-hint">Di preview: geser foto untuk memindahkan isinya, cubit dua jari untuk zoom &amp; putar, ketuk foto untuk memilih.</p>
        </>
      )}

      {libraryOpen && <PhotoLibraryModal onClose={() => setLibraryOpen(false)} onAdd={addFromLibrary} />}
    </div>
  );
}
