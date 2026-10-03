import type { ContentBackground, ContentLayout, ContentPhotoFrame } from './contents';

/** Instagram / WhatsApp story size. */
export const STORY_W = 1080;
export const STORY_H = 1920;

export type StorySlot = 'before' | 'after';
type Rect = [x: number, y: number, w: number, h: number];

export interface StoryFonts {
  display: string;
  serif: string;
  mono: string;
}

export interface StoryData {
  layout: ContentLayout;
  background: ContentBackground;
  title: string;
  caption: string;
  showDisclaimer: boolean;
  brandName: string;
  brandSub: string;
  badge: string;
  contactTitle: string;
  contactLine: string;
  handle: string;
  logo: HTMLImageElement | null;
  photos: Record<StorySlot, HTMLImageElement | null>;
  frames: Record<StorySlot, ContentPhotoFrame>;
}

const THEMES = {
  light: {
    bg: '#ffffff', fg: '#16213f', muted: '#6b7593', accent: '#1d2f6f', slot: '#eef1f7', slotInk: '#9aa4c0',
    chipA: '#ffffff', chipAfg: '#1d2f6f', chipB: '#1d2f6f', chipBfg: '#ffffff',
  },
  navy: {
    bg: '#0f1f4d', fg: '#ffffff', muted: '#a9b6d8', accent: '#bcd0ff', slot: '#172a5f', slotInk: '#6f82b5',
    chipA: '#ffffff', chipAfg: '#0f1f4d', chipB: '#bcd0ff', chipBfg: '#0f1f4d',
  },
} as const;

export const DISCLAIMER = 'Dipublikasikan atas izin pasien · Hasil tiap pasien dapat berbeda';
export const DEFAULT_FRAME: ContentPhotoFrame = { zoom: 1, ox: 0, oy: 0, rot: 0, flip: false };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** Any angle, as degrees within -180..180. */
export const normalizeAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

