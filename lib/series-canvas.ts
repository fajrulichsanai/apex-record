import type { ContentBackground } from './contents';
import { DISCLAIMER, STORY_H, STORY_W, THEMES } from './story-canvas';
import type { StoryFonts } from './story-canvas';

export interface SeriesPhotoDraw {
  img: HTMLImageElement;
  caption: string;
  blurFace: boolean;
}

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
}

/** Cover-fits an image into a rect, no pan/zoom controls — series photos are laid out automatically. */
function coverFit(img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  return { dx: x + (w - dw) / 2, dy: y + (h - dh) / 2, dw, dh };
}

/**
 * A case series: 3+ photos stacked in equal rows (simplest layout that works
 * for any count — no manual framing per photo, unlike before/after).
 * `blurFace` applies a uniform blur over that whole photo (no face
 * detection — a deliberate simplification so patients can still be made
 * unidentifiable without needing one).
 */
export function drawSeriesStory(g: CanvasRenderingContext2D, d: SeriesStoryData, f: StoryFonts) {
  const T = THEMES[d.background];
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
  g.letterSpacing = '6px';
  const badgeW = d.badge ? g.measureText(d.badge).width + 32 : 0;
  g.restore();
  const brandMax = 1020 - badgeW - brandX;
  txt(fit(d.brandName.toUpperCase(), brandMax, `700 32px ${f.display}`, 2), brandX, 264, `700 32px ${f.display}`, T.fg, 'left', 2);
  txt(fit(d.brandSub.toUpperCase(), brandMax, `400 20px ${f.mono}`, 4), brandX, 298, `400 20px ${f.mono}`, T.muted, 'left', 4);
  txt(d.badge.toUpperCase(), 1020, 280, badgeFont, T.accent, 'right', 6);

  const titleFont = `italic 400 104px ${f.serif}`;
  txt(fit(d.title || 'Nama tindakan', 960, titleFont), 60, 440, titleFont, T.fg);
  if (d.caption) txt(fit(d.caption, 960, `400 32px ${f.display}`), 60, 500, `400 32px ${f.display}`, T.muted);

  // Photos — stacked rows, as many as there are.
  const top = 560, bot = 1560, x0 = 60, x1 = 1020, gap = 14;
  const count = Math.max(1, d.photos.length);
  const rowH = (bot - top - gap * (count - 1)) / count;
  d.photos.forEach((p, i) => {
    const y = top + i * (rowH + gap);
    g.save();
    g.beginPath();
    g.roundRect(x0, y, x1 - x0, rowH, 20);
    g.clip();
    g.fillStyle = T.slot;
    g.fillRect(x0, y, x1 - x0, rowH);
    if (p.img) {
      if (p.blurFace) g.filter = 'blur(28px)';
      const { dx, dy, dw, dh } = coverFit(p.img, x0, y, x1 - x0, rowH);
      g.drawImage(p.img, dx, dy, dw, dh);
      g.filter = 'none';
    }
    g.restore();
    if (p.caption) {
      g.save();
      g.shadowColor = 'rgba(0,0,0,.18)';
      g.shadowBlur = 16;
      const label = p.caption.toUpperCase();
      g.font = `500 24px ${f.mono}`;
      g.letterSpacing = '4px';
      const w = g.measureText(label).width + 44;
      g.fillStyle = T.chipA;
      g.beginPath();
      g.roundRect(x0 + 18, y + 18, w, 50, 25);
      g.fill();
      g.shadowColor = 'transparent';
      g.fillStyle = T.chipAfg;
      g.textBaseline = 'middle';
      g.fillText(label, x0 + 18 + 22, y + 18 + 26);
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
