'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { FiArrowLeft, FiDownload, FiUpload } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { clinicApi } from '@/lib/clinic';
import {
  CONTENT_STATUS_LABEL,
  contentsApi,
  type ClinicContent,
  type ContentBackground,
  type ContentLayout,
  type ContentPayload,
  type ContentPhotoFrame,
  type ContentStatus,
} from '@/lib/contents';
import {
  DEFAULT_FRAME,
  STORY_H,
  STORY_W,
  drawStory,
  placePhoto,
  slotAt,
  storyRects,
  type StoryFonts,
  type StorySlot,
} from '@/lib/story-canvas';
import '../../../styles/konten.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '700'] });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] });

const FONTS: StoryFonts = {
  display: `${display.style.fontFamily}, "Helvetica Neue", Arial, sans-serif`,
  serif: `${serif.style.fontFamily}, Georgia, serif`,
  mono: `${mono.style.fontFamily}, Menlo, monospace`,
};

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

interface Form {
  title: string;
  caption: string;
  layout: ContentLayout;
  background: ContentBackground;
  showDisclaimer: boolean;
  brandName: string;
  brandSub: string;
  badge: string;
  contactTitle: string;
  contactLine: string;
  handle: string;
}

interface Photo {
  /** Stored URL on the server; null while the upload is still running. */
  url: string | null;
  img: HTMLImageElement;
}

const EMPTY_FORM: Form = {
  title: '',
  caption: '',
  layout: 'stack',
  background: 'light',
  showDisclaimer: true,
  brandName: '',
  brandSub: '',
  badge: 'Hasil perawatan',
  contactTitle: 'Konsultasi & reservasi',
  contactLine: '',
  handle: '',
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gambar tidak bisa dibaca'));
    img.src = src;
  });

const blobImage = async (blob: Blob | null) => (blob ? loadImage(URL.createObjectURL(blob)) : null);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'story';

