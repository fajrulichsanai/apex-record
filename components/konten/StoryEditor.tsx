'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { FiArrowLeft, FiDownload, FiFolder, FiPlus, FiRotateCcw, FiRotateCw, FiUpload } from 'react-icons/fi';
import { MdFlip } from 'react-icons/md';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FeatureGuard from '@/components/auth/FeatureGuard';
import { ApiError, fetchProtectedFileUrl } from '@/lib/api-client';
import { useToast } from '@/lib/toast-context';
import { clinicApi } from '@/lib/clinic';
import ClinicalPhotoPickerModal from '@/components/konten/ClinicalPhotoPickerModal';
import SeriesPhotosEditor from '@/components/konten/SeriesPhotosEditor';
import {
  CONTENT_STATUS_LABEL,
  contentsApi,
  templatesApi,
  type ClinicContent,
  type ContentBackground,
  type ContentLayout,
  type ContentPayload,
  type ContentPhotoFrame,
  type ContentPhotoSource,
  type ContentSettings,
  type ContentStatus,
  type ContentTemplatePayload,
  type ContentTemplateRecord,
  type PickerPhoto,
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
import { SERIES_AREA, drawSeriesStory } from '@/lib/series-canvas';
import { useSeriesPhotos } from '@/lib/use-series-photos';
import { DEFAULT_SERIES_STYLE, SERIES_ARRANGEMENTS, autoGridCols, resolveSeriesStyle, seriesRects, type ResolvedSeriesStyle } from '@/lib/series-layout';
import {
  CONTENT_TEMPLATES,
  REGION_OPTIONS,
  TOOTH_PRESETS,
  TOOTH_ROWS,
  buildCaption,
  findTemplate,
  presetByName,
  regionOf,
  sortTeeth,
  type ContentTemplate,
} from '@/lib/content-templates';
import '../../app/styles/konten.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '700'] });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'] });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'] });

const FONTS: StoryFonts = {
  display: `${display.style.fontFamily}, "Helvetica Neue", Arial, sans-serif`,
  serif: `${serif.style.fontFamily}, Georgia, serif`,
  mono: `${mono.style.fontFamily}, Menlo, monospace`,
};

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** 'content' edits one story; 'template' edits a treatment's template (no photos). */
export type EditorMode = 'content' | 'template';

interface Form {
  /** Template mode: the treatment name, the gallery group. */
  name: string;
  /** Content mode: the template the story was made from. */
  templateId: number | null;
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
  condition: string;
  teeth: string[];
  /** Typed region; empty = derived from the teeth. */
  region: string;
  visits: number | null;
  autoCaption: boolean;
  /** Gaya layout series. */
  seriesStyle: ResolvedSeriesStyle;
}

type BrandFields = Pick<Form, 'brandName' | 'brandSub' | 'contactLine'>;

interface Photo {
  /** Stored URL on the server; null while the upload is still running. */
  url: string | null;
  img: HTMLImageElement;
}

const ARRANGEMENT_ICON: Record<'rows' | 'columns' | 'grid' | 'hero', Array<[number, number, number, number]>> = {
  rows: [[4, 4, 32, 8], [4, 16, 32, 8], [4, 28, 32, 8]],
  columns: [[4, 4, 9, 32], [15, 4, 10, 32], [27, 4, 9, 32]],
  grid: [[4, 4, 15, 15], [21, 4, 15, 15], [4, 21, 15, 15], [21, 21, 15, 15]],
  hero: [[4, 4, 32, 18], [4, 24, 9, 12], [15, 24, 10, 12], [27, 24, 9, 12]],
};

const EMPTY_FORM: Form = {
  name: '',
  templateId: null,
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
  condition: '',
  teeth: [],
  region: '',
  visits: null,
  autoCaption: true,
  seriesStyle: DEFAULT_SERIES_STYLE,
};

/** What starting a template from an example fills in. */
const presetFields = (t: ContentTemplate): Partial<Form> => ({
  name: t.name,
  title: t.title,
  condition: t.conditions[0] ?? '',
  visits: t.visits,
  autoCaption: true,
});

/**
 * A clinic template's fields for a story or for editing it. Clinic details it
 * doesn't override come from Info Klinik (`brand`).
 */
const templateFields = (t: ContentTemplateRecord, brand: BrandFields): Partial<Form> => {
  const s = t.settings ?? {};
  return {
    templateId: t.id,
    title: t.title,
    layout: t.layout,
    background: t.background,
    showDisclaimer: t.showDisclaimer,
    brandName: s.brandName || brand.brandName,
    brandSub: s.brandSub || brand.brandSub,
    contactLine: s.contactLine || brand.contactLine,
    badge: s.badge ?? EMPTY_FORM.badge,
    contactTitle: s.contactTitle ?? EMPTY_FORM.contactTitle,
    handle: s.handle ?? '',
    condition: s.condition ?? '',
    teeth: sortTeeth(s.teeth ?? []),
    region: s.region ?? '',
    visits: s.visits ?? null,
    autoCaption: true,
    seriesStyle: resolveSeriesStyle(s.series),
  };
};

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

