import type { ContentBackground, ContentPhotoFrame } from './contents';
import { DEFAULT_FRAME, DISCLAIMER, STORY_H, STORY_W, THEMES, placePhoto, roundRectPath } from './story-canvas';
import type { StoryFonts } from './story-canvas';
import { mixHex, readableOn, resolveSeriesStyle, seriesRects, type SeriesStyle } from './series-layout';

/** See story-canvas.ts: Safari before 17.4 doesn't implement ctx.letterSpacing. */
function setTracking(g: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in g) g.letterSpacing = `${px}px`;
}

export interface SeriesPhotoDraw {
  img: HTMLImageElement;
  caption: string;
  blurFace: boolean;
  /** Posisi/zoom/putar di dalam sel; kosong = penuh (cover) di tengah. */
  frame?: ContentPhotoFrame | null;
}

/** Area foto di story; dipakai juga untuk hit-test di editor. */
export const SERIES_AREA = { x: 60, y: 560, w: 960, h: 1000 };

export interface SeriesStoryData {
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
  photos: SeriesPhotoDraw[];
  /** Gaya yang diatur pengguna; kosong = bawaan. */
  style?: SeriesStyle | null;
}

/**
 * A case series: 3+ photos placed automatically by the chosen arrangement
 * (rows / columns / grid / one big + small); each photo can still be
 * zoomed, moved, rotated and mirrored inside its cell via `frame`. Spacing, corner radius, caption style, numbering and
 * colours come from `d.style`.
 * `blurFace` applies a uniform blur over that whole photo (no face
 * detection — a deliberate simplification so patients can still be made
 * unidentifiable without needing one).
 */
