// FDI/ISO 3950 two-digit tooth numbering (also the Indonesian Permenkes
// 269/2008 odontogram standard, itself FDI-based): first digit = quadrant
// (1 upper-right, 2 upper-left, 3 lower-left, 4 lower-right permanent;
// 5 upper-right, 6 upper-left, 7 lower-left, 8 lower-right deciduous),
// second digit = position from the midline (1 central incisor ... 8 third
// molar permanent, ... 5 second molar deciduous).
export const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const UPPER_ROW_DECIDUOUS = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const LOWER_ROW_DECIDUOUS = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const PERMANENT_TEETH = [...UPPER_ROW, ...LOWER_ROW];
export const DECIDUOUS_TEETH = [...UPPER_ROW_DECIDUOUS, ...LOWER_ROW_DECIDUOUS];
export const ALL_TEETH = [...PERMANENT_TEETH, ...DECIDUOUS_TEETH];

export function isDeciduousTooth(tooth: number): boolean {
  const q = Math.floor(tooth / 10);
  return q === 5 || q === 6 || q === 7 || q === 8;
}

export type SurfaceKey = 'mesial' | 'distal' | 'vestibular' | 'lingual' | 'occlusal';

export interface ToothLayout {
  top: SurfaceKey;
  bottom: SurfaceKey;
  left: SurfaceKey;
  right: SurfaceKey;
  /** "Oklusal" for premolars/molars, "Insisal" for incisors/canines. */
  centerLabel: string;
  /** "Palatal" for upper teeth, "Lingual" for lower teeth. */
  lingualLabel: string;
  isUpper: boolean;
  isAnterior: boolean;
  isDeciduous: boolean;
}

/**
 * Maps each of the 5 international charting surfaces (Mesial, Distal,
 * Vestibular, Lingual/Palatal, Oklusal/Insisal) onto a position in the
 * tooth's on-screen "windowpane" (top/bottom/left/right/center), given how
 * this chart lays teeth out left-to-right. Mesial always faces the dental
 * midline; vestibular always faces outward (up for the upper arch, down
 * for the lower arch) — the classic mirrored layout where the two arches
 * "face" each other across the chart's middle. Deciduous quadrants (5-8)
 * mirror their permanent counterparts (5→1, 6→2, 7→3, 8→4).
 */
export function getToothLayout(tooth: number): ToothLayout {
  const quadrant = Math.floor(tooth / 10);
  const pos = tooth % 10;
  const deciduous = isDeciduousTooth(tooth);
  const normalizedQuadrant = deciduous ? quadrant - 4 : quadrant;
  const isUpper = normalizedQuadrant === 1 || normalizedQuadrant === 2;
  // In our left-to-right row order, quadrants 2 and 3 (or their deciduous
  // equivalents 6 and 7) increase in number moving away from the midline,
  // so their mesial side is on the left; quadrants 1 and 4 (5 and 8)
  // decrease moving away from the midline (drawn right-to-left toward the
  // midline), so their mesial side is on the right.
  const mesialOnLeft = normalizedQuadrant === 2 || normalizedQuadrant === 3;
  const isAnterior = pos >= 1 && pos <= 3;

  return {
    top: isUpper ? 'vestibular' : 'lingual',
    bottom: isUpper ? 'lingual' : 'vestibular',
    left: mesialOnLeft ? 'mesial' : 'distal',
    right: mesialOnLeft ? 'distal' : 'mesial',
    centerLabel: isAnterior ? 'Insisal' : 'Oklusal',
    lingualLabel: isUpper ? 'Palatal' : 'Lingual',
    isUpper,
    isAnterior,
    isDeciduous: deciduous,
  };
}

export const SURFACE_FIELD: Record<SurfaceKey, 'surfaceMesial' | 'surfaceDistal' | 'surfaceVestibular' | 'surfaceLingual' | 'surfaceOcclusal'> = {
  mesial: 'surfaceMesial',
  distal: 'surfaceDistal',
  vestibular: 'surfaceVestibular',
  lingual: 'surfaceLingual',
  occlusal: 'surfaceOcclusal',
};

export const SURFACE_OPTIONS = [
  { value: '', label: 'Sehat' },
  { value: 'karies', label: 'Karies' },
  { value: 'komposit', label: 'Komposit' },
  { value: 'gic', label: 'GIC' },
];

export const SURFACE_COLORS: Record<string, string> = {
  karies: '#1A2340',
  komposit: '#2DCB8A',
  gic: '#EC4899',
};

export interface QuadrantRow {
  left: number[];
  right: number[];
  leftLabel: string;
  rightLabel: string;
  /** Bridges (fixed prosthesis) only apply to permanent teeth; null = deciduous row, no bridge bar rendered. */
  bridgeRow: 'upper' | 'lower' | null;
}

