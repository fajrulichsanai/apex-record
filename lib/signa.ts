/**
 * Aturan pakai (signa) resep: pilihan per jenis sediaan → tulisan resep
 * (latin, mis. "S 3 dd tab I p.c.") + kalimat untuk pasien. Bagian
 * terstruktur (frekuensi, jumlah, satuan, waktu) dikirim ke SATUSEHAT
 * sebagai MedicationRequest.dosageInstruction.
 */

export type SignaUnit = 'TAB' | 'CAP' | 'mL' | 'DROP' | 'APPL' | 'PUFF' | 'SUPP';
export type SignaWhen = 'AC' | 'PC' | 'C' | 'HS';
export type RouteCode = 'O' | 'P' | 'R' | 'V' | 'N' | 'SL' | 'TD';

export interface Signa {
  code?: string | null;
  timesPerDay?: number | null;
  amount?: number | null;
  unit?: SignaUnit | null;
  when?: SignaWhen | null;
  prn?: boolean;
  route?: RouteCode | null;
  latin: string;
  text: string;
}

type Kind = 'solid' | 'liquid' | 'topical' | 'gargle' | 'drops' | 'supp' | 'inhaler' | 'other';

/** Bentuk sediaan yang umum di klinik — menentukan pilihan aturan pakai */
export const DOSAGE_FORMS: { name: string; kind: Kind; abbr: string; unit: SignaUnit | null; unitText: string }[] = [
  { name: 'Tablet', kind: 'solid', abbr: 'tab', unit: 'TAB', unitText: 'tablet' },
  { name: 'Kaplet', kind: 'solid', abbr: 'cplt', unit: 'TAB', unitText: 'kaplet' },
  { name: 'Kapsul', kind: 'solid', abbr: 'caps', unit: 'CAP', unitText: 'kapsul' },
  { name: 'Tablet Kunyah', kind: 'solid', abbr: 'tab', unit: 'TAB', unitText: 'tablet (dikunyah)' },
  { name: 'Sirup', kind: 'liquid', abbr: 'cth', unit: 'mL', unitText: 'sendok takar' },
  { name: 'Suspensi', kind: 'liquid', abbr: 'cth', unit: 'mL', unitText: 'sendok takar' },
  { name: 'Salep', kind: 'topical', abbr: 'ung', unit: null, unitText: '' },
  { name: 'Krim', kind: 'topical', abbr: 'cr', unit: null, unitText: '' },
  { name: 'Gel', kind: 'topical', abbr: 'gel', unit: null, unitText: '' },
  { name: 'Obat Kumur', kind: 'gargle', abbr: 'garg', unit: 'mL', unitText: '' },
  { name: 'Tetes', kind: 'drops', abbr: 'gtt', unit: 'DROP', unitText: 'tetes' },
  { name: 'Supositoria', kind: 'supp', abbr: 'supp', unit: 'SUPP', unitText: 'supositoria' },
  { name: 'Inhaler', kind: 'inhaler', abbr: 'puff', unit: 'PUFF', unitText: 'semprot' },
  { name: 'Lainnya', kind: 'other', abbr: '', unit: null, unitText: '' },
];

export function formOf(name: string | null | undefined) {
  return DOSAGE_FORMS.find((f) => f.name === name) ?? null;
}

/** Tebak bentuk sediaan dari nama bentuk sediaan KFA (mis. "Kapsul", "Tablet Salut Selaput") */
export function guessDosageForm(kfaFormName?: string | null): string | null {
  const n = (kfaFormName ?? '').toLowerCase();
  if (!n) return null;
  if (n.includes('kunyah')) return 'Tablet Kunyah';
  if (n.includes('kaplet')) return 'Kaplet';
  if (n.includes('kapsul')) return 'Kapsul';
  if (n.includes('tablet')) return 'Tablet';
  if (n.includes('sirup') || n.includes('eliksir')) return 'Sirup';
  if (n.includes('suspensi') || n.includes('emulsi')) return 'Suspensi';
  if (n.includes('salep')) return 'Salep';
  if (n.includes('krim')) return 'Krim';
  if (n.includes('gel')) return 'Gel';
  if (n.includes('kumur')) return 'Obat Kumur';
  if (n.includes('tetes')) return 'Tetes';
  if (n.includes('supositoria')) return 'Supositoria';
  if (n.includes('inhal') || n.includes('aerosol')) return 'Inhaler';
  return 'Lainnya';
}