export function drawSeriesStory(g: CanvasRenderingContext2D, d: SeriesStoryData, f: StoryFonts) {
  const st = resolveSeriesStyle(d.style);
  const base = THEMES[d.background];
  // Warna kustom menimpa tema; teks/slot diturunkan supaya tetap terbaca.
  const T = st.bgColor
    ? {
        ...base,
        bg: st.bgColor,
        fg: readableOn(st.bgColor),
        muted: mixHex(st.bgColor, readableOn(st.bgColor), 0.62),
        slot: mixHex(st.bgColor, readableOn(st.bgColor), 0.1),
        accent: st.accentColor || readableOn(st.bgColor),
        chipA: st.accentColor || base.chipA,
        chipAfg: st.accentColor ? readableOn(st.accentColor) : base.chipAfg,
      }
    : st.accentColor
      ? { ...base, accent: st.accentColor, chipA: st.accentColor, chipAfg: readableOn(st.accentColor) }
      : base;
  const txt = (s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left', track = 0) => {
    if (!s) return;
    g.save();
    g.font = font;
    g.fillStyle = color;
    g.textAlign = align;
    if (track) setTracking(g, track);
    g.fillText(s, x, y);
    g.restore();
  };
  const fit = (s: string, maxW: number, font: string, track = 0) => {
    g.save();
    g.font = font;
    if (track) setTracking(g, track);
    let t = s;
    while (g.measureText(t).width > maxW && t.length > 3) t = `${t.slice(0, -2)}…`;
    g.restore();
    return t;
  };

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = T.bg;
  g.fillRect(0, 0, STORY_W, STORY_H);

  // Header.
  const badgeFont = `500 22px ${f.mono}`;
  let brandX = 60;
  if (d.logo && d.logo.width && d.logo.height) {
    const h = 64, w = Math.min(160, (h * d.logo.width) / d.logo.height);
    g.drawImage(d.logo, 60, 236, w, h);
    brandX = 60 + w + 16;
  }
  g.save();
  g.font = badgeFont;
  setTracking(g, 6);
  const badgeW = d.badge ? g.measureText(d.badge).width + 32 : 0;
  g.restore();
  const brandMax = 1020 - badgeW - brandX;
  txt(fit(d.brandName.toUpperCase(), brandMax, `700 32px ${f.display}`, 2), brandX, 264, `700 32px ${f.display}`, T.fg, 'left', 2);
  txt(fit(d.brandSub.toUpperCase(), brandMax, `400 20px ${f.mono}`, 4), brandX, 298, `400 20px ${f.mono}`, T.muted, 'left', 4);
  txt(d.badge.toUpperCase(), 1020, 280, badgeFont, T.accent, 'right', 6);

  const titleFont = `italic 400 104px ${f.serif}`;
  txt(fit(d.title || 'Nama tindakan', 960, titleFont), 60, 440, titleFont, T.fg);
  if (d.caption) txt(fit(d.caption, 960, `400 32px ${f.display}`), 60, 500, `400 32px ${f.display}`, T.muted);

  // Photos — placed by the chosen arrangement, as many as there are.
  const rects = seriesRects(d.photos.length, st, SERIES_AREA);
  d.photos.forEach((p, i) => {
    const [x, y, w, h] = rects[i];
    const radius = Math.min(st.radius, w / 2, h / 2);
    g.save();
    g.beginPath();
    roundRectPath(g, x, y, w, h, radius);
    g.clip();
    g.fillStyle = T.slot;
    g.fillRect(x, y, w, h);
    if (p.img) {
      g.save();
      if (p.blurFace) g.filter = 'blur(28px)';
      const placed = placePhoto(p.img, p.frame ?? DEFAULT_FRAME, [x, y, w, h]).draw;
      g.translate(placed.cx, placed.cy);
      g.rotate(placed.angle);
      if (placed.flip) g.scale(-1, 1);
      g.drawImage(p.img, -placed.w / 2, -placed.h / 2, placed.w, placed.h);
      g.restore();
    }
    // Keterangan model "bar": pita selebar foto, di dalam klip sudut foto.
    const label = p.caption.trim();
    if (label && st.captionStyle === 'bar') {
      const barH = 64;
      const by = st.captionPosition === 'bottom' ? y + h - barH : y;
      g.fillStyle = 'rgba(8,16,40,.62)';
      g.fillRect(x, by, w, barH);
      g.font = `500 26px ${f.display}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(fit(label, w - 40, `500 26px ${f.display}`), x + w / 2, by + barH / 2 + 1);
    }
    g.restore();

    const pad = Math.max(10, Math.min(18, st.radius));
    const atBottom = st.captionPosition === 'bottom';
    // Sel sempit (mis. 4 kolom): label lebih kecil dan ditaruh di bawah nomor.
    const narrow = w < 300;
    const numD = narrow ? 44 : 54;
    const chipH = narrow ? 40 : 50;
    const chipPx = narrow ? 19 : 24;
    const chipTrack = narrow ? 1 : 4;
    const stack = narrow && st.showNumbers && label !== '' && st.captionStyle === 'chip';
    const blockH = stack ? numD + 8 + chipH : Math.max(st.showNumbers ? numD : 0, label && st.captionStyle === 'chip' ? chipH : 0);
    const blockY = atBottom ? y + h - pad - blockH : y + pad;
    let chipX = x + pad;
    let chipY = blockY + (blockH - chipH) / 2;
    if (st.showNumbers) {
      const cy = stack ? blockY : blockY + (blockH - numD) / 2;
      g.save();
      g.shadowColor = 'rgba(0,0,0,.2)';
      g.shadowBlur = 14;
      g.fillStyle = T.accent;
      g.beginPath();
      g.arc(chipX + numD / 2, cy + numD / 2, numD / 2, 0, Math.PI * 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = readableOn(T.accent);
      g.font = `700 ${narrow ? 24 : 28}px ${f.display}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), chipX + numD / 2, cy + numD / 2 + 1);
      g.restore();
      if (stack) chipY = blockY + numD + 8;
      else chipX += numD + 10;
    }
    if (label && st.captionStyle === 'chip') {
      g.save();
      g.shadowColor = 'rgba(0,0,0,.18)';
      g.shadowBlur = 16;
      const labelFont = `500 ${chipPx}px ${f.mono}`;
      const padX = narrow ? 14 : 22;
      const text = fit(label.toUpperCase(), Math.max(40, x + w - pad - chipX - padX * 2), labelFont, chipTrack);
      g.font = labelFont;
      setTracking(g, chipTrack);
      const cw = g.measureText(text).width + padX * 2;
      g.fillStyle = T.chipA;
      g.beginPath();
      roundRectPath(g, chipX, chipY, cw, chipH, chipH / 2);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = T.chipAfg;
      g.textBaseline = 'middle';
      g.fillText(text, chipX + padX, chipY + chipH / 2 + 1);
      g.restore();
    }
  });

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
