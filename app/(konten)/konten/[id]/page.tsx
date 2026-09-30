'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { FiArrowLeft, FiDownload, FiRotateCcw, FiRotateCw, FiUpload } from 'react-icons/fi';
import { MdFlip } from 'react-icons/md';
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
  MAX_ZOOM,
  MIN_ZOOM,
  STORY_H,
  STORY_W,
  drawStory,
  normalizeAngle,
  placePhoto,
  slotAt,
  storyRects,
  type StoryFonts,
  type StorySlot,
} from '@/lib/story-canvas';
import {
  CONTENT_TEMPLATES,
  REGION_OPTIONS,
  TOOTH_PRESETS,
  TOOTH_ROWS,
  buildCaption,
  findTemplate,
  regionOf,
  sortTeeth,
  type ContentTemplate,
} from '@/lib/content-templates';
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
  /** Typed caption; used only while autoCaption is off. */
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
  /** Treatment details; the caption is built from them while autoCaption is on. */
  template: string;
  condition: string;
  teeth: string[];
  /** Typed region; empty = derived from the teeth. */
  region: string;
  visits: number | null;
  autoCaption: boolean;
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
  template: '',
  condition: '',
  teeth: [],
  region: '',
  visits: null,
  autoCaption: true,
};

/** What picking a template fills in; teeth and region are the case's own. */
const templateFields = (t: ContentTemplate): Partial<Form> => ({
  template: t.id,
  title: t.title,
  condition: t.conditions[0] ?? '',
  visits: t.visits,
  autoCaption: true,
});