export interface SignaOption {
  code: string;
  label: string;
  timesPerDay: number | null;
  amount: number | null;
  prn?: boolean;
}

/** Pilihan aturan pakai per jenis sediaan */
const OPTIONS: Record<Kind, SignaOption[]> = {
  solid: [
    { code: '1x1', label: '1 x sehari 1', timesPerDay: 1, amount: 1 },
    { code: '2x1', label: '2 x sehari 1', timesPerDay: 2, amount: 1 },
    { code: '3x1', label: '3 x sehari 1', timesPerDay: 3, amount: 1 },
    { code: '4x1', label: '4 x sehari 1', timesPerDay: 4, amount: 1 },
    { code: '3x½', label: '3 x sehari ½', timesPerDay: 3, amount: 0.5 },
    { code: '2x2', label: '2 x sehari 2', timesPerDay: 2, amount: 2 },
    { code: 'prn3x1', label: 'Bila perlu (nyeri), maks. 3 x sehari 1', timesPerDay: 3, amount: 1, prn: true },
  ],
  liquid: [
    { code: '3x1cth', label: '3 x sehari 1 sendok teh (5 mL)', timesPerDay: 3, amount: 5 },
    { code: '3x½cth', label: '3 x sehari ½ sendok teh (2,5 mL)', timesPerDay: 3, amount: 2.5 },
    { code: '2x1cth', label: '2 x sehari 1 sendok teh (5 mL)', timesPerDay: 2, amount: 5 },
    { code: '3x1C', label: '3 x sehari 1 sendok makan (15 mL)', timesPerDay: 3, amount: 15 },
    { code: 'prn3x1cth', label: 'Bila perlu, maks. 3 x sehari 1 sendok teh', timesPerDay: 3, amount: 5, prn: true },
  ],
  topical: [
    { code: 'ue1', label: 'Oleskan tipis 1 x sehari', timesPerDay: 1, amount: null },
    { code: 'ue2', label: 'Oleskan tipis 2 x sehari', timesPerDay: 2, amount: null },
    { code: 'ue3', label: 'Oleskan tipis 3 x sehari', timesPerDay: 3, amount: null },
    { code: 'uePrn', label: 'Oleskan bila perlu', timesPerDay: null, amount: null, prn: true },
  ],
  gargle: [
    { code: 'garg2', label: 'Kumur 2 x sehari (10 mL, 30 detik)', timesPerDay: 2, amount: 10 },
    { code: 'garg3', label: 'Kumur 3 x sehari (10 mL, 30 detik)', timesPerDay: 3, amount: 10 },
  ],
  drops: [
    { code: '3x1gtt', label: '3 x sehari 1 tetes', timesPerDay: 3, amount: 1 },
    { code: '3x2gtt', label: '3 x sehari 2 tetes', timesPerDay: 3, amount: 2 },
    { code: '4x1gtt', label: '4 x sehari 1 tetes', timesPerDay: 4, amount: 1 },
  ],
  supp: [
    { code: '1x1supp', label: '1 x sehari 1', timesPerDay: 1, amount: 1 },
    { code: '2x1supp', label: '2 x sehari 1', timesPerDay: 2, amount: 1 },
    { code: 'prnSupp', label: 'Bila perlu 1', timesPerDay: null, amount: 1, prn: true },
  ],
  inhaler: [
    { code: '2x2puff', label: '2 x sehari 2 semprot', timesPerDay: 2, amount: 2 },
    { code: 'prn2puff', label: 'Bila sesak 2 semprot', timesPerDay: null, amount: 2, prn: true },
  ],
  other: [
    { code: '1xo', label: '1 x sehari', timesPerDay: 1, amount: null },
    { code: '2xo', label: '2 x sehari', timesPerDay: 2, amount: null },
    { code: '3xo', label: '3 x sehari', timesPerDay: 3, amount: null },
  ],
};

export function signaOptions(formName: string | null | undefined): SignaOption[] {
  return OPTIONS[formOf(formName)?.kind ?? 'solid'];
}

