/**
 * Tata letak & gaya layout "series" (3+ foto). Murni (tanpa canvas) supaya
 * mudah diuji; series-canvas.ts hanya menggambar hasilnya.
 */

export type SeriesArrangement = 'rows' | 'columns' | 'grid' | 'hero' | 'heroBottom' | 'heroLeft' | 'heroRight';
export type SeriesCaptionStyle = 'chip' | 'bar' | 'none';
export type SeriesCaptionPosition = 'top' | 'bottom';

/** Pengaturan yang disimpan di settings.series (semua opsional). */
export interface SeriesStyle {
  arrangement?: SeriesArrangement;
  gap?: number;
  radius?: number;
  captionStyle?: SeriesCaptionStyle;
  captionPosition?: SeriesCaptionPosition;
  showNumbers?: boolean;
  /** Jumlah kolom untuk susunan Kisi: 0 = otomatis, 1–4 = tetap. */
  cols?: number;
  /** Porsi foto besar (30–80 persen) untuk susunan "Satu besar". */
  split?: number;
  /** #rrggbb; kosong = ikut tema Terang/Navy. */
  bgColor?: string;
  accentColor?: string;
}

export type ResolvedSeriesStyle = Required<SeriesStyle>;

/** Sama dengan tampilan sebelum fitur ini ada. */
export const DEFAULT_SERIES_STYLE: ResolvedSeriesStyle = {
  arrangement: 'rows',
  gap: 14,
  radius: 20,
  captionStyle: 'chip',
  captionPosition: 'top',
  showNumbers: false,
  cols: 0,
  split: 58,
  bgColor: '',
  accentColor: '',
};

export const SERIES_ARRANGEMENTS: { value: SeriesArrangement; label: string }[] = [
  { value: 'rows', label: 'Baris' },
  { value: 'columns', label: 'Kolom' },
  { value: 'grid', label: 'Kisi' },
  { value: 'hero', label: 'Besar atas' },
  { value: 'heroBottom', label: 'Besar bawah' },
  { value: 'heroLeft', label: 'Besar kiri' },
  { value: 'heroRight', label: 'Besar kanan' },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Nilai di luar jangkauan / tak dikenal jatuh ke bawaan, bukan error. */
export function resolveSeriesStyle(s?: SeriesStyle | null): ResolvedSeriesStyle {
  const d = DEFAULT_SERIES_STYLE;
  const x = s ?? {};
  return {
    arrangement: SERIES_ARRANGEMENTS.some((a) => a.value === x.arrangement) ? x.arrangement! : d.arrangement,
    gap: Number.isFinite(x.gap) ? clamp(Math.round(x.gap as number), 0, 48) : d.gap,
    radius: Number.isFinite(x.radius) ? clamp(Math.round(x.radius as number), 0, 80) : d.radius,
    captionStyle: x.captionStyle === 'bar' || x.captionStyle === 'none' || x.captionStyle === 'chip' ? x.captionStyle : d.captionStyle,
    captionPosition: x.captionPosition === 'bottom' ? 'bottom' : d.captionPosition,
    showNumbers: x.showNumbers === true,
    split: Number.isFinite(x.split) ? clamp(Math.round(x.split as number), 30, 80) : d.split,
    cols: Number.isFinite(x.cols) ? clamp(Math.round(x.cols as number), 0, 4) : d.cols,
    bgColor: x.bgColor && HEX.test(x.bgColor) ? x.bgColor.toLowerCase() : '',
    accentColor: x.accentColor && HEX.test(x.accentColor) ? x.accentColor.toLowerCase() : '',
  };
}

/** Kolom otomatis untuk Kisi, dipakai juga untuk menampilkan nilai bawaan di pengaturan. */
export const autoGridCols = (n: number) => (n <= 1 ? 1 : n <= 4 ? 2 : 3);

export type Rect = [x: number, y: number, w: number, h: number];
export interface Area { x: number; y: number; w: number; h: number }

/** Bagi `total` menjadi n bagian sama besar dengan jarak `gap`. */
function split(start: number, total: number, n: number, gap: number): Array<[number, number]> {
  const size = (total - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => [start + i * (size + gap), size]);
}

/** Kisi `cols` kolom; baris terakhir yang tak penuh melebar mengisi lebar penuh. */
function gridRects(count: number, cols: number, a: Area, gap: number): Rect[] {
  const rows = Math.ceil(count / cols);
  const ys = split(a.y, a.h, rows, gap);
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, count - r * cols);
    const xs = split(a.x, a.w, inRow, gap);
    for (const [x, w] of xs) out.push([x, ys[r][0], w, ys[r][1]]);
  }
  return out;
}

/** Posisi tiap foto (urut sesuai daftar) di dalam `area`. */
export function seriesRects(count: number, style: ResolvedSeriesStyle, area: Area): Rect[] {
  const n = Math.max(1, Math.floor(count));
  const { gap } = style;
  switch (style.arrangement) {
    case 'columns':
      return split(area.x, area.w, n, gap).map(([x, w]) => [x, area.y, w, area.h]);
    case 'grid':
      return gridRects(n, style.cols > 0 ? Math.min(style.cols, n) : n <= 1 ? 1 : n <= 4 ? 2 : 3, area, gap);
    case 'hero':
    case 'heroBottom': {
      if (n === 1) return [[area.x, area.y, area.w, area.h]];
      const heroH = Math.round((area.h - gap) * (style.split / 100));
      const restH = area.h - heroH - gap;
      const rest = n - 1;
      const bottom = style.arrangement === 'heroBottom';
      const heroY = bottom ? area.y + restH + gap : area.y;
      const restArea: Area = { x: area.x, y: bottom ? area.y : area.y + heroH + gap, w: area.w, h: restH };
      return [[area.x, heroY, area.w, heroH], ...gridRects(rest, Math.min(rest, 3), restArea, gap)];
    }
    case 'heroLeft':
    case 'heroRight': {
      if (n === 1) return [[area.x, area.y, area.w, area.h]];
      const heroW = Math.round((area.w - gap) * (style.split / 100));
      const restW = area.w - heroW - gap;
      const right = style.arrangement === 'heroRight';
      const heroX = right ? area.x + restW + gap : area.x;
      const restArea: Area = { x: right ? area.x : area.x + heroW + gap, y: area.y, w: restW, h: area.h };
      return [[heroX, area.y, heroW, area.h], ...gridRects(n - 1, 1, restArea, gap)];
    }
    case 'rows':
    default:
      return split(area.y, area.h, n, gap).map(([y, h]) => [area.x, y, area.w, h]);
  }
}

// ── Warna ────────────────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Warna teks yang terbaca di atas `hex` (kontras WCAG sederhana). */
export function readableOn(hex: string): string {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#16213f' : '#ffffff';
}

/** Campur dua warna hex; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = rgb(a), cb = rgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