export default function KontenEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const isNew = params.id === 'baru';
  const idParam = isNew ? null : Number(params.id);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contentId, setContentId] = useState<number | null>(idParam);
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [photos, setPhotos] = useState<Record<StorySlot, Photo | null>>({ before: null, after: null });
  const [frames, setFrames] = useState<Record<StorySlot, ContentPhotoFrame>>({ before: DEFAULT_FRAME, after: DEFAULT_FRAME });
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'unpublish' | 'delete'>(null);
  const [dirty, setDirty] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputs = { before: useRef<HTMLInputElement>(null), after: useRef<HTMLInputElement>(null) };
  /** Set when this page created the content, so the URL change doesn't reload it. */
  const createdId = useRef<number | null>(null);
  const drag = useRef<{ slot: StorySlot; px: number; py: number; ox: number; oy: number } | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  // Fonts for the canvas (it can't wait for CSS to pull them in).
  useEffect(() => {
    Promise.all([
      document.fonts.load(`italic 400 100px ${FONTS.serif}`),
      document.fonts.load(`700 30px ${FONTS.display}`),
      document.fonts.load(`400 30px ${FONTS.display}`),
      document.fonts.load(`400 30px ${FONTS.mono}`),
      document.fonts.load(`500 30px ${FONTS.mono}`),
    ])
      .catch(() => {})
      .finally(() => setFontsReady(true));
  }, []);

  // Load the content (or clinic defaults for a new one) and the logo.
  useEffect(() => {
    if (idParam !== null && idParam === createdId.current) return;
    let cancelled = false;
    (async () => {
      const clinic = await clinicApi.get().catch(() => null);
      const logoImg = clinic?.logoUrl ? await contentsApi.logo().then(blobImage).catch(() => null) : null;
      if (cancelled) return;
      setLogo(logoImg);
      const website = clinic?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const defaults: Partial<Form> = {
        brandName: clinic?.name ?? '',
        brandSub: clinic?.city ? `Klinik · ${clinic.city}` : 'Klinik',
        contactLine: [clinic?.phone ? `WA ${clinic.phone}` : '', website ?? ''].filter(Boolean).join('  ·  '),
      };

      if (idParam === null) {
        setForm({ ...EMPTY_FORM, ...defaults });
        setLoading(false);
        return;
      }
      if (!Number.isInteger(idParam) || idParam < 1) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let content: ClinicContent;
      try {
        content = await contentsApi.get(idParam);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else error(err instanceof ApiError ? err.message : 'Gagal memuat konten');
        setLoading(false);
        return;
      }
      const [before, after] = await Promise.all([
        content.beforeImageUrl ? contentsApi.photo(content.id, 'before').then(blobImage).catch(() => null) : null,
        content.afterImageUrl ? contentsApi.photo(content.id, 'after').then(blobImage).catch(() => null) : null,
      ]);
      if (cancelled) return;
      const s = content.settings ?? {};
      setForm({
        title: content.title,
        caption: content.caption ?? '',
        layout: content.layout,
        background: content.background,
        showDisclaimer: content.showDisclaimer,
        brandName: s.brandName ?? defaults.brandName ?? '',
        brandSub: s.brandSub ?? defaults.brandSub ?? '',
        badge: s.badge ?? EMPTY_FORM.badge,
        contactTitle: s.contactTitle ?? EMPTY_FORM.contactTitle,
        contactLine: s.contactLine ?? defaults.contactLine ?? '',
        handle: s.handle ?? '',
      });
      setPhotos({
        before: before && content.beforeImageUrl ? { url: content.beforeImageUrl, img: before } : null,
        after: after && content.afterImageUrl ? { url: content.afterImageUrl, img: after } : null,
      });
      setFrames({ before: s.before ?? DEFAULT_FRAME, after: s.after ?? DEFAULT_FRAME });
      setStatus(content.status);
      setPublishedAt(content.publishedAt);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idParam, error]);

  // Redraw the story whenever anything on it changes.
  useEffect(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g || loading) return;
    drawStory(
      g,
      {
        ...form,
        logo,
        photos: { before: photos.before?.img ?? null, after: photos.after?.img ?? null },
        frames,
      },
      FONTS,
    );
  }, [form, photos, frames, logo, fontsReady, loading]);

  const pickPhoto = async (slot: StorySlot, file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      error('Ukuran foto maksimal 10 MB');
      return;
    }
    let img: HTMLImageElement;
    try {
      img = await loadImage(URL.createObjectURL(file));
    } catch {
      error('File ini tidak bisa dibaca sebagai gambar. Coba foto JPG atau PNG.');
      return;
    }
    setPhotos((prev) => ({ ...prev, [slot]: { url: null, img } }));
    setFrames((prev) => ({ ...prev, [slot]: DEFAULT_FRAME }));
    setDirty(true);
    try {
      const { url } = await contentsApi.uploadImage(file);
      setPhotos((prev) => (prev[slot]?.img === img ? { ...prev, [slot]: { url, img } } : prev));
    } catch (err) {
      setPhotos((prev) => (prev[slot]?.img === img ? { ...prev, [slot]: null } : prev));
      error(err instanceof ApiError ? err.message : 'Gagal mengunggah foto');
    }
  };

  const uploading = !!(photos.before && !photos.before.url) || !!(photos.after && !photos.after.url);

  const payload = (): ContentPayload => ({
    title: form.title.trim(),
    caption: form.caption.trim(),
    layout: form.layout,
    background: form.background,
    showDisclaimer: form.showDisclaimer,
    beforeImageUrl: photos.before?.url ?? null,
    afterImageUrl: photos.after?.url ?? null,
    settings: {
      before: frames.before,
      after: frames.after,
      brandName: form.brandName.trim(),
      brandSub: form.brandSub.trim(),
      badge: form.badge.trim(),
      contactTitle: form.contactTitle.trim(),
      contactLine: form.contactLine.trim(),
      handle: form.handle.trim(),
    },
  });

  /** Saves the draft; returns the content id, or null if it couldn't. */
  const save = async (): Promise<number | null> => {
    if (!form.title.trim()) {
      error('Isi nama tindakan dulu');
      return null;
    }
    if (uploading) {
      error('Tunggu foto selesai diunggah');
      return null;
    }
    const saved = contentId ? await contentsApi.update(contentId, payload()) : await contentsApi.create(payload());
    setDirty(false);
    setStatus(saved.status);
    if (!contentId) {
      createdId.current = saved.id;
      setContentId(saved.id);
      // No navigation: that would remount the editor mid-publish.
      window.history.replaceState(null, '', `/konten/${saved.id}`);
    }
    return saved.id;
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Terjadi kesalahan');
    } finally {
      setBusy(null);
    }
  };

  const renderPng = () =>
    new Promise<Blob>((resolve, reject) =>
      canvasRef.current?.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), 'image/png'),
    );

  const onSave = () =>
    run('save', async () => {
      if ((await save()) !== null) {
        success(status === 'published' ? 'Tersimpan. Terbitkan ulang agar perubahan tampil di website.' : 'Draft tersimpan');
      }
    });

  const onPublish = () =>
    run('publish', async () => {
      if (!photos.before || !photos.after) {
        error('Pilih foto sebelum dan sesudah dulu');
        return;
      }
      const id = await save();
      if (id === null) return;
      const published = await contentsApi.publish(id, await renderPng());
      setStatus(published.status);
      setPublishedAt(published.publishedAt);
      success('Konten diterbitkan');
    });

  const onUnpublish = () =>
    run('unpublish', async () => {
      if (!contentId) return;
      const c = await contentsApi.unpublish(contentId);
      setStatus(c.status);
      success('Konten ditarik dari website');
    });

  const onDelete = () =>
    run('delete', async () => {
      if (!contentId) return;
      await contentsApi.remove(contentId);
      success('Konten dihapus');
      router.push('/konten');
    });

  const onDownload = async () => {
    if (!photos.before || !photos.after) {
      error('Pilih foto sebelum dan sesudah dulu');
      return;
    }
    try {
      const url = URL.createObjectURL(await renderPng());
      const a = document.createElement('a');
      a.href = url;
      a.download = `before-after-${slug(form.title)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      error('Gagal membuat gambar');
    }
  };

  // Drag a photo to position it; tap an empty frame to pick a photo.
  const toStory = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * STORY_W) / r.width, ((e.clientY - r.top) * STORY_H) / r.height] as const;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [px, py] = toStory(e);
    const slot = slotAt(form.layout, px, py);
    if (!slot) return;
    if (!photos[slot]) {
      fileInputs[slot].current?.click();
      return;
    }
    drag.current = { slot, px, py, ox: frames[slot].ox, oy: frames[slot].oy };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    const img = d && photos[d.slot]?.img;
    if (!d || !img) return;
    const [px, py] = toStory(e);
    const next = placePhoto(
      img,
      { zoom: frames[d.slot].zoom, ox: d.ox + (px - d.px), oy: d.oy + (py - d.py) },
      storyRects(form.layout)[d.slot],
    ).frame;
    setFrames((prev) => ({ ...prev, [d.slot]: next }));
    setDirty(true);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const setZoom = useCallback(
    (slot: StorySlot, zoom: number) => {
      const img = photos[slot]?.img;
      setFrames((prev) => ({
        ...prev,
        [slot]: img ? placePhoto(img, { ...prev[slot], zoom }, storyRects(form.layout)[slot]).frame : { ...prev[slot], zoom },
      }));
      setDirty(true);
    },
    [photos, form.layout],
  );

  const resetFrames = () => {
    setFrames({ before: DEFAULT_FRAME, after: DEFAULT_FRAME });
    setDirty(true);
  };

  const setLayout = (layout: ContentLayout) => {
    set('layout', layout);
    // Pan offsets are relative to the frame, which just changed shape.
    setFrames((prev) => ({ before: { ...prev.before, ox: 0, oy: 0 }, after: { ...prev.after, ox: 0, oy: 0 } }));
  };

  return (
    <DashboardLayout>
      <FeatureGuard feature="konten">
        <main className="content konten-page">
          <div className="kt-head">
            <div>
              <Link href="/konten" className="kt-back">
                <FiArrowLeft aria-hidden="true" /> Semua konten
              </Link>
              <h1>{contentId ? form.title || 'Konten' : 'Konten baru'}</h1>
              {contentId && !notFound && !loading && (
                <p className="kt-subtitle">
                  <span className={`kt-status ${status}`}>{CONTENT_STATUS_LABEL[status]}</span>
                  {status === 'published' && publishedAt && (
                    <> sejak {new Date(publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  )}
                  {status === 'published' && dirty && <> · ada perubahan yang belum diterbitkan</>}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <p className="kt-empty">Memuat…</p>
          ) : notFound ? (
            <div className="kt-empty-card">
              <p>Konten tidak ditemukan.</p>
              <Link href="/konten" className="kt-btn">
                Kembali ke daftar konten
              </Link>
            </div>
          ) : (
            <div className="kt-editor">
              <form className="kt-form" onSubmit={(e) => e.preventDefault()}>
                <section className="kt-section">
                  <h2>Foto</h2>
                  <div className="kt-photos">
                    {(['before', 'after'] as const).map((slot) => (
                      <div key={slot} className="kt-photo">
                        <span className="kt-label">{slot === 'before' ? 'Sebelum' : 'Sesudah'}</span>
                        <button type="button" className="kt-btn" onClick={() => fileInputs[slot].current?.click()}>
                          <FiUpload aria-hidden="true" />
                          {photos[slot] ? (photos[slot]?.url ? 'Ganti foto' : 'Mengunggah…') : 'Pilih foto'}
                        </button>
                        <input
                          ref={fileInputs[slot]}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          onChange={(e) => {
                            pickPhoto(slot, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <label className="kt-zoom">
                          <span>Zoom</span>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={frames[slot].zoom}
                            disabled={!photos[slot]}
                            onChange={(e) => setZoom(slot, Number(e.target.value))}
                            aria-label={`Zoom foto ${slot === 'before' ? 'sebelum' : 'sesudah'}`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="kt-hint">
                    Geser foto di pratinjau untuk mengatur posisi.{' '}
                    <button type="button" className="kt-link" onClick={resetFrames}>
                      Reset posisi
                    </button>
                  </p>
                </section>

                <section className="kt-section">
                  <h2>Teks</h2>
                  <label className="kt-field">
                    <span>Nama tindakan</span>
                    <input value={form.title} maxLength={64} onChange={(e) => set('title', e.target.value)} placeholder="mis. Veneer komposit" />
                  </label>
                  <label className="kt-field">
                    <span>Keterangan (opsional)</span>
                    <input value={form.caption} maxLength={120} onChange={(e) => set('caption', e.target.value)} placeholder="mis. 2 kali kunjungan" />
                  </label>
                </section>

                <section className="kt-section">
                  <h2>Tampilan</h2>
                  <div className="kt-choice" role="radiogroup" aria-label="Susunan foto">
                    {(
                      [
                        ['stack', 'Atas–bawah'],
                        ['split', 'Kiri–kanan'],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className={form.layout === value ? 'on' : ''}>
                        <input type="radio" name="layout" checked={form.layout === value} onChange={() => setLayout(value)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="kt-choice" role="radiogroup" aria-label="Latar">
                    {(
                      [
                        ['light', 'Terang'],
                        ['navy', 'Navy'],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className={form.background === value ? 'on' : ''}>
                        <input type="radio" name="background" checked={form.background === value} onChange={() => set('background', value)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <label className="kt-check">
                    <input type="checkbox" checked={form.showDisclaimer} onChange={(e) => set('showDisclaimer', e.target.checked)} />
                    Tampilkan catatan &ldquo;Dipublikasikan atas izin pasien · Hasil tiap pasien dapat berbeda&rdquo;
                  </label>
                </section>

                <details className="kt-section kt-details">
                  <summary>Pengaturan klinik di story</summary>
                  <p className="kt-hint">Diisi dari Info Klinik. Ubah di sini hanya untuk konten ini.</p>
                  <label className="kt-field">
                    <span>Nama klinik</span>
                    <input value={form.brandName} maxLength={40} onChange={(e) => set('brandName', e.target.value)} />
                  </label>
                  <label className="kt-field">
                    <span>Baris kecil di bawah nama</span>
                    <input value={form.brandSub} maxLength={48} onChange={(e) => set('brandSub', e.target.value)} />
                  </label>
                  <label className="kt-field">
                    <span>Label kanan atas</span>
                    <input value={form.badge} maxLength={32} onChange={(e) => set('badge', e.target.value)} />
                  </label>
                  <label className="kt-field">
                    <span>Judul kontak</span>
                    <input value={form.contactTitle} maxLength={40} onChange={(e) => set('contactTitle', e.target.value)} />
                  </label>
                  <label className="kt-field">
                    <span>Kontak (WA · website)</span>
                    <input value={form.contactLine} maxLength={64} onChange={(e) => set('contactLine', e.target.value)} />
                  </label>
                  <label className="kt-field">
                    <span>Akun Instagram</span>
                    <input value={form.handle} maxLength={32} onChange={(e) => set('handle', e.target.value)} placeholder="@klinikanda" />
                  </label>
                  {!logo && <p className="kt-hint">Logo belum ada. Unggah logo di Pengaturan → Info Klinik agar tampil di story.</p>}
                </details>

                <section className="kt-section kt-ethics">
                  <label className="kt-check">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    Pasien sudah memberi izin tertulis fotonya dipublikasikan, dan wajah/identitasnya tidak terlihat kecuali atas
                    izinnya.
                  </label>
                  <p className="kt-hint">
                    Iklan layanan kesehatan tidak boleh menjanjikan hasil. Tampilkan hasil apa adanya, tanpa edit berlebihan.
                  </p>
                </section>

                <div className="kt-actions">
                  <button type="button" className="kt-btn" onClick={onSave} disabled={!!busy || uploading}>
                    {busy === 'save' ? 'Menyimpan…' : 'Simpan draft'}
                  </button>
                  <button
                    type="button"
                    className="kt-btn primary"
                    onClick={onPublish}
                    disabled={!!busy || uploading || !consent}
                    title={consent ? undefined : 'Centang izin pasien dulu'}
                  >
                    {busy === 'publish' ? 'Menerbitkan…' : status === 'published' ? 'Terbitkan ulang' : 'Terbitkan'}
                  </button>
                  <button type="button" className="kt-btn" onClick={onDownload} disabled={uploading}>
                    <FiDownload aria-hidden="true" /> Unduh PNG
                  </button>
                </div>
                {contentId && (
                  <div className="kt-actions secondary">
                    {status === 'published' && (
                      <button type="button" className="kt-btn" onClick={onUnpublish} disabled={!!busy}>
                        {busy === 'unpublish' ? 'Menarik…' : 'Tarik dari website'}
                      </button>
                    )}
                    {confirmDelete ? (
                      <>
                        <button type="button" className="kt-btn danger" onClick={onDelete} disabled={!!busy}>
                          {busy === 'delete' ? 'Menghapus…' : 'Ya, hapus'}
                        </button>
                        <button type="button" className="kt-btn" onClick={() => setConfirmDelete(false)} disabled={!!busy}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <button type="button" className="kt-btn danger-outline" onClick={() => setConfirmDelete(true)} disabled={!!busy}>
                        Hapus
                      </button>
                    )}
                  </div>
                )}
              </form>

              <div className="kt-preview">
                <canvas
                  ref={canvasRef}
                  width={STORY_W}
                  height={STORY_H}
                  role="img"
                  aria-label={`Pratinjau story before–after ${form.title}`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                />
                <p className="kt-hint">1080 × 1920 px · ukuran story Instagram &amp; WhatsApp</p>
              </div>
            </div>
          )}
        </main>
      </FeatureGuard>
    </DashboardLayout>
  );
}