type Point = { x: number; y: number };
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const angle = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
/** Snaps to a right angle when within a few degrees of one. */
const snapAngle = (deg: number) => {
  const right = Math.round(deg / 90) * 90;
  return Math.abs(deg - right) < 3 ? right : deg;
};
/** The fine-tune part of a rotation (-45..45) on top of its nearest right angle. */
const fineAngle = (deg: number) => deg - Math.round(deg / 90) * 90;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

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

  // Latest values for the pointer/wheel handlers, which run between renders.
  const framesRef = useRef(frames);
  const photosRef = useRef(photos);
  const layoutRef = useRef(form.layout);
  useEffect(() => {
    framesRef.current = frames;
    photosRef.current = photos;
    layoutRef.current = form.layout;
  }, [frames, photos, form.layout]);
  /** Pointers down on the preview, in story coordinates. */
  const pointers = useRef(new Map<number, Point>());
  /** The photo being moved, and its frame + the pointers when the gesture (re)started. */
  const gesture = useRef<{ slot: StorySlot; base: ContentPhotoFrame; start: Map<number, Point> } | null>(null);

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
        // /konten/baru?template=veneer-komposit — started from a template card.
        const t = findTemplate(new URLSearchParams(window.location.search).get('template'));
        setForm({ ...EMPTY_FORM, ...defaults, ...(t ? templateFields(t) : {}) });
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
        template: s.template ?? '',
        condition: s.condition ?? '',
        teeth: sortTeeth(s.teeth ?? []),
        region: s.region ?? '',
        visits: s.visits ?? null,
        // Stories made before the details existed keep their typed caption.
        autoCaption: s.autoCaption ?? false,
      });
      setPhotos({
        before: before && content.beforeImageUrl ? { url: content.beforeImageUrl, img: before } : null,
        after: after && content.afterImageUrl ? { url: content.afterImageUrl, img: after } : null,
      });
      setFrames({ before: { ...DEFAULT_FRAME, ...s.before }, after: { ...DEFAULT_FRAME, ...s.after } });
      setStatus(content.status);
      setPublishedAt(content.publishedAt);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [idParam, error]);

  const autoRegion = regionOf(form.teeth);
  const region = form.region.trim() || autoRegion;
  const caption = form.autoCaption
    ? buildCaption({ condition: form.condition, teeth: form.teeth, region, visits: form.visits })
    : form.caption;

  // Redraw the story whenever anything on it changes.
  useEffect(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g || loading) return;
    drawStory(
      g,
      {
        ...form,
        caption,
        logo,
        photos: { before: photos.before?.img ?? null, after: photos.after?.img ?? null },
        frames,
      },
      FONTS,
    );
  }, [form, caption, photos, frames, logo, fontsReady, loading]);

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
    caption: caption.trim(),
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
      template: form.template || undefined,
      teeth: form.teeth,
      region: form.region.trim(),
      condition: form.condition.trim(),
      visits: form.visits ?? undefined,
      autoCaption: form.autoCaption,
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
      error(err instanceof Error && err.message ? err.message : 'Terjadi kesalahan');
    } finally {
      setBusy(null);
    }
  };

  const renderImage = (type: 'image/png' | 'image/jpeg', quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Gagal membuat gambar'));
        return;
      }
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal membuat gambar'))), type, quality);
    });
  const renderPng = () => renderImage('image/png');

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
      // JPEG, not PNG: a 1080×1920 photo story is several MB as PNG — more
      // than the upload limit in front of the API — and ~0.5 MB as JPEG.
      const published = await contentsApi.publish(id, await renderImage('image/jpeg', 0.9));
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

  /** Sets a photo's frame, clamped so the photo still covers it. */
  const commitFrame = (slot: StorySlot, frame: ContentPhotoFrame) => {
    const img = photosRef.current[slot]?.img;
    const next = img ? placePhoto(img, frame, storyRects(layoutRef.current)[slot]).frame : frame;
    framesRef.current = { ...framesRef.current, [slot]: next };
    setFrames(framesRef.current);
    setDirty(true);
  };
  const updateFrame = (slot: StorySlot, patch: Partial<ContentPhotoFrame>) =>
    commitFrame(slot, { ...framesRef.current[slot], ...patch });
  const rotateBy = (slot: StorySlot, deg: number) =>
    updateFrame(slot, { rot: normalizeAngle((framesRef.current[slot].rot ?? 0) + deg) });

  // On the preview: drag to move a photo, pinch with two fingers to zoom and
  // turn it; tap an empty frame to pick a photo.
  const toStory = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * STORY_W) / r.width, y: ((e.clientY - r.top) * STORY_H) / r.height };
  };
  /** Restarts the gesture from the current frame when a finger lands or lifts. */
  const rebase = () => {
    const g = gesture.current;
    if (g) {
      g.base = framesRef.current[g.slot];
      g.start = new Map(pointers.current);
    }
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toStory(e);
    if (!gesture.current) {
      const slot = slotAt(form.layout, p.x, p.y);
      if (!slot) return;
      if (!photos[slot]) {
        if (pointers.current.size === 0) fileInputs[slot].current?.click();
        return;
      }
      gesture.current = { slot, base: frames[slot], start: new Map() };
    }
    pointers.current.set(e.pointerId, p);
    rebase();
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toStory(e));
    const ids = [...g.start.keys()].filter((id) => pointers.current.has(id)).slice(0, 2);
    const { base } = g;
    if (ids.length === 1) {
      const s0 = g.start.get(ids[0])!;
      const s1 = pointers.current.get(ids[0])!;
      commitFrame(g.slot, { ...base, ox: base.ox + s1.x - s0.x, oy: base.oy + s1.y - s0.y });
    } else if (ids.length === 2) {
      const [a0, b0] = ids.map((id) => g.start.get(id)!);
      const [a1, b1] = ids.map((id) => pointers.current.get(id)!);
      const m0 = mid(a0, b0);
      const m1 = mid(a1, b1);
      const d0 = dist(a0, b0);
      commitFrame(g.slot, {
        ...base,
        zoom: clampZoom(base.zoom * (d0 > 0 ? dist(a1, b1) / d0 : 1)),
        rot: normalizeAngle(snapAngle((base.rot ?? 0) + angle(a1, b1) - angle(a0, b0))),
        ox: base.ox + m1.x - m0.x,
        oy: base.oy + m1.y - m0.y,
      });
    }
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else rebase();
  };

  // Ctrl + scroll (and a trackpad pinch, which the browser sends as one)
  // zooms the photo under the cursor. Needs a non-passive listener.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const r = canvas.getBoundingClientRect();
      const slot = slotAt(
        layoutRef.current,
        ((e.clientX - r.left) * STORY_W) / r.width,
        ((e.clientY - r.top) * STORY_H) / r.height,
      );
      if (!slot || !photosRef.current[slot]) return;
      e.preventDefault();
      const delta = Math.max(-50, Math.min(50, e.deltaY));
      const frame = framesRef.current[slot];
      const img = photosRef.current[slot]?.img;
      const next = { ...frame, zoom: clampZoom(frame.zoom * Math.exp(-delta * 0.01)) };
      framesRef.current = {
        ...framesRef.current,
        [slot]: img ? placePhoto(img, next, storyRects(layoutRef.current)[slot]).frame : next,
      };
      setFrames(framesRef.current);
      setDirty(true);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [loading, notFound]);

  const resetFrame = (slot: StorySlot) => commitFrame(slot, DEFAULT_FRAME);

  const setLayout = (layout: ContentLayout) => {
    set('layout', layout);
    layoutRef.current = layout;
    // Pan offsets are relative to the frame, which just changed shape.
    setFrames((prev) => ({ before: { ...prev.before, ox: 0, oy: 0 }, after: { ...prev.after, ox: 0, oy: 0 } }));
  };

  const applyTemplate = (t: ContentTemplate) => {
    setForm((prev) => ({ ...prev, ...templateFields(t) }));
    setDirty(true);
  };
  const template = findTemplate(form.template);

  const toggleTooth = (tooth: string) =>
    set('teeth', form.teeth.includes(tooth) ? form.teeth.filter((t) => t !== tooth) : sortTeeth([...form.teeth, tooth]));

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
                <details className="kt-section kt-details" open={isNew}>
                  <summary>
                    Template tindakan
                    {template && <span className="kt-summary-note"> · {template.title}</span>}
                  </summary>
                  <p className="kt-hint">Pilih tindakan: judul, keluhan, dan jumlah kunjungan terisi otomatis.</p>
                  <div className="kt-templates">
                    {CONTENT_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`kt-template${form.template === t.id ? ' on' : ''}`}
                        aria-pressed={form.template === t.id}
                        onClick={() => applyTemplate(t)}
                      >
                        <b>{t.title}</b>
                        <span>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </details>

                <section className="kt-section">
                  <h2>Foto</h2>
                  <div className="kt-photos">
                    {(['before', 'after'] as const).map((slot) => {
                      const name = slot === 'before' ? 'sebelum' : 'sesudah';
                      const f = frames[slot];
                      const off = !photos[slot];
                      return (
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
                          <div className="kt-tools">
                            <button type="button" className="kt-icon-btn" onClick={() => rotateBy(slot, -90)} disabled={off} aria-label={`Putar foto ${name} 90° ke kiri`} title="Putar 90° ke kiri">
                              <FiRotateCcw aria-hidden="true" />
                            </button>
                            <button type="button" className="kt-icon-btn" onClick={() => rotateBy(slot, 90)} disabled={off} aria-label={`Putar foto ${name} 90° ke kanan`} title="Putar 90° ke kanan">
                              <FiRotateCw aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`kt-icon-btn${f.flip ? ' on' : ''}`}
                              onClick={() => updateFrame(slot, { flip: !f.flip })}
                              disabled={off}
                              aria-pressed={!!f.flip}
                              aria-label={`Cerminkan foto ${name}`}
                              title="Cerminkan (untuk foto dari kaca mulut)"
                            >
                              <MdFlip aria-hidden="true" />
                            </button>
                            <button type="button" className="kt-link" onClick={() => resetFrame(slot)} disabled={off}>
                              Reset
                            </button>
                          </div>
                          <label className="kt-zoom">
                            <span>Zoom</span>
                            <input
                              type="range"
                              min={MIN_ZOOM}
                              max={MAX_ZOOM}
                              step={0.01}
                              value={f.zoom}
                              disabled={off}
                              onChange={(e) => updateFrame(slot, { zoom: Number(e.target.value) })}
                              aria-label={`Zoom foto ${name}`}
                            />
                          </label>
                          <label className="kt-zoom">
                            <span>Putar</span>
                            <input
                              type="range"
                              min={-45}
                              max={45}
                              step={0.5}
                              value={fineAngle(f.rot ?? 0)}
                              disabled={off}
                              onChange={(e) => {
                                const rot = f.rot ?? 0;
                                updateFrame(slot, { rot: normalizeAngle(rot - fineAngle(rot) + Number(e.target.value)) });
                              }}
                              aria-label={`Kemiringan foto ${name}`}
                            />
                            <output className="kt-deg">{Math.round(f.rot ?? 0)}°</output>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="kt-hint">
                    Di pratinjau: geser foto untuk mengatur posisi, cubit dua jari untuk zoom dan putar. Di komputer: Ctrl + scroll untuk
                    zoom.
                  </p>
                </section>

                <section className="kt-section">
                  <h2>Tindakan</h2>
                  <label className="kt-field">
                    <span>Nama tindakan</span>
                    <input value={form.title} maxLength={64} onChange={(e) => set('title', e.target.value)} placeholder="mis. Veneer komposit" />
                  </label>
                  <label className="kt-field">
                    <span>Keluhan / diagnosis</span>
                    <input value={form.condition} maxLength={80} onChange={(e) => set('condition', e.target.value)} placeholder="mis. Gigi berlubang" />
                  </label>
                  {template && template.conditions.length > 0 && (
                    <div className="kt-chips" aria-label="Keluhan umum untuk tindakan ini">
                      {template.conditions.map((c) => (
                        <button key={c} type="button" className={`kt-chip${form.condition === c ? ' on' : ''}`} onClick={() => set('condition', c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="kt-field">
                    <span id="kt-teeth-label">Gigi yang dirawat (FDI)</span>
                    <div className="kt-teeth" role="group" aria-labelledby="kt-teeth-label">
                      {(['upper', 'lower'] as const).map((row) => (
                        <div key={row} className="kt-teeth-row">
                          {TOOTH_ROWS[row].map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={form.teeth.includes(t) ? 'on' : ''}
                              aria-pressed={form.teeth.includes(t)}
                              onClick={() => toggleTooth(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      ))}
                      <div className="kt-teeth-legend" aria-hidden="true">
                        <span>Kanan pasien</span>
                        <span>Kiri pasien</span>
                      </div>
                    </div>
                    <div className="kt-chips">
                      {TOOTH_PRESETS.map((p) => (
                        <button key={p.label} type="button" className="kt-chip" onClick={() => set('teeth', sortTeeth(p.teeth))}>
                          {p.label}
                        </button>
                      ))}
                      {form.teeth.length > 0 && (
                        <button type="button" className="kt-chip" onClick={() => set('teeth', [])}>
                          Kosongkan
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="kt-row">
                    <label className="kt-field">
                      <span>Regio / lokasi</span>
                      <input
                        value={form.region}
                        maxLength={60}
                        list="kt-regions"
                        onChange={(e) => set('region', e.target.value)}
                        placeholder={autoRegion ? `Otomatis: ${autoRegion}` : 'mis. Rahang atas depan'}
                      />
                      <datalist id="kt-regions">
                        {REGION_OPTIONS.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </label>
                    <label className="kt-field kt-visits">
                      <span>Kunjungan</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={99}
                        value={form.visits ?? ''}
                        onChange={(e) => {
                          const n = Math.round(Number(e.target.value));
                          set('visits', e.target.value && n >= 1 ? Math.min(99, n) : null);
                        }}
                        placeholder="—"
                      />
                    </label>
                  </div>

                  <label className="kt-field">
                    <span>
                      Keterangan di story {form.autoCaption && <em className="kt-auto">otomatis</em>}
                    </span>
                    <input
                      value={caption}
                      maxLength={120}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, caption: e.target.value, autoCaption: false }));
                        setDirty(true);
                      }}
                      placeholder="mis. Gigi berlubang · Gigi 11, 21 · 1 kunjungan"
                    />
                  </label>
                  {!form.autoCaption && (
                    <p className="kt-hint">
                      Keterangan diketik manual.{' '}
                      <button type="button" className="kt-link" onClick={() => set('autoCaption', true)}>
                        Buat otomatis dari detail di atas
                      </button>
                    </p>
                  )}
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
                  onPointerUp={onPointerEnd}
                  onPointerCancel={onPointerEnd}
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
