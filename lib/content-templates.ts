/**
 * Treatment templates for Konten, plus the tooth/region details a story's
 * caption is built from — so a clinic taps a template and a few teeth
 * instead of typing the same text for every before–after story.
 */

export interface ContentTemplate {
  id: string;
  /** Story headline (max 64). */
  title: string;
  /** One line shown on the template card. */
  desc: string;
  /** Complaints/diagnoses offered as one-tap chips; the first is preselected. */
  conditions: string[];
  /** Typical number of visits, or null when it doesn't fit (e.g. braces). */
  visits: number | null;
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  { id: 'veneer-komposit', title: 'Veneer komposit', desc: 'Merapikan bentuk & warna gigi depan', conditions: ['Gigi kusam', 'Bentuk gigi tidak rata', 'Celah antar gigi'], visits: 1 },
  { id: 'veneer-porselen', title: 'Veneer porselen', desc: 'Lapisan porselen tipis, tahan lama', conditions: ['Perubahan warna gigi', 'Bentuk gigi tidak ideal'], visits: 2 },
  { id: 'bleaching', title: 'Bleaching', desc: 'Memutihkan gigi', conditions: ['Gigi kuning', 'Noda pada gigi'], visits: 1 },
  { id: 'scaling', title: 'Scaling & polishing', desc: 'Membersihkan karang & noda', conditions: ['Karang gigi', 'Noda kopi & rokok', 'Gusi berdarah'], visits: 1 },
  { id: 'tambal-estetik', title: 'Tambal estetik', desc: 'Tambalan sewarna gigi', conditions: ['Gigi berlubang', 'Tambalan lama rusak', 'Gigi berlubang di sela gigi'], visits: 1 },
  { id: 'diastema', title: 'Penutupan diastema', desc: 'Menutup celah gigi depan', conditions: ['Celah antar gigi depan'], visits: 1 },
  { id: 'gigi-patah', title: 'Perbaikan gigi patah', desc: 'Mengembalikan bentuk gigi', conditions: ['Gigi patah karena benturan', 'Gigi gompal'], visits: 1 },
  { id: 'psa', title: 'Perawatan saluran akar', desc: 'Menyelamatkan gigi yang terinfeksi', conditions: ['Gigi berlubang dalam', 'Infeksi saraf gigi', 'Gigi menghitam'], visits: 3 },
  { id: 'crown', title: 'Mahkota gigi (crown)', desc: 'Melindungi & memperbaiki gigi', conditions: ['Gigi rapuh setelah PSA', 'Gigi patah besar'], visits: 2 },
  { id: 'gigi-tiruan', title: 'Gigi tiruan', desc: 'Mengganti gigi yang hilang', conditions: ['Gigi hilang', 'Gigi tiruan lama longgar'], visits: 3 },
  { id: 'implan', title: 'Implan gigi', desc: 'Akar gigi tiruan permanen', conditions: ['Gigi hilang'], visits: 3 },
  { id: 'ortodonti', title: 'Ortodonti (behel)', desc: 'Merapikan susunan gigi', conditions: ['Gigi berjejal', 'Gigi maju', 'Gigitan tidak pas'], visits: null },
  { id: 'gingivektomi', title: 'Gingivektomi', desc: 'Merapikan gusi (gummy smile)', conditions: ['Gusi terlihat berlebih', 'Gusi tidak rata'], visits: 1 },
];

export const findTemplate = (id: string | null | undefined) => CONTENT_TEMPLATES.find((t) => t.id === id) ?? null;

/** FDI numbering as seen facing the patient: their right on the left. */
export const TOOTH_ROWS: { upper: string[]; lower: string[] } = {
  upper: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  lower: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
};

export const TOOTH_PRESETS: { label: string; teeth: string[] }[] = [
  { label: 'Depan atas', teeth: ['13', '12', '11', '21', '22', '23'] },
  { label: 'Depan bawah', teeth: ['43', '42', '41', '31', '32', '33'] },
  { label: '2 gigi seri atas', teeth: ['11', '21'] },
];

export const REGION_OPTIONS = [
  'Rahang atas depan',
  'Rahang bawah depan',
  'Rahang atas belakang',
  'Rahang bawah belakang',
  'Rahang atas',
  'Rahang bawah',
  'Rahang atas & bawah',
  'Seluruh gigi',
];

const ORDER = [...TOOTH_ROWS.upper, ...TOOTH_ROWS.lower];

/** Sorted in chart order, duplicates and non-FDI values dropped. */
export const sortTeeth = (teeth: string[]) =>
  ORDER.filter((t) => teeth.includes(t));

/**
 * Describes where the teeth are ("Rahang atas depan", "Rahang bawah
 * belakang kiri", …), or '' for none. Side is the patient's side.
 */
export function regionOf(teeth: string[]): string {
  const valid = sortTeeth(teeth);
  if (valid.length === 0) return '';
  const q = valid.map((t) => Number(t[0]));
  const upper = q.some((n) => n === 1 || n === 2);
  const lower = q.some((n) => n === 3 || n === 4);
  const jaw = upper && lower ? 'Rahang atas & bawah' : upper ? 'Rahang atas' : 'Rahang bawah';
  const front = valid.every((t) => Number(t[1]) <= 3);
  const back = valid.every((t) => Number(t[1]) >= 4);
  if (front) return `${jaw} depan`;
  if (!back) return jaw;
  const right = q.every((n) => n === 1 || n === 4);
  const left = q.every((n) => n === 2 || n === 3);
  return `${jaw} belakang${right ? ' kanan' : left ? ' kiri' : ''}`;
}

export interface TreatmentDetails {
  condition: string;
  teeth: string[];
  region: string;
  visits: number | null;
}

/** "Gigi berlubang · Gigi 11, 21 · Rahang atas depan · 2 kunjungan" (max 120). */
export function buildCaption(d: TreatmentDetails): string {
  const teeth = sortTeeth(d.teeth);
  const parts = [
    d.condition.trim(),
    teeth.length ? `Gigi ${teeth.join(', ')}` : '',
    d.region.trim(),
    d.visits ? `${d.visits} kunjungan` : '',
  ].filter(Boolean);
  let caption = parts.join(' · ');
  // Too long: drop the tooth list first (the region still says where).
  if (caption.length > 120 && teeth.length) caption = parts.filter((p) => !p.startsWith('Gigi ')).join(' · ');
  return caption.slice(0, 120);
}
