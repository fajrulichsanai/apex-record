import { ToothData } from '@/lib/odontogram';

export interface QuadrantRow {
  left: string[];
  right: string[];
  leftLabel: string;
  rightLabel: string;
}

// Baris 1: permanen atas (Kuadran 1 | Kuadran 2)
// Baris 2: desidui atas   (Kuadran 5 | Kuadran 6)
// Baris 3: desidui bawah  (Kuadran 8 | Kuadran 7)
// Baris 4: permanen bawah (Kuadran 4 | Kuadran 3)
export const ODONTOGRAM_ROWS: QuadrantRow[] = [
  {
    left: ['18', '17', '16', '15', '14', '13', '12', '11'],
    right: ['21', '22', '23', '24', '25', '26', '27', '28'],
    leftLabel: 'Kuadran 1 (Kanan Atas Permanen)',
    rightLabel: 'Kuadran 2 (Kiri Atas Permanen)',
  },
  {
    left: ['55', '54', '53', '52', '51'],
    right: ['61', '62', '63', '64', '65'],
    leftLabel: 'Kuadran 5 (Kanan Atas Desidui)',
    rightLabel: 'Kuadran 6 (Kiri Atas Desidui)',
  },
  {
    left: ['85', '84', '83', '82', '81'],
    right: ['71', '72', '73', '74', '75'],
    leftLabel: 'Kuadran 8 (Kanan Bawah Desidui)',
    rightLabel: 'Kuadran 7 (Kiri Bawah Desidui)',
  },
  {
    left: ['48', '47', '46', '45', '44', '43', '42', '41'],
    right: ['31', '32', '33', '34', '35', '36', '37', '38'],
    leftLabel: 'Kuadran 4 (Kanan Bawah Permanen)',
    rightLabel: 'Kuadran 3 (Kiri Bawah Permanen)',
  },
];

export const ANTERIOR_IDS = new Set([
  '13', '12', '11', '21', '22', '23', '43', '42', '41', '31', '32', '33',
  '53', '52', '51', '63', '62', '61', '83', '82', '81', '73', '72', '71',
]);

export const DECIDUOUS_IDS = new Set([
  '51', '52', '53', '54', '55', '61', '62', '63', '64', '65',
  '71', '72', '73', '74', '75', '81', '82', '83', '84', '85',
]);

export const PERMANENT_IDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '31', '32', '33', '34', '35', '36', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48',
]);

export const TOOTH_NAMES: Record<string, string> = {
  '18': 'Molar 3 Kanan Atas', '17': 'Molar 2 Kanan Atas', '16': 'Molar 1 Kanan Atas',
  '15': 'Premolar 2 Kanan Atas', '14': 'Premolar 1 Kanan Atas', '13': 'Caninus Kanan Atas',
  '12': 'Insisivus Lateral Kanan Atas', '11': 'Insisivus Sentral Kanan Atas',
  '21': 'Insisivus Sentral Kiri Atas', '22': 'Insisivus Lateral Kiri Atas',
  '23': 'Caninus Kiri Atas', '24': 'Premolar 1 Kiri Atas', '25': 'Premolar 2 Kiri Atas',
  '26': 'Molar 1 Kiri Atas', '27': 'Molar 2 Kiri Atas', '28': 'Molar 3 Kiri Atas',
  '48': 'Molar 3 Kanan Bawah', '47': 'Molar 2 Kanan Bawah', '46': 'Molar 1 Kanan Bawah',
  '45': 'Premolar 2 Kanan Bawah', '44': 'Premolar 1 Kanan Bawah', '43': 'Caninus Kanan Bawah',
  '42': 'Insisivus Lateral Kanan Bawah', '41': 'Insisivus Sentral Kanan Bawah',
  '31': 'Insisivus Sentral Kiri Bawah', '32': 'Insisivus Lateral Kiri Bawah',
  '33': 'Caninus Kiri Bawah', '34': 'Premolar 1 Kiri Bawah', '35': 'Premolar 2 Kiri Bawah',
  '36': 'Molar 1 Kiri Bawah', '37': 'Molar 2 Kiri Bawah', '38': 'Molar 3 Kiri Bawah',
  '55': 'Molar 2 Kanan Atas (Susu)', '54': 'Molar 1 Kanan Atas (Susu)',
  '53': 'Caninus Kanan Atas (Susu)', '52': 'Insisivus Lateral Kanan Atas (Susu)',
  '51': 'Insisivus Sentral Kanan Atas (Susu)',
  '61': 'Insisivus Sentral Kiri Atas (Susu)', '62': 'Insisivus Lateral Kiri Atas (Susu)',
  '63': 'Caninus Kiri Atas (Susu)', '64': 'Molar 1 Kiri Atas (Susu)', '65': 'Molar 2 Kiri Atas (Susu)',
  '85': 'Molar 2 Kanan Bawah (Susu)', '84': 'Molar 1 Kanan Bawah (Susu)',
  '83': 'Caninus Kanan Bawah (Susu)', '82': 'Insisivus Lateral Kanan Bawah (Susu)',
  '81': 'Insisivus Sentral Kanan Bawah (Susu)',
  '71': 'Insisivus Sentral Kiri Bawah (Susu)', '72': 'Insisivus Lateral Kiri Bawah (Susu)',
  '73': 'Caninus Kiri Bawah (Susu)', '74': 'Molar 1 Kiri Bawah (Susu)', '75': 'Molar 2 Kiri Bawah (Susu)',
};