/** Row order top-to-bottom: permanent upper, deciduous upper, deciduous lower, permanent lower — deciduous rows nested inside the permanent arch, matching how mixed dentition is charted. */
export const QUADRANT_ROWS: QuadrantRow[] = [
  {
    left: UPPER_ROW.slice(0, 8),
    right: UPPER_ROW.slice(8),
    leftLabel: 'Kuadran 1 (Kanan Atas Permanen)',
    rightLabel: 'Kuadran 2 (Kiri Atas Permanen)',
    bridgeRow: 'upper',
  },
  {
    left: UPPER_ROW_DECIDUOUS.slice(0, 5),
    right: UPPER_ROW_DECIDUOUS.slice(5),
    leftLabel: 'Kuadran 5 (Kanan Atas Desidui)',
    rightLabel: 'Kuadran 6 (Kiri Atas Desidui)',
    bridgeRow: null,
  },
  {
    left: LOWER_ROW_DECIDUOUS.slice(0, 5),
    right: LOWER_ROW_DECIDUOUS.slice(5),
    leftLabel: 'Kuadran 8 (Kanan Bawah Desidui)',
    rightLabel: 'Kuadran 7 (Kiri Bawah Desidui)',
    bridgeRow: null,
  },
  {
    left: LOWER_ROW.slice(0, 8),
    right: LOWER_ROW.slice(8),
    leftLabel: 'Kuadran 4 (Kanan Bawah Permanen)',
    rightLabel: 'Kuadran 3 (Kiri Bawah Permanen)',
    bridgeRow: 'lower',
  },
];

/** Annotation shown above the tooth. */
export const TEKS_ATAS_OPTIONS = [
  { value: '', label: 'Tidak ada' },
  { value: 'SOU', label: 'SOU — Sound (sehat)' },
  { value: 'ATT', label: 'ATT — Atrisi' },
  { value: 'PRE', label: 'PRE — Erupsi sebagian' },
  { value: 'UNE', label: 'UNE — Belum erupsi' },
  { value: 'ANO', label: 'ANO — Anomali' },
  { value: 'NON', label: 'NON — Non-vital' },
];

/** Annotation shown below the tooth. */
export const TEKS_BAWAH_OPTIONS = [
  { value: '', label: 'Tidak ada' },
  { value: 'MISSING', label: 'MISSING — Hilang/dicabut' },
  { value: 'CFR', label: 'CFR — Fraktur mahkota' },
  { value: 'RRX', label: 'RRX — Sisa akar' },
];

const TEKS_DESCRIPTIONS: Record<string, string> = {
  SOU: 'Sound - gigi dalam kondisi sehat sepenuhnya',
  ATT: 'Attrition - permukaan gigi aus',
  PRE: 'Partially erupted - gigi erupsi sebagian',
  UNE: 'Unerupted - gigi belum muncul',
  ANO: 'Anomaly - kelainan bentuk gigi',
  NON: 'Non-vital - gigi tidak vital',
  MISSING: 'Gigi hilang/dicabut atau kongenital tidak ada',
  CFR: 'Fraktur pada mahkota gigi',
  RRX: 'Sisa akar (akar tertinggal)',
};

export function teksDescription(code?: string): string {
  return (code && TEKS_DESCRIPTIONS[code]) || '';
}

/** Badge color for teks_atas/teks_bawah codes, mirroring the reference chart's legend. */
export function teksBadgeColor(code?: string): string {
  switch (code) {
    case 'SOU':
      return '#34A853';
    case 'MISSING':
    case 'RRX':
    case 'CFR':
      return '#EA4335';
    case 'NON':
    case 'ANO':
      return '#FBBC04';
    default:
      return '#4285F4';
  }
}

/** Decayed/Missing/Filled tooth counts — DMFT (permanent) and deft (deciduous). */
export interface DentalIndex {
  decayed: number;
  missingOrExtracted: number;
  filled: number;
  total: number;
}

function hasSurfaceValue(condition: { surfaceMesial?: string; surfaceDistal?: string; surfaceVestibular?: string; surfaceLingual?: string; surfaceOcclusal?: string } | undefined, value: string): boolean {
  if (!condition) return false;
  return (
    condition.surfaceMesial === value ||
    condition.surfaceDistal === value ||
    condition.surfaceVestibular === value ||
    condition.surfaceLingual === value ||
    condition.surfaceOcclusal === value
  );
}

export function calculateDentalIndex(
  teeth: number[],
  conditionOf: (tooth: number) => { teksBawah?: string; surfaceMesial?: string; surfaceDistal?: string; surfaceVestibular?: string; surfaceLingual?: string; surfaceOcclusal?: string } | undefined,
): DentalIndex {
  let decayed = 0;
  let missingOrExtracted = 0;
  let filled = 0;

  for (const tooth of teeth) {
    const condition = conditionOf(tooth);
    if (condition?.teksBawah === 'MISSING') {
      missingOrExtracted++;
      continue;
    }
    if (hasSurfaceValue(condition, 'komposit') || hasSurfaceValue(condition, 'gic')) {
      filled++;
      continue;
    }
    if (hasSurfaceValue(condition, 'karies')) {
      decayed++;
    }
  }

  return { decayed, missingOrExtracted, filled, total: decayed + missingOrExtracted + filled };
}