/** Waktu minum — hanya untuk obat yang diminum */
export const WHEN_OPTIONS: { code: SignaWhen; label: string; latin: string }[] = [
  { code: 'PC', label: 'Sesudah makan', latin: 'p.c.' },
  { code: 'AC', label: 'Sebelum makan', latin: 'a.c.' },
  { code: 'C', label: 'Bersama makan', latin: 'd.c.' },
  { code: 'HS', label: 'Sebelum tidur', latin: 'h.s.' },
];

export function usesWhen(formName: string | null | undefined) {
  const kind = formOf(formName)?.kind ?? 'solid';
  return kind === 'solid' || kind === 'liquid';
}

/** ½ → "½", 1 → "I", 2 → "II" (jumlah per kali pakai ditulis romawi) */
function romanAmount(n: number) {
  if (n === 0.5) return '½';
  if (n === 2.5) return 'II½';
  return toRoman(n);
}

function amountText(n: number) {
  return n === 0.5 ? '½' : String(n).replace('.', ',');
}

/** Ubah pilihan menjadi signa lengkap (tulisan resep + kalimat pasien + data terstruktur) */
export function buildSigna(formName: string | null | undefined, code: string, when: SignaWhen | null): Signa | null {
  const form = formOf(formName) ?? DOSAGE_FORMS[0];
  const opt = signaOptions(form.name).find((o) => o.code === code);
  if (!opt) return null;
  const w = usesWhen(form.name) ? WHEN_OPTIONS.find((x) => x.code === when) ?? null : null;
  const prn = !!opt.prn;
  const n = opt.timesPerDay;
  let latin = '';
  let text = '';

  switch (form.kind) {
    case 'solid':
    case 'supp':
    case 'drops':
    case 'inhaler': {
      const amt = opt.amount ?? 1;
      const freq = n ? `${n} dd ` : '';
      latin = `S ${prn ? 'p.r.n. ' : ''}${freq}${form.abbr} ${romanAmount(amt)}`;
      text = `${prn ? 'Bila perlu' + (n ? `, maks. ${n} x sehari` : '') : `${n} x sehari`} ${amountText(amt)} ${form.unitText}`;
      break;
    }
    case 'liquid': {
      const ml = opt.amount ?? 5;
      const spoon = ml >= 15 ? { abbr: 'C', n: ml / 15, t: 'sendok makan' } : { abbr: 'cth', n: ml / 5, t: 'sendok teh' };
      latin = `S ${prn ? 'p.r.n. ' : ''}${n} dd ${spoon.abbr} ${romanAmount(spoon.n)}`;
      text = `${prn ? `Bila perlu, maks. ${n} x sehari` : `${n} x sehari`} ${amountText(spoon.n)} ${spoon.t} (${String(ml).replace('.', ',')} mL)`;
      break;
    }
    case 'topical':
      latin = `S u.e.${n ? ` ${n} dd` : ' p.r.n.'}`;
      text = n ? `Oleskan tipis ${n} x sehari pada bagian yang sakit` : 'Oleskan tipis bila perlu pada bagian yang sakit';
      break;
    case 'gargle':
      latin = `S garg. ${n} dd`;
      text = `Kumur ${n} x sehari (${opt.amount} mL, 30 detik), jangan ditelan`;
      break;
    default:
      latin = `S ${n} dd`;
      text = `${n} x sehari`;
  }
  if (w) {
    latin += ` ${w.latin}`;
    text += ` ${w.label.toLowerCase()}`;
  }

  return {
    code: `${form.name}:${opt.code}`,
    timesPerDay: n,
    amount: form.kind === 'topical' || form.kind === 'other' ? null : opt.amount,
    unit: form.kind === 'topical' || form.kind === 'other' ? null : form.unit,
    when: w?.code ?? null,
    prn,
    route: form.kind === 'solid' || form.kind === 'liquid' ? 'O' : form.kind === 'supp' ? 'R' : null,
    latin,
    text,
  };
}

/** Angka romawi untuk numero (No. XV) */
export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 3999) return String(value);
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = value;
  let out = '';
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Baris obat resep: nama + dosis + sediaan, tanpa mengulang yang sudah ada di nama */
export function rxLine(name: string, dosage?: string | null, form?: string | null): string {
  const lower = name.toLowerCase().replace(/\s+/g, ' ');
  const extra = [dosage, form]
    .map((p) => p?.trim())
    .filter((p): p is string => !!p && !lower.includes(p.toLowerCase().replace(/\s+/g, ' ')));
  return [name.trim(), ...extra].join(' ');
}
