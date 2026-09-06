// FDI/ISO 3950 two-digit tooth numbering (also the Indonesian Permenkes
// 269/2008 odontogram standard, itself FDI-based): first digit = quadrant
// (1 upper-right, 2 upper-left, 3 lower-left, 4 lower-right), second digit
// = position from the midline (1 central incisor ... 8 third molar).
export const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_TEETH = [...UPPER_ROW, ...LOWER_ROW];

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
}

/**
 * Maps each of the 5 international charting surfaces (Mesial, Distal,
 * Vestibular, Lingual/Palatal, Oklusal/Insisal) onto a position in the
 * tooth's on-screen "windowpane" (top/bottom/left/right/center), given how
 * this chart lays teeth out left-to-right (see UPPER_ROW/LOWER_ROW above).
 * Mesial always faces the dental midline; vestibular always faces outward
 * (up for the upper arch, down for the lower arch) — the classic mirrored
 * layout where the two arches "face" each other across the chart's middle.
 */
export function getToothLayout(tooth: number): ToothLayout {
  const quadrant = Math.floor(tooth / 10);
  const pos = tooth % 10;
  const isUpper = quadrant === 1 || quadrant === 2;
  // In our left-to-right row order, quadrants 2 and 3 increase in number
  // moving away from the midline, so their mesial side is on the left;
  // quadrants 1 and 4 decrease moving away from the midline (drawn
  // right-to-left toward the midline), so their mesial side is on the right.
  const mesialOnLeft = quadrant === 2 || quadrant === 3;
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
  { value: 'caries', label: 'Karies' },
  { value: 'filling', label: 'Tumpatan' },
];

export const SURFACE_COLORS: Record<string, string> = {
  caries: '#FF4D4F',
  filling: '#4F7EF8',
};

export const WHOLE_CONDITION_OPTIONS = [
  { value: '', label: 'Normal' },
  { value: 'missing', label: 'Hilang / Dicabut' },
  { value: 'to_be_extracted', label: 'Indikasi Pencabutan' },
  { value: 'root_remnant', label: 'Sisa Akar' },
  { value: 'root_canal_treated', label: 'Sudah Perawatan Saluran Akar (RCT)' },
  { value: 'crown', label: 'Mahkota (Crown)' },
  { value: 'impacted', label: 'Impaksi' },
  { value: 'implant', label: 'Implan' },
  { value: 'unerupted', label: 'Belum Erupsi' },
];

export const WHOLE_CONDITION_BADGE: Record<string, { label: string; color: string }> = {
  root_remnant: { label: 'SA', color: '#8B5E34' },
  root_canal_treated: { label: 'RCT', color: '#1A2340' },
  crown: { label: 'MHK', color: '#4F7EF8' },
  impacted: { label: 'IMP', color: '#F5A623' },
  implant: { label: 'IPL', color: '#2DCB8A' },
  unerupted: { label: 'UE', color: '#A0AEC0' },
};

export function wholeConditionLabel(value?: string): string {
  return WHOLE_CONDITION_OPTIONS.find((o) => o.value === value)?.label || 'Normal';
}