export function isUpperTooth(id: string): boolean {
  return ['1', '2', '5', '6'].includes(id[0]);
}

export function isAnteriorTooth(id: string): boolean {
  return ANTERIOR_IDS.has(id);
}

export function isDeciduousTooth(id: string): boolean {
  return DECIDUOUS_IDS.has(id);
}

/** Sisi kuadran gigi ditentukan oleh digit pertama FDI (1/5=kanan atas, 2/6=kiri atas, 3/7=kiri bawah, 4/8=kanan bawah). */
export function quadrantSide(id: string): 'upper-right' | 'upper-left' | 'lower-left' | 'lower-right' {
  switch (id[0]) {
    case '1':
    case '5':
      return 'upper-right';
    case '2':
    case '6':
      return 'upper-left';
    case '3':
    case '7':
      return 'lower-left';
    default:
      return 'lower-right';
  }
}

export function allToothIds(): string[] {
  return ODONTOGRAM_ROWS.flatMap((row) => [...row.left, ...row.right]);
}

export interface ToothIndex {
  decayed: number;
  missing: number;
  filled: number;
  total: number;
}

function hasCondition(data: ToothData, condition: string): boolean {
  const s = data.surfaces || {};
  return [s.buccal, s.palatal, s.mesial, s.distal, s.occlusal].some((v) => v === condition);
}

/** Menghitung indeks DMFT (gigi permanen) dan deft (gigi susu) dari data odontogram. */
export function computeIndices(teeth: Record<string, ToothData>) {
  const dmft: ToothIndex = { decayed: 0, missing: 0, filled: 0, total: 0 };
  const deft: ToothIndex = { decayed: 0, missing: 0, filled: 0, total: 0 };

  for (const id of allToothIds()) {
    const data = teeth[id];
    if (!data) continue;
    const target = PERMANENT_IDS.has(id) ? dmft : DECIDUOUS_IDS.has(id) ? deft : null;
    if (!target) continue;

    if (hasCondition(data, 'karies')) {
      target.decayed++;
    } else if (data.statusBelow === 'MISSING' || data.statusBelow === 'RRX') {
      target.missing++;
    } else if (hasCondition(data, 'komposit') || hasCondition(data, 'gic')) {
      target.filled++;
    }
  }

  dmft.total = dmft.decayed + dmft.missing + dmft.filled;
  deft.total = deft.decayed + deft.missing + deft.filled;

  return { dmft, deft };
}