export default function StoryEditor({ mode }: { mode: EditorMode }) {
  const isTemplate = mode === 'template';
  const base = isTemplate ? '/konten/template' : '/konten';
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error } = useToast();
  const isNew = params.id === 'baru';
  const idParam = isNew ? null : Number(params.id);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recordId, setRecordId] = useState<number | null>(idParam);
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [templates, setTemplates] = useState<ContentTemplateRecord[]>([]);
  const [brand, setBrand] = useState<BrandFields>({ brandName: '', brandSub: '', contactLine: '' });
  const [photos, setPhotos] = useState<Record<StorySlot, Photo | null>>({ before: null, after: null });
  const [frames, setFrames] = useState<Record<StorySlot, ContentPhotoFrame>>({ before: DEFAULT_FRAME, after: DEFAULT_FRAME });
  const [pickerSlot, setPickerSlot] = useState<StorySlot | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'publish' | 'unpublish' | 'delete'>(null);
  const [dirty, setDirty] = useState(false);
  const [swapMode, setSwapMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveRef = useRef<(allowUntitled?: boolean) => Promise<number | null>>(async () => null);
  const series = useSeriesPhotos(recordId, () => saveRef.current(true), () => setDirty(true));
  const fileInputs = { before: useRef<HTMLInputElement>(null), after: useRef<HTMLInputElement>(null) };
  /** Set when this page created the record, so the URL change doesn't reload it. */
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

  // Load the record (or defaults for a new one), the clinic's details and logo,
  // and — for a story — the clinic's templates.
  useEffect(() => {
    if (idParam !== null && idParam === createdId.current) return;
    let cancelled = false;
    (async () => {
      const [clinic, list] = await Promise.all([
        clinicApi.get().catch(() => null),
        isTemplate ? Promise.resolve([] as ContentTemplateRecord[]) : templatesApi.list().catch(() => []),
      ]);
      const logoImg = clinic?.logoUrl ? await contentsApi.logo().then(blobImage).catch(() => null) : null;
      if (cancelled) return;
      setLogo(logoImg);
      setTemplates(list);
      const website = clinic?.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const clinicBrand: BrandFields = {
        brandName: clinic?.name ?? '',
        brandSub: clinic?.city ? `Klinik · ${clinic.city}` : 'Klinik',
        contactLine: [clinic?.phone ? `WA ${clinic.phone}` : '', website ?? ''].filter(Boolean).join('  ·  '),
      };
      setBrand(clinicBrand);
      const query = new URLSearchParams(window.location.search);

      if (idParam === null) {
        if (isTemplate) {
          // /konten/template/baru?preset=tambal — started from an example.
          const preset = findTemplate(query.get('preset'));
          setForm({ ...EMPTY_FORM, ...clinicBrand, ...(preset ? presetFields(preset) : {}) });
        } else {
          // /konten/baru?template=12 — a story for that treatment.
          const t = list.find((x) => x.id === Number(query.get('template')));
          setForm({ ...EMPTY_FORM, ...clinicBrand, ...(t ? templateFields(t, clinicBrand) : {}) });
        }
        setLoading(false);
        return;
      }
      if (!Number.isInteger(idParam) || idParam < 1) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (isTemplate) {
        let t: ContentTemplateRecord;
        try {
          t = await templatesApi.get(idParam);
        } catch (err) {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
          else error(err instanceof ApiError ? err.message : 'Gagal memuat template');
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setForm({ ...EMPTY_FORM, ...clinicBrand, ...templateFields(t, clinicBrand), name: t.name });
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
        name: '',
        templateId: content.templateId ?? null,
        title: content.title,
        caption: content.caption ?? '',
        layout: content.layout,
        background: content.background,
        showDisclaimer: content.showDisclaimer,
        brandName: s.brandName ?? clinicBrand.brandName,
        brandSub: s.brandSub ?? clinicBrand.brandSub,
        badge: s.badge ?? EMPTY_FORM.badge,
        contactTitle: s.contactTitle ?? EMPTY_FORM.contactTitle,
        contactLine: s.contactLine ?? clinicBrand.contactLine,
        handle: s.handle ?? '',
        condition: s.condition ?? '',
        teeth: sortTeeth(s.teeth ?? []),
        region: s.region ?? '',
        visits: s.visits ?? null,
        // Stories made before the details existed keep their typed caption.
        autoCaption: s.autoCaption ?? false,
        seriesStyle: resolveSeriesStyle(s.series),
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
  }, [idParam, isTemplate, error]);

  const autoRegion = regionOf(form.teeth);
  const region = form.region.trim() || autoRegion;
  const autoCaption = buildCaption({ condition: form.condition, teeth: form.teeth, region, visits: form.visits });
  const caption = form.autoCaption || isTemplate ? autoCaption : form.caption;
  const storyTitle = form.title || (isTemplate ? form.name : '');

  // Redraw the story whenever anything on it changes.
  useEffect(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g || loading) return;
    if (form.layout === 'series') {
      drawSeriesStory(
        g,
        {
          ...form,
          title: storyTitle,
          caption,
          logo,
          photos: series.draws,
          style: form.seriesStyle,
        },
        FONTS,
      );
      return;
    }
    drawStory(
      g,
      {
        ...form,
        title: storyTitle,
        caption,
        logo,
        photos: { before: photos.before?.img ?? null, after: photos.after?.img ?? null },
        frames,
      },
      FONTS,
    );
  }, [form, storyTitle, caption, photos, frames, series.draws, logo, fontsReady, loading]);

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

  /** Picking a photo already in the patient's folder/Pemeriksaan Penunjang: preview it immediately from its own authenticated URL, then copy it into this story's storage in the background. */
  const pickFromLibrary = async (slot: StorySlot, photo: PickerPhoto, sourceType: ContentPhotoSource) => {
    setPickerSlot(null);
    let img: HTMLImageElement;
    try {
      const objectUrl = await fetchProtectedFileUrl(photo.fileUrl);
      img = await loadImage(objectUrl);
    } catch {
      error('Foto ini tidak bisa dimuat.');
      return;
    }
    setPhotos((prev) => ({ ...prev, [slot]: { url: null, img } }));
    setFrames((prev) => ({ ...prev, [slot]: DEFAULT_FRAME }));
    setDirty(true);
    try {
      const { url } = await contentsApi.importPhoto(sourceType, photo.id);
      setPhotos((prev) => (prev[slot]?.img === img ? { ...prev, [slot]: { url, img } } : prev));
    } catch (err) {
      setPhotos((prev) => (prev[slot]?.img === img ? { ...prev, [slot]: null } : prev));
      error(err instanceof ApiError ? err.message : 'Gagal mengambil foto dari rekam medis');
    }
  };

  const uploading = !!(photos.before && !photos.before.url) || !!(photos.after && !photos.after.url);

  /** Settings shared by a story and a template. */
  const sharedSettings = (): ContentSettings => ({
    brandName: form.brandName.trim(),
    brandSub: form.brandSub.trim(),
    badge: form.badge.trim(),
    contactTitle: form.contactTitle.trim(),
    contactLine: form.contactLine.trim(),
    handle: form.handle.trim(),
    teeth: form.teeth,
    region: form.region.trim(),
    condition: form.condition.trim(),
    visits: form.visits ?? undefined,
    series: form.seriesStyle,
  });

  const contentPayload = (titleOverride?: string): ContentPayload => ({
    templateId: form.templateId,
    title: titleOverride ?? form.title.trim(),
    caption: caption.trim(),
    layout: form.layout,
    background: form.background,
    showDisclaimer: form.showDisclaimer,
    beforeImageUrl: photos.before?.url ?? null,
    afterImageUrl: photos.after?.url ?? null,
    settings: {
      ...sharedSettings(),
      before: frames.before,
      after: frames.after,
      autoCaption: form.autoCaption,
    },
  });

  const templatePayload = (): ContentTemplatePayload => {
    const s = sharedSettings();
    return {
      name: form.name.trim(),
      title: form.title.trim() || form.name.trim(),
      layout: form.layout,
      background: form.background,
      showDisclaimer: form.showDisclaimer,
      settings: {
        ...s,
        // Only what differs from Info Klinik, so a later change there still shows.
        brandName: s.brandName !== brand.brandName ? s.brandName : '',
        brandSub: s.brandSub !== brand.brandSub ? s.brandSub : '',
        contactLine: s.contactLine !== brand.contactLine ? s.contactLine : '',
        autoCaption: true,
      },
    };
  };

  /** Saves the record; returns its id, or null if it couldn't. */
  const save = async (allowUntitled = false): Promise<number | null> => {
    // Menambah foto tidak boleh terhambat judul: draft diberi judul sementara yang bisa diganti.
    const draftTitle = allowUntitled && !isTemplate && !form.title.trim() ? 'Case series' : undefined;
    if (draftTitle) setForm((prev) => ({ ...prev, title: draftTitle }));
    if (!draftTitle && (isTemplate ? !form.name.trim() : !form.title.trim())) {
      error(isTemplate ? 'Isi nama tindakan dulu' : 'Isi nama tindakan dulu');
      return null;
    }
    if (uploading) {
      error('Tunggu foto selesai diunggah');
      return null;
    }
    let id: number;
    if (isTemplate) {
      const saved = recordId ? await templatesApi.update(recordId, templatePayload()) : await templatesApi.create(templatePayload());
      id = saved.id;
    } else {
      const saved = recordId ? await contentsApi.update(recordId, contentPayload(draftTitle)) : await contentsApi.create(contentPayload(draftTitle));
      setStatus(saved.status);
      id = saved.id;
    }
    setDirty(false);
    if (!recordId) {
      createdId.current = id;
      setRecordId(id);
      // No navigation: that would remount the editor mid-publish.
      window.history.replaceState(null, '', `${base}/${id}`);
    }
    return id;
  };

  useEffect(() => {
    saveRef.current = save;
  });

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
      if ((await save()) === null) return;
      if (isTemplate) success('Template tersimpan');
      else success(status === 'published' ? 'Tersimpan. Tampilkan ulang agar perubahan muncul di website.' : 'Draft tersimpan');
    });

  const onPublish = () =>
    run('publish', async () => {
      if (form.layout === 'series') {
        if (series.draws.length < 2) {
          error('Tambah minimal 2 foto dulu');
          return;
        }
      } else if (!photos.before || !photos.after) {
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
      success('Konten tampil di website klinik');
    });

  const onUnpublish = () =>
    run('unpublish', async () => {
      if (!recordId) return;
      const c = await contentsApi.unpublish(recordId);
      setStatus(c.status);
      success('Konten disembunyikan dari website');
    });

  const onDelete = () =>
    run('delete', async () => {
      if (!recordId) return;
      if (isTemplate) await templatesApi.remove(recordId);
      else await contentsApi.remove(recordId);
      success(isTemplate ? 'Template dihapus' : 'Konten dihapus');
      router.push('/konten');
    });

  const onDownload = async () => {
    if (form.layout === 'series') {
      if (series.draws.length < 2) {
        error('Tambah minimal 2 foto dulu');
        return;
      }
    } else if (!photos.before || !photos.after) {
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
  // ── Series: ketuk untuk memilih, geser/cubit untuk mengatur isi sel ──────
  const seriesRectsNow = () => seriesRects(series.draws.length, form.seriesStyle, SERIES_AREA);
  /** Indeks sel (pada draws) di bawah titik, atau -1. */
  const seriesCellAt = (p: Point) =>
    seriesRectsNow().findIndex(([x, y, w, h]) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h);
  /** Terapkan perubahan frame ke foto `itemIndex`, dijepit supaya sel tak pernah kosong. */
  const applySeriesFrame = (itemIndex: number, patch: Partial<ContentPhotoFrame>) => {
    const di = series.drawIndexOf.indexOf(itemIndex);
    const draw = series.draws[di];
    const rect = seriesRectsNow()[di];
    const next = { ...series.frameOf(itemIndex), ...patch };
    series.setFrame(itemIndex, draw && rect ? placePhoto(draw.img, next, rect).frame : next);
  };
  const seriesWheelRef = useRef<((p: Point, delta: number) => void) | null>(null);
  useEffect(() => {
    seriesWheelRef.current = (p, delta) => {
      const di = seriesCellAt(p);
      if (di < 0) return;
      const item = series.drawIndexOf[di];
      applySeriesFrame(item, { zoom: clampZoom(series.frameOf(item).zoom * Math.exp(-delta * 0.01)) });
    };
  });
  const seriesGesture = useRef<{ item: number; base: ContentPhotoFrame; start: Map<number, Point>; moved: boolean } | null>(null);
  const seriesDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toStory(e);
    if (!seriesGesture.current) {
      const di = seriesCellAt(p);
      if (di < 0) return;
      const item = series.drawIndexOf[di];
      if (swapMode && series.selected !== null && series.selected !== item) {
        void series.swap(series.selected, item);
        setSwapMode(false);
        return;
      }
      series.select(item);
      seriesGesture.current = { item, base: series.frameOf(item), start: new Map(), moved: false };
    }
    pointers.current.set(e.pointerId, p);
    seriesGesture.current.base = series.frameOf(seriesGesture.current.item);
    seriesGesture.current.start = new Map(pointers.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const seriesMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = seriesGesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toStory(e));
    const ids = [...g.start.keys()].filter((id) => pointers.current.has(id)).slice(0, 2);
    const b = g.base;
    if (ids.length === 1) {
      const s0 = g.start.get(ids[0])!;
      const s1 = pointers.current.get(ids[0])!;
      if (!g.moved && Math.hypot(s1.x - s0.x, s1.y - s0.y) < 6) return;
      g.moved = true;
      applySeriesFrame(g.item, { ox: b.ox + s1.x - s0.x, oy: b.oy + s1.y - s0.y });
    } else if (ids.length === 2) {
      const [a0, b0] = ids.map((id) => g.start.get(id)!);
      const [a1, b1] = ids.map((id) => pointers.current.get(id)!);
      const m0 = mid(a0, b0);
      const m1 = mid(a1, b1);
      const d0 = dist(a0, b0);
      g.moved = true;
      applySeriesFrame(g.item, {
        zoom: clampZoom(b.zoom * (d0 > 0 ? dist(a1, b1) / d0 : 1)),
        rot: normalizeAngle(snapAngle((b.rot ?? 0) + angle(a1, b1) - angle(a0, b0))),
        ox: b.ox + m1.x - m0.x,
        oy: b.oy + m1.y - m0.y,
      });
    }
  };
  const seriesEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const g = seriesGesture.current;
    if (!g) return;
    if (pointers.current.size === 0) seriesGesture.current = null;
    else {
      g.base = series.frameOf(g.item);
      g.start = new Map(pointers.current);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isTemplate) return;
    if (form.layout === 'series') return seriesDown(e);
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
    if (form.layout === 'series') return seriesMove(e);
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toStory(e));
    const ids = [...g.start.keys()].filter((id) => pointers.current.has(id)).slice(0, 2);
    const { base: b } = g;
    if (ids.length === 1) {
      const s0 = g.start.get(ids[0])!;
      const s1 = pointers.current.get(ids[0])!;
      commitFrame(g.slot, { ...b, ox: b.ox + s1.x - s0.x, oy: b.oy + s1.y - s0.y });
    } else if (ids.length === 2) {
      const [a0, b0] = ids.map((id) => g.start.get(id)!);
      const [a1, b1] = ids.map((id) => pointers.current.get(id)!);
      const m0 = mid(a0, b0);
      const m1 = mid(a1, b1);
      const d0 = dist(a0, b0);
      commitFrame(g.slot, {
        ...b,
        zoom: clampZoom(b.zoom * (d0 > 0 ? dist(a1, b1) / d0 : 1)),
        rot: normalizeAngle(snapAngle((b.rot ?? 0) + angle(a1, b1) - angle(a0, b0))),
        ox: b.ox + m1.x - m0.x,
        oy: b.oy + m1.y - m0.y,
      });
    }
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (form.layout === 'series') return seriesEnd(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else rebase();
  };

  // Ctrl + scroll (and a trackpad pinch, which the browser sends as one)
  // zooms the photo under the cursor. Needs a non-passive listener.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isTemplate) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (layoutRef.current === 'series') {
        const rs = canvas.getBoundingClientRect();
        e.preventDefault();
        seriesWheelRef.current?.(
          { x: ((e.clientX - rs.left) * STORY_W) / rs.width, y: ((e.clientY - rs.top) * STORY_H) / rs.height },
          Math.max(-50, Math.min(50, e.deltaY)),
        );
        return;
      }
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
  }, [loading, notFound, isTemplate]);

  const resetFrame = (slot: StorySlot) => commitFrame(slot, DEFAULT_FRAME);

  const setSeriesStyle = (patch: Partial<ResolvedSeriesStyle>) =>
    setForm((prev) => ({ ...prev, seriesStyle: resolveSeriesStyle({ ...prev.seriesStyle, ...patch }) }));

  const setLayout = (layout: ContentLayout) => {
    set('layout', layout);
    layoutRef.current = layout;
    // Pan offsets are relative to the frame, which just changed shape.
    setFrames((prev) => ({ before: { ...prev.before, ox: 0, oy: 0 }, after: { ...prev.after, ox: 0, oy: 0 } }));
  };

  const applyPreset = (t: ContentTemplate) => {
    setForm((prev) => ({ ...prev, ...presetFields(t) }));
    setDirty(true);
  };
  const applyTemplate = (t: ContentTemplateRecord | null) => {
    setForm((prev) => (t ? { ...prev, ...templateFields(t, brand) } : { ...prev, templateId: null }));
    setDirty(true);
  };

  const selectedTemplate = templates.find((t) => t.id === form.templateId) ?? null;
  const conditionChips = presetByName(isTemplate ? form.name : (selectedTemplate?.name ?? form.title))?.conditions ?? [];

  const toggleTooth = (tooth: string) =>
    set('teeth', form.teeth.includes(tooth) ? form.teeth.filter((t) => t !== tooth) : sortTeeth([...form.teeth, tooth]));

  const heading = isTemplate
    ? recordId
      ? `Template: ${form.name || 'Tindakan'}`
      : 'Template tindakan baru'
    : recordId
      ? form.title || 'Konten'
      : 'Konten baru';

  return (
    <DashboardLayout>
      <FeatureGuard feature="konten">
        <main className="content konten-page">
          <div className="kt-head">
            <div>
              <Link href="/konten" className="kt-back">
                <FiArrowLeft aria-hidden="true" /> Galeri konten
              </Link>
              <h1>{heading}</h1>
              {isTemplate ? (
                <p className="kt-subtitle">
                  Isi sekali untuk satu tindakan. Setiap konten baru dari template ini tinggal diberi foto (dan keterangan
                  bila perlu).
                </p>
              ) : (
                recordId &&
                !notFound &&
                !loading && (
                  <p className="kt-subtitle">
                    <span className={`kt-status ${status}`}>{CONTENT_STATUS_LABEL[status]}</span>
                    {selectedTemplate && <> · {selectedTemplate.name}</>}
                    {status === 'published' && publishedAt && (
                      <> · di website sejak {new Date(publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                    )}
                    {status === 'published' && dirty && <> · ada perubahan yang belum ditampilkan</>}
                  </p>
                )
              )}
            </div>
          </div>

          {loading ? (
            <p className="kt-empty">Memuat…</p>
          ) : notFound ? (
            <div className="kt-empty-card">
              <p>{isTemplate ? 'Template tidak ditemukan.' : 'Konten tidak ditemukan.'}</p>
              <Link href="/konten" className="kt-btn">
                Kembali ke galeri
              </Link>
            </div>
          ) : (
            <div className="kt-editor">
              <form className="kt-form" onSubmit={(e) => e.preventDefault()}>
                {isTemplate ? (
                  <details className="kt-section kt-details" open={isNew}>
                    <summary>Mulai dari contoh</summary>
                    <p className="kt-hint">Pilih yang paling mirip, lalu ubah sesuai klinik Anda.</p>
                    <div className="kt-templates">
                      {CONTENT_TEMPLATES.map((t) => (
                        <button key={t.id} type="button" className="kt-template" onClick={() => applyPreset(t)}>
                          <b>{t.name}</b>
                          <span>{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                ) : (
                  <section className="kt-section">
                    <div className="kt-section-head">
                      <h2>Tindakan</h2>
                      <Link href="/konten/template/baru" className="kt-link-btn">
                        <FiPlus aria-hidden="true" /> Template baru
                      </Link>
                    </div>
                    {templates.length === 0 ? (
                      <p className="kt-hint">
                        Belum ada template. <Link href="/konten/template/baru">Buat template per tindakan</Link> (Tambal, Cabut,
                        Scaling, …) supaya konten berikutnya cukup diberi foto.
                      </p>
                    ) : (
                      <>
                        <p className="kt-hint">Pilih tindakan: teks dan tampilan terisi dari template-nya.</p>
                        <div className="kt-templates">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className={`kt-template${form.templateId === t.id ? ' on' : ''}`}
                              aria-pressed={form.templateId === t.id}
                              onClick={() => applyTemplate(t)}
                            >
                              <b>{t.name}</b>
                              <span>{t.title}</span>
                            </button>
                          ))}
                        </div>
                        {selectedTemplate && (
                          <p className="kt-hint">
                            <button type="button" className="kt-link" onClick={() => applyTemplate(null)}>
                              Tanpa template
                            </button>{' '}
                            · <Link href={`/konten/template/${selectedTemplate.id}`}>Edit template {selectedTemplate.name}</Link>
                          </p>
                        )}
                      </>
                    )}
                  </section>
                )}

                {!isTemplate && form.layout === 'series' && (
                  <section className="kt-section">
                    <h2>Foto</h2>
                    <SeriesPhotosEditor
                      ctl={series}
                      onFrame={(index, patch) => applySeriesFrame(index, patch)}
                      swapMode={swapMode}
                      onSwapMode={setSwapMode}
                    />
                  </section>
                )}

                {!isTemplate && form.layout !== 'series' && (
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
                            <button type="button" className="kt-btn" onClick={() => setPickerSlot(slot)}>
                              <FiFolder aria-hidden="true" />
                              Dari Rekam Medis
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
                      Di pratinjau: geser foto untuk mengatur posisi, cubit dua jari untuk zoom dan putar. Di komputer: Ctrl +
                      scroll untuk zoom.
                    </p>
                  </section>
                )}

                <section className="kt-section">
                  <h2>{isTemplate ? 'Isi template' : 'Detail perawatan'}</h2>
                  {isTemplate && (
                    <label className="kt-field">
                      <span>Nama tindakan (nama kelompok di galeri)</span>
                      <input value={form.name} maxLength={40} onChange={(e) => set('name', e.target.value)} placeholder="mis. Tambal" />
                    </label>
                  )}
                  <label className="kt-field">
                    <span>{isTemplate ? 'Judul di story' : 'Nama tindakan'}</span>
                    <input
                      value={form.title}
                      maxLength={64}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder={isTemplate ? form.name || 'mis. Tambal estetik' : 'mis. Tambal estetik'}
                    />
                  </label>
                  <label className="kt-field">
                    <span>Keluhan / diagnosis</span>
                    <input value={form.condition} maxLength={80} onChange={(e) => set('condition', e.target.value)} placeholder="mis. Gigi berlubang" />
                  </label>
                  {conditionChips.length > 0 && (
                    <div className="kt-chips" aria-label="Keluhan umum untuk tindakan ini">
                      {conditionChips.map((c) => (
                        <button key={c} type="button" className={`kt-chip${form.condition === c ? ' on' : ''}`} onClick={() => set('condition', c)}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="kt-field">
                    <span id="kt-teeth-label">{isTemplate ? 'Gigi (opsional — biasanya diisi per konten)' : 'Gigi yang dirawat (FDI)'}</span>
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

                  {isTemplate ? (
                    <p className="kt-hint">
                      Keterangan di story: <b>{autoCaption || '—'}</b>. Setiap konten bisa mengubahnya.
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                </section>

                <section className="kt-section">
                  <h2>Tampilan</h2>
                  <div className="kt-choice" role="radiogroup" aria-label="Susunan foto">
                    {(
                      [
                        ['stack', 'Atas–bawah'],
                        ['split', 'Kiri–kanan'],
                        ['series', 'Rangkaian (3+ foto)'],
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
                  {form.layout === 'series' && (
                    <div className="kt-series-style">
                      <h3>Gaya rangkaian</h3>
                      <div className="kt-label">Susunan foto</div>
                      <div className="kt-arrange" role="radiogroup" aria-label="Susunan foto rangkaian">
                        {SERIES_ARRANGEMENTS.map(({ value, label }) => (
                          <label key={value} className={form.seriesStyle.arrangement === value ? 'on' : ''}>
                            <input
                              type="radio"
                              name="series-arrangement"
                              checked={form.seriesStyle.arrangement === value}
                              onChange={() => setSeriesStyle({ arrangement: value })}
                            />
                            <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
                              {ARRANGEMENT_ICON[value].map((r, i) => (
                                <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="2" />
                              ))}
                            </svg>
                            {label}
                          </label>
                        ))}
                      </div>
                      {form.seriesStyle.arrangement === 'grid' && (
                        <>
                          <div className="kt-label">Kolom kisi</div>
                          <div className="kt-choice" role="radiogroup" aria-label="Jumlah kolom kisi">
                            {[0, 1, 2, 3, 4].map((n) => (
                              <label key={n} className={form.seriesStyle.cols === n ? 'on' : ''}>
                                <input
                                  type="radio"
                                  name="series-cols"
                                  checked={form.seriesStyle.cols === n}
                                  onChange={() => setSeriesStyle({ cols: n })}
                                />
                                {n === 0 ? `Otomatis (${autoGridCols(Math.max(1, series.draws.length))})` : `${n} kolom`}
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      <label className="kt-zoom">
                        <span>Jarak foto</span>
                        <input
                          type="range" min={0} max={48} step={1}
                          value={form.seriesStyle.gap}
                          onChange={(e) => setSeriesStyle({ gap: Number(e.target.value) })}
                          aria-label="Jarak antar foto"
                        />
                        <output className="kt-deg">{form.seriesStyle.gap}</output>
                      </label>
                      <label className="kt-zoom">
                        <span>Sudut foto</span>
                        <input
                          type="range" min={0} max={80} step={1}
                          value={form.seriesStyle.radius}
                          onChange={(e) => setSeriesStyle({ radius: Number(e.target.value) })}
                          aria-label="Kebulatan sudut foto"
                        />
                        <output className="kt-deg">{form.seriesStyle.radius}</output>
                      </label>
                      <div className="kt-label">Keterangan tiap foto</div>
                      <div className="kt-choice" role="radiogroup" aria-label="Gaya keterangan">
                        {(
                          [
                            ['chip', 'Label'],
                            ['bar', 'Pita'],
                            ['none', 'Tanpa'],
                          ] as const
                        ).map(([value, label]) => (
                          <label key={value} className={form.seriesStyle.captionStyle === value ? 'on' : ''}>
                            <input
                              type="radio" name="series-caption"
                              checked={form.seriesStyle.captionStyle === value}
                              onChange={() => setSeriesStyle({ captionStyle: value })}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div className="kt-choice" role="radiogroup" aria-label="Posisi keterangan">
                        {(
                          [
                            ['top', 'Di atas foto'],
                            ['bottom', 'Di bawah foto'],
                          ] as const
                        ).map(([value, label]) => (
                          <label key={value} className={form.seriesStyle.captionPosition === value ? 'on' : ''}>
                            <input
                              type="radio" name="series-caption-pos"
                              checked={form.seriesStyle.captionPosition === value}
                              onChange={() => setSeriesStyle({ captionPosition: value })}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <label className="kt-check">
                        <input
                          type="checkbox"
                          checked={form.seriesStyle.showNumbers}
                          onChange={(e) => setSeriesStyle({ showNumbers: e.target.checked })}
                        />
                        Beri nomor urut (1, 2, 3…) di tiap foto
                      </label>
                      <div className="kt-label">Warna</div>
                      <div className="kt-colors">
                        {(
                          [
                            ['bgColor', 'Latar'],
                            ['accentColor', 'Aksen'],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key} className="kt-color">
                            <label>
                              <span>{label}</span>
                              <input
                                type="color"
                                value={form.seriesStyle[key] || (key === 'bgColor' ? (form.background === 'navy' ? '#0f1f4d' : '#ffffff') : '#1d2f6f')}
                                onChange={(e) => setSeriesStyle({ [key]: e.target.value })}
                                aria-label={`Warna ${label.toLowerCase()}`}
                              />
                            </label>
                            {form.seriesStyle[key] && (
                              <button type="button" className="kt-link" onClick={() => setSeriesStyle({ [key]: '' })}>
                                Ikut tema
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="kt-hint">
                        Pengaturan ini ikut tersimpan{isTemplate ? ' di template tindakan ini' : ' di konten ini dan dipakai template'}.
                        {' '}
                        <button type="button" className="kt-link" onClick={() => set('seriesStyle', DEFAULT_SERIES_STYLE)}>
                          Kembalikan ke bawaan
                        </button>
                      </p>
                    </div>
                  )}
                  <label className="kt-check">
                    <input type="checkbox" checked={form.showDisclaimer} onChange={(e) => set('showDisclaimer', e.target.checked)} />
                    Tampilkan catatan &ldquo;Dipublikasikan atas izin pasien · Hasil tiap pasien dapat berbeda&rdquo;
                  </label>
                </section>

                <details className="kt-section kt-details">
                  <summary>Pengaturan klinik di story</summary>
                  <p className="kt-hint">
                    Diisi dari Info Klinik. Ubah di sini hanya untuk {isTemplate ? 'tindakan ini' : 'konten ini'}.
                  </p>
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

                {!isTemplate && (
                  <section className="kt-section kt-ethics">
                    <p className="kt-hint">
                      Pastikan pasien setuju fotonya dipublikasikan dan identitasnya terlindungi (gunakan Blur bila perlu). Iklan
                      layanan kesehatan tidak boleh menjanjikan hasil: tampilkan hasil apa adanya, tanpa edit berlebihan.
                    </p>
                  </section>
                )}

                <div className="kt-actions">
                  <button type="button" className={`kt-btn${isTemplate ? ' primary' : ''}`} onClick={onSave} disabled={!!busy || uploading}>
                    {busy === 'save' ? 'Menyimpan…' : isTemplate ? 'Simpan template' : 'Simpan draft'}
                  </button>
                  {isTemplate ? (
                    recordId && (
                      <Link href={`/konten/baru?template=${recordId}`} className="kt-btn">
                        <FiPlus aria-hidden="true" /> Buat konten dari template ini
                      </Link>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        className="kt-btn primary"
                        onClick={onPublish}
                        disabled={!!busy || uploading}
                        title="Tampilkan di galeri website klinik"
                      >
                        {busy === 'publish' ? 'Menampilkan…' : status === 'published' ? 'Perbarui di website' : 'Tampilkan di website'}
                      </button>
                      <button type="button" className="kt-btn" onClick={onDownload} disabled={uploading}>
                        <FiDownload aria-hidden="true" /> Unduh PNG
                      </button>
                    </>
                  )}
                </div>
                {!isTemplate && (
                  <p className="kt-hint">
                    &ldquo;Tampilkan di website&rdquo; memasang story ini di galeri website klinik. Untuk Instagram atau
                    WhatsApp, pakai Unduh PNG.
                  </p>
                )}
                {recordId && (
                  <div className="kt-actions secondary">
                    {!isTemplate && status === 'published' && (
                      <button type="button" className="kt-btn" onClick={onUnpublish} disabled={!!busy}>
                        {busy === 'unpublish' ? 'Menyembunyikan…' : 'Sembunyikan dari website'}
                      </button>
                    )}
                    {confirmDelete ? (
                      <>
                        {isTemplate && <span className="kt-hint">Konten dari template ini tetap ada (pindah ke &ldquo;Lainnya&rdquo;).</span>}
                        <button type="button" className="kt-btn danger" onClick={onDelete} disabled={!!busy}>
                          {busy === 'delete' ? 'Menghapus…' : 'Ya, hapus'}
                        </button>
                        <button type="button" className="kt-btn" onClick={() => setConfirmDelete(false)} disabled={!!busy}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <button type="button" className="kt-btn danger-outline" onClick={() => setConfirmDelete(true)} disabled={!!busy}>
                        {isTemplate ? 'Hapus template' : 'Hapus'}
                      </button>
                    )}
                  </div>
                )}
              </form>

              <div className="kt-preview">
                <div className="kt-stage">
                <canvas
                  ref={canvasRef}
                  width={STORY_W}
                  height={STORY_H}
                  role="img"
                  aria-label={`Pratinjau story before–after ${storyTitle}`}
                  className={isTemplate ? 'static' : undefined}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerEnd}
                  onPointerCancel={onPointerEnd}
                />
                {form.layout === 'series' && !isTemplate && series.selected !== null && (() => {
                  const di = series.drawIndexOf.indexOf(series.selected);
                  const r = di >= 0 ? seriesRectsNow()[di] : null;
                  if (!r) return null;
                  return (
                    <div
                      className={`kt-sel${swapMode ? ' swap' : ''}`}
                      style={{ left: `${(r[0] / STORY_W) * 100}%`, top: `${(r[1] / STORY_H) * 100}%`, width: `${(r[2] / STORY_W) * 100}%`, height: `${(r[3] / STORY_H) * 100}%` }}
                    />
                  );
                })()}
                </div>
                <p className="kt-hint">
                  {isTemplate
                    ? 'Pratinjau template — foto diisi per konten.'
                    : '1080 × 1920 px · ukuran story Instagram & WhatsApp'}
                </p>
              </div>
            </div>
          )}
        </main>
      </FeatureGuard>

      {pickerSlot && (
        <ClinicalPhotoPickerModal
          onClose={() => setPickerSlot(null)}
          onPick={(photo, sourceType) => pickFromLibrary(pickerSlot, photo, sourceType)}
        />
      )}
    </DashboardLayout>
  );
}