/** Where each photo sits on the story. */
export function storyRects(layout: ContentLayout): Record<StorySlot, Rect> {
  const top = 560, bot = 1560, x0 = 60, x1 = 1020, gap = 18;
  if (layout === 'split') {
    const w = (x1 - x0 - gap) / 2;
    return { before: [x0, top, w, bot - top], after: [x0 + w + gap, top, w, bot - top] };
  }
  const h = (bot - top - gap) / 2;
  return { before: [x0, top, x1 - x0, h], after: [x0, top + h + gap, x1 - x0, h] };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Cover-fits the photo into its rect at any rotation, applies zoom and pan,
 * and keeps the pan inside the photo's edges so the frame never shows a gap.
 * Returns the clamped frame and how to draw it: centre, size, angle, mirror.
 */
export function placePhoto(img: { width: number; height: number }, frame: ContentPhotoFrame, rect: Rect) {
  const [x, y, w, h] = rect;
  const rot = normalizeAngle(frame.rot ?? 0);
  const zoom = clamp(frame.zoom, MIN_ZOOM, MAX_ZOOM);
  const a = (rot * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  // The frame's extent measured along the (rotated) photo's own axes.
  const needW = w * Math.abs(cos) + h * Math.abs(sin);
  const needH = w * Math.abs(sin) + h * Math.abs(cos);
  const k = Math.max(needW / img.width, needH / img.height) * zoom;
  const dw = img.width * k, dh = img.height * k;
  // Clamp the pan along the photo's axes, then turn it back to the story's.
  const mu = (dw - needW) / 2, mv = (dh - needH) / 2;
  const u = clamp(frame.ox * cos + frame.oy * sin, -mu, mu);
  const v = clamp(-frame.ox * sin + frame.oy * cos, -mv, mv);
  const ox = u * cos - v * sin, oy = u * sin + v * cos;
  return {
    frame: { zoom, ox, oy, rot, flip: !!frame.flip },
    draw: { cx: x + w / 2 + ox, cy: y + h / 2 + oy, w: dw, h: dh, angle: a, flip: !!frame.flip },
  };
}

/** The slot under a point in story coordinates, if any. */
export function slotAt(layout: ContentLayout, px: number, py: number): StorySlot | null {
  const R = storyRects(layout);
  for (const k of ['before', 'after'] as const) {
    const [x, y, w, h] = R[k];
    if (px >= x && px <= x + w && py >= y && py <= y + h) return k;
  }
  return null;
}

export function drawStory(g: CanvasRenderingContext2D, d: StoryData, f: StoryFonts) {
  const T = THEMES[d.background];
  const R = storyRects(d.layout);

  const txt = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left', track = 0) => {
    if (!s) return;
    g.save();
    g.font = font;
    g.fillStyle = color;
    g.textAlign = align;
    if (track) g.letterSpacing = `${track}px`;
    g.fillText(s, x, y);
    g.restore();
  };
  const fit = (s: string, maxW: number, font: string, track = 0) => {
    g.save();
    g.font = font;
    if (track) g.letterSpacing = `${track}px`;
    let t = s;
    while (g.measureText(t).width > maxW && t.length > 3) t = `${t.slice(0, -2)}…`;
    g.restore();
    return t;
  };
  const chip = (x: number, y: number, label: string, bg: string, fg: string) => {
    g.save();
    g.font = `500 26px ${f.mono}`;
    g.letterSpacing = '5px';
    const w = g.measureText(label).width + 52;
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(x, y, w, 58, 29);
    g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = fg;
    g.textBaseline = 'middle';
    g.fillText(label, x + 26, y + 30);
    g.restore();
  };
  const tooth = (cx: number, cy: number, sc: number, color: string) => {
    g.save();
    g.translate(cx, cy);
    g.scale(sc, sc);
    g.translate(-100, -113);
    g.strokeStyle = color;
    g.lineWidth = 5 / sc;
    g.lineJoin = 'round';
    g.stroke(
      new Path2D(
        'M60 20 C30 20 15 45 18 80 C21 110 35 126 42 160 C47 186 52 206 63 206 C75 206 77 170 86 152 C92 141 108 141 114 152 C123 170 125 206 137 206 C148 206 153 186 158 160 C165 126 179 110 182 80 C185 45 170 20 140 20 C120 20 112 33 100 33 C88 33 80 20 60 20 Z',
      ),
    );
    g.restore();
  };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = T.bg;
  g.fillRect(0, 0, STORY_W, STORY_H);

  // Header — kept below the story's own top bar.
  const badgeFont = `500 22px ${f.mono}`;
  let brandX = 60;
  if (d.logo && d.logo.width && d.logo.height) {
    const h = 64, w = Math.min(160, (h * d.logo.width) / d.logo.height);
    g.drawImage(d.logo, 60, 236, w, h);
    brandX = 60 + w + 16;
  }
  g.save();
  g.font = badgeFont;
  g.letterSpacing = '6px';
  const badgeW = d.badge ? g.measureText(d.badge).width + 32 : 0;
  g.restore();
  const brandMax = 1020 - badgeW - brandX;
  txt(fit(d.brandName.toUpperCase(), brandMax, `700 32px ${f.display}`, 2), brandX, 264, `700 32px ${f.display}`, T.fg, 'left', 2);
  txt(fit(d.brandSub.toUpperCase(), brandMax, `400 20px ${f.mono}`, 4), brandX, 298, `400 20px ${f.mono}`, T.muted, 'left', 4);
  txt(d.badge.toUpperCase(), 1020, 280, badgeFont, T.accent, 'right', 6);

  // Title and caption.
  const titleFont = `italic 400 104px ${f.serif}`;
  txt(fit(d.title || 'Nama tindakan', 960, titleFont), 60, 440, titleFont, T.fg);
  if (d.caption) txt(fit(d.caption, 960, `400 32px ${f.display}`), 60, 500, `400 32px ${f.display}`, T.muted);

  // Photos.
  const slots: [StorySlot, string, string, string][] = [
    ['before', 'SEBELUM', T.chipA, T.chipAfg],
    ['after', 'SESUDAH', T.chipB, T.chipBfg],
  ];
  for (const [k, label, cb, cf] of slots) {
    const [x, y, w, h] = R[k];
    const img = d.photos[k];
    g.save();
    g.beginPath();
    g.roundRect(x, y, w, h, 22);
    g.clip();
    g.fillStyle = T.slot;
    g.fillRect(x, y, w, h);
    if (img) {
      const p = placePhoto(img, d.frames[k], R[k]).draw;
      g.translate(p.cx, p.cy);
      g.rotate(p.angle);
      if (p.flip) g.scale(-1, 1);
      g.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
    } else {
      tooth(x + w / 2, y + h / 2 - 30, 0.9, T.slotInk);
      txt(k === 'before' ? 'Pilih foto sebelum' : 'Pilih foto sesudah', x + w / 2, y + h / 2 + 110, `400 30px ${f.display}`, T.slotInk, 'center');
    }
    g.restore();
    g.save();
    g.shadowColor = 'rgba(0,0,0,.18)';
    g.shadowBlur = 16;
    chip(x + 22, y + 22, label, cb, cf);
    g.restore();
  }

  // Arrow badge between the two photos.
  const a = R.before, b = R.after;
  const cx = d.layout === 'split' ? (a[0] + a[2] + b[0]) / 2 : STORY_W / 2;
  const cy = d.layout === 'split' ? a[1] + a[3] / 2 : (a[1] + a[3] + b[1]) / 2;
  g.save();
  g.fillStyle = T.bg;
  g.beginPath();
  g.arc(cx, cy, 46, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = T.accent;
  g.beginPath();
  g.arc(cx, cy, 36, 0, Math.PI * 2);
  g.fill();
  g.translate(cx, cy);
  if (d.layout !== 'split') g.rotate(Math.PI / 2);
  g.strokeStyle = T.bg;
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-12, 0);
  g.lineTo(12, 0);
  g.moveTo(3, -10);
  g.lineTo(13, 0);
  g.lineTo(3, 10);
  g.stroke();
  g.restore();

  // Footer.
  if (d.showDisclaimer) txt(DISCLAIMER, 60, 1612, `400 22px ${f.mono}`, T.muted);
  const handleFont = `italic 400 40px ${f.serif}`;
  g.save();
  g.font = handleFont;
  const handleW = d.handle ? g.measureText(d.handle).width + 32 : 0;
  g.restore();
  txt(fit(d.contactTitle, 960 - handleW, `500 30px ${f.display}`), 60, 1690, `500 30px ${f.display}`, T.fg);
  txt(fit(d.contactLine, 960, `400 28px ${f.mono}`), 60, 1736, `400 28px ${f.mono}`, T.muted);
  txt(d.handle, 1020, 1690, handleFont, T.accent, 'right');
}
