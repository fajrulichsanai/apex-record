import { ApiError } from '../api-client';
import type { ClinicContent, ContentSettings, SeriesPhoto } from '../contents';
import { DEMO_CLINIC_ID, demoEncounters, demoPatients, demoPractitioners, demoToday, toDateStr } from './demo-data';

/**
 * Tambahan demo untuk fitur yang lebih baru dari mock-api.ts: Konten (galeri,
 * editor, pustaka foto rekam medis), Follow Up / reservasi, antrean farmasi,
 * penggajian, ulang tahun, folder foto klinis, kuota akun, dan kehadiran.
 * Semuanya data fiktif di memori browser; tidak ada yang dikirim ke server.
 */

type Query = URLSearchParams;
type Handler = (match: RegExpMatchArray, query: Query) => unknown;

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(demoToday);
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
};

// ───────────────────────── gambar fiktif ─────────────────────────

const imageCache = new Map<string, string>();

/** Foto "klinis" fiktif: gusi dan deretan gigi digambar di kanvas, warnanya mengikuti seed. */
function drawTeethCanvas(seed: number, w = 720, h = 540): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const hue = (seed * 47) % 360;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, `hsl(${hue} 30% 90%)`);
  bg.addColorStop(1, `hsl(${hue} 38% 76%)`);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  // bibir / rongga mulut
  g.fillStyle = '#7a2d3a';
  g.beginPath();
  g.ellipse(w / 2, h / 2, w * 0.38, h * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#d9707e';
  g.beginPath();
  g.ellipse(w / 2, h / 2, w * 0.38, h * 0.3, 0, Math.PI, Math.PI * 2);
  g.fill();
  const teeth = (y: number, dir: 1 | -1) => {
    for (let i = -4; i <= 4; i++) {
      const x = w / 2 + i * (w * 0.075);
      const th = h * (0.1 + 0.015 * (4 - Math.abs(i)) * 0.4) * (i === 0 ? 1.1 : 1);
      g.fillStyle = `hsl(48 ${20 + (seed % 3) * 6}% ${93 - Math.abs(i)}%)`;
      g.beginPath();
      g.roundRect(x - w * 0.034, dir === 1 ? y : y - th, w * 0.068, th, 12);
      g.fill();
    }
  };
  teeth(h * 0.38, 1);
  teeth(h * 0.62, -1);
  return c;
}

function toUrl(c: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => c.toBlob((b) => resolve(URL.createObjectURL(b!)), 'image/jpeg', 0.85));
}

export async function demoPhotoUrl(seed: number): Promise<string> {
  const key = `p${seed}`;
  if (!imageCache.has(key)) imageCache.set(key, await toUrl(drawTeethCanvas(seed)));
  return imageCache.get(key)!;
}

/** Story fiktif untuk thumbnail galeri (konten yang belum punya hasil render sungguhan). */
async function demoStoryBlob(title: string, seeds: number[]): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 360;
  c.height = 640;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 360, 640);
  g.fillStyle = '#16213f';
  g.font = '700 14px sans-serif';
  g.fillText('SENYUM SEHAT DEMO', 20, 36);
  g.font = 'italic 400 34px serif';
  g.fillText(title.slice(0, 18), 20, 86);
  const gap = 8;
  const top = 116;
  const hh = (640 - top - 70 - gap * (seeds.length - 1)) / seeds.length;
  seeds.forEach((s, i) => {
    const y = top + i * (hh + gap);
    g.save();
    g.beginPath();
    g.roundRect(20, y, 320, hh, 12);
    g.clip();
    const src = drawTeethCanvas(s, 640, Math.round(hh * 2));
    g.drawImage(src, 20, y, 320, hh);
    g.restore();
  });
  g.fillStyle = '#55534a';
  g.font = '400 11px sans-serif';
  g.fillText('Konsultasi & reservasi · WA 0812-3456-7890', 20, 618);
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
}

const renderedBlobs = new Map<number, Blob>();

/** URL file terautentikasi di mode demo (foto rekam medis, foto series, dsb.). */
export async function demoFileUrl(path: string): Promise<string> {
  const series = path.match(/^\/contents\/(\d+)\/series-photos\/(\d+)\/file$/);
  if (series) {
    const row = photoRows.find((p) => p.id === Number(series[2]));
    if (row?._url) return row._url;
    return demoPhotoUrl(row ? row.sourceId ?? row.id : Number(series[2]));
  }
  let h = 0;
  for (const ch of path) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return demoPhotoUrl(h);
}

/** Gambar yang diambil editor Konten (hasil render, logo). */
export async function demoContentImage(path: string): Promise<Blob | null> {
  const m = path.match(/^\/contents\/(\d+)\/photos\/rendered$/);
  if (!m) return null;
  const id = Number(m[1]);
  const kept = renderedBlobs.get(id);
  if (kept) return kept;
  const content = contents.find((c) => c.id === id);
  if (!content || content.status !== 'published') return null;
  const n = photoRows.filter((p) => p.contentId === id).length;
  return demoStoryBlob(content.title, [id * 3, id * 3 + 1, id * 3 + 2].slice(0, Math.max(2, Math.min(3, n || 2))));
}

// ───────────────────────── Konten (memori) ─────────────────────────

type PhotoRow = SeriesPhoto & { _url?: string };

let nextContentId = 10;
let nextPhotoId = 100;

const seriesSettings = (arrangement: NonNullable<NonNullable<ContentSettings['series']>['arrangement']>): ContentSettings =>
  ({ series: { arrangement, edgeText: true, areaPct: 100, split: 58, gap: 14, radius: 20 } }) as ContentSettings;

const contents: ClinicContent[] = [
  {
    id: 1, templateId: null, title: 'Behel 6 Bulan', caption: 'Kontrol rutin · 6 bulan', layout: 'series', background: 'light',
    showDisclaimer: true, beforeImageUrl: null, afterImageUrl: null, settings: seriesSettings('heroLeft'), imageUrl: 'demo',
    status: 'published', publishedAt: iso(daysAgo(6)), createdAt: iso(daysAgo(9)), updatedAt: iso(daysAgo(6)),
  },
  {
    id: 2, templateId: null, title: 'Bleaching', caption: 'Pemutihan gigi 1 sesi', layout: 'series', background: 'navy',
    showDisclaimer: true, beforeImageUrl: null, afterImageUrl: null, settings: seriesSettings('grid'), imageUrl: 'demo',
    status: 'published', publishedAt: iso(daysAgo(3)), createdAt: iso(daysAgo(5)), updatedAt: iso(daysAgo(3)),
  },
  {
    id: 3, templateId: null, title: 'Tambal Gigi Depan', caption: null, layout: 'series', background: 'light',
    showDisclaimer: true, beforeImageUrl: null, afterImageUrl: null, settings: seriesSettings('hero'), imageUrl: null,
    status: 'draft', publishedAt: null, createdAt: iso(daysAgo(1)), updatedAt: iso(daysAgo(1)),
  },
];

const photoRows: PhotoRow[] = [];
const seedPhotos = (contentId: number, captions: string[]) =>
  captions.forEach((caption, i) =>
    photoRows.push({
      id: nextPhotoId++, contentId, sourceType: 'patient_photo', sourceId: 9000 + contentId * 10 + i, sortOrder: i,
      caption, blurFace: false, frame: null,
    }),
  );
seedPhotos(1, ['Sebelum', '3 bulan', '6 bulan']);
seedPhotos(2, ['Sebelum', 'Sesudah', 'Seminggu', '1 bulan']);
seedPhotos(3, ['Sebelum', 'Sesudah']);

const body = (options: RequestInit) => {
  try {
    return typeof options.body === 'string' ? (JSON.parse(options.body) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
const formFile = (options: RequestInit) => (options.body instanceof FormData ? (options.body.get('file') as File | null) : null);
const rowsOf = (contentId: number) => photoRows.filter((p) => p.contentId === contentId).sort((a, b) => a.sortOrder - b.sortOrder);
const notFound = () => {
  throw new ApiError('Konten tidak ditemukan', 404);
};
const findContent = (id: number) => contents.find((c) => c.id === id) ?? notFound();

/** Foto rekam medis fiktif untuk pustaka Konten: beberapa pasien, dua-tiga tanggal kunjungan. */
const LIB_LABELS = ['Depan senyum', 'Rahang atas', 'Rahang bawah', 'Molar kanan', 'Molar kiri', 'Depan tidak senyum'];
const libraryPatients = demoPatients.slice(0, 6);
const libraryPhotos = (patientId: number) =>
  LIB_LABELS.map((label, i) => ({
    id: patientId * 10 + i,
    sourceType: 'patient_photo' as const,
    fileUrl: `/demo-photo/${patientId}/${i}`,
    takenAt: iso(daysAgo(i < 3 ? 12 : 40)),
    label,
  }));

/**
 * Menangani semua /contents/* di mode demo — termasuk tulis (disimpan di memori
 * selama tab terbuka). Mengembalikan undefined bila path bukan milik Konten.
 */
export async function kontenDemo(method: string, url: URL, options: RequestInit): Promise<unknown | undefined> {
  const p = url.pathname;
  if (!p.startsWith('/contents')) return undefined;
  await new Promise((r) => setTimeout(r, 100));
  let m: RegExpMatchArray | null;

  if (p === '/contents' && method === 'GET') return contents;
  if (p === '/contents' && method === 'POST') {
    const b = body(options) as Partial<ClinicContent>;
    const c = {
      id: nextContentId++, templateId: null, caption: null, beforeImageUrl: null, afterImageUrl: null, settings: null, imageUrl: null,
      showDisclaimer: true, background: 'light', layout: 'stack', title: 'Konten', ...b,
      status: 'draft', publishedAt: null, createdAt: iso(new Date()), updatedAt: iso(new Date()),
    } as ClinicContent;
    contents.unshift(c);
    return c;
  }
  if (p === '/contents/templates') return [];
  if (p === '/contents/images' && method === 'POST') {
    const f = formFile(options);
    return { url: f ? URL.createObjectURL(f) : '/demo-photo/0/0' };
  }
  if (p === '/contents/import-photo' && method === 'POST') return { url: `/demo-photo/import/${Number(body(options).sourceId) || 0}` };
  if (p === '/contents/logo') throw new ApiError('Tidak ada', 404);
  if (p === '/contents/photo-patients') {
    const q = (url.searchParams.get('search') || '').trim().toLowerCase();
    return libraryPatients
      .filter((x) => !q || `${x.name} ${x.noRm}`.toLowerCase().includes(q))
      .map((x, i) => ({ id: x.id, name: x.name, noRm: x.noRm, photoCount: 6, lastAt: iso(daysAgo(12 + i)) }));
  }
  if ((m = p.match(/^\/contents\/photo-library\/(\d+)$/))) return libraryPhotos(Number(m[1]));
  if ((m = p.match(/^\/contents\/picker\/(\d+)$/)))
    return { consentMarketing: true, folders: [{ group: null, photos: libraryPhotos(Number(m[1])).map((x) => ({ id: x.id, fileUrl: x.fileUrl, template: { id: 1, name: x.label } })) }], supportingExam: [] };

  if ((m = p.match(/^\/contents\/(\d+)\/series-photos(?:\/(reorder|upload|\d+))?(?:\/file)?$/))) {
    const contentId = Number(m[1]);
    findContent(contentId);
    const sub = m[2];
    if (!sub && method === 'GET') return rowsOf(contentId);
    if (!sub && method === 'POST') {
      const b = body(options);
      const row: PhotoRow = {
        id: nextPhotoId++, contentId, sourceType: b.sourceType as SeriesPhoto['sourceType'], sourceId: Number(b.sourceId),
        sortOrder: rowsOf(contentId).length, caption: null, blurFace: false, frame: null,
      };
      photoRows.push(row);
      return row;
    }
    if (sub === 'upload' && method === 'POST') {
      const f = formFile(options);
      const row: PhotoRow = {
        id: nextPhotoId++, contentId, sourceType: 'upload', sourceId: null, sortOrder: rowsOf(contentId).length,
        caption: null, blurFace: false, frame: null, _url: f ? URL.createObjectURL(f) : undefined,
      };
      photoRows.push(row);
      return row;
    }
    if (sub === 'reorder' && method === 'PATCH') {
      (body(options).orderedIds as number[]).forEach((id, i) => {
        const r = photoRows.find((x) => x.id === id);
        if (r) r.sortOrder = i;
      });
      return rowsOf(contentId);
    }
    if (sub && /^\d+$/.test(sub)) {
      const row = photoRows.find((x) => x.id === Number(sub) && x.contentId === contentId);
      if (!row) throw new ApiError('Foto konten tidak ditemukan', 404);
      if (method === 'PATCH') return Object.assign(row, body(options));
      if (method === 'DELETE') {
        photoRows.splice(photoRows.indexOf(row), 1);
        return { success: true };
      }
    }
  }

  if ((m = p.match(/^\/contents\/(\d+)\/(publish|unpublish)$/)) && method === 'POST') {
    const c = findContent(Number(m[1]));
    if (m[2] === 'publish') {
      const f = formFile(options);
      if (f) renderedBlobs.set(c.id, f);
      c.status = 'published';
      c.publishedAt = iso(new Date());
      c.imageUrl = 'demo';
    } else {
      c.status = 'draft';
    }
    return c;
  }
  if ((m = p.match(/^\/contents\/(\d+)$/))) {
    const c = findContent(Number(m[1]));
    if (method === 'GET') return c;
    if (method === 'PATCH') return Object.assign(c, body(options), { updatedAt: iso(new Date()) });
    if (method === 'DELETE') {
      contents.splice(contents.indexOf(c), 1);
      return { success: true };
    }
  }
  return undefined;
}

// ───────────────────────── endpoint lain ─────────────────────────

const doctorNames = demoPractitioners.map((d) => d.name);
const recent = demoEncounters.filter((e) => e.status === 'finished' || e.status === 'in_progress').slice(-14).reverse();
const patientName = (id: number) => demoPatients.find((x) => x.id === id);

const pharmacyQueue = () => {
  const items = recent.map((e, i) => {
    const pt = patientName(e.patientId);
    const total = 2 + (i % 2);
    const done = i % 3 === 0 ? total : i % 3 === 1 ? 1 : 0;
    return {
      encounterId: e.id, patientId: e.patientId, patientName: pt?.name ?? null, noRM: pt?.noRm ?? null,
      practitionerName: doctorNames[(e.practitionerId - 1) % doctorNames.length] ?? null,
      arrivedTime: e.arrived.toISOString(), encounterStatus: e.status as 'finished' | 'in_progress',
      itemCount: total, dispensedCount: done, administeredCount: 0, handledCount: done,
      drugNames: ['Amoxicillin 500 mg', 'Asam Mefenamat 500 mg', 'Chlorhexidine 0,2%'].slice(0, total),
      pharmacyStatus: (done === total ? 'done' : done === 0 ? 'pending' : 'partial') as 'done' | 'pending' | 'partial',
      reviewedAt: null,
    };
  });
  const count = (s: string) => items.filter((x) => x.pharmacyStatus === s).length;
  return {
    data: items,
    stats: { total: items.length, pending: count('pending'), partial: count('partial'), done: count('done') },
    meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
  };
};

const STAFF = [
  { userId: 900002, name: 'Rani (Resepsionis)', role: 'admin', baseSalary: 3200000 },
  ...demoPractitioners.map((p) => ({ userId: 900010 + p.id, name: p.name, role: 'dokter', baseSalary: 2500000 })),
];

const payrollView = (period: string) => {
  const items = STAFF.map((s, i) => {
    const shareFee = s.role === 'dokter' ? 4200000 + i * 650000 : 0;
    const bonus = i === 0 ? 250000 : 0;
    return {
      id: null, userId: s.userId, name: s.name, role: s.role, baseSalary: s.baseSalary, bonus, deduction: 0, shareFee,
      total: s.baseSalary + bonus + shareFee,
      attendance: { workDays: 22, presentDays: 21, lateCount: i % 2, lateMinutes: (i % 2) * 12, absentDays: i === 3 ? 1 : 0 },
      note: null, bankName: 'BCA', bankAccount: `88${i}1230045`, bankHolder: s.name.replace(/ \(.*/, ''),
    };
  });
  const sum = (k: 'baseSalary' | 'bonus' | 'deduction' | 'shareFee' | 'total') => items.reduce((a, r) => a + r[k], 0);
  return {
    period, run: null, items,
    totals: { baseSalary: sum('baseSalary'), bonus: sum('bonus'), deduction: sum('deduction'), shareFee: sum('shareFee'), total: sum('total') },
  };
};

const birthdays = (range: string) => {
  const now = new Date(demoToday);
  return demoPatients
    .filter((p) => {
      const b = new Date(p.birthDate);
      if (range === 'today') return b.getMonth() === now.getMonth() && b.getDate() === now.getDate();
      return b.getMonth() === now.getMonth();
    })
    .slice(0, 12)
    .map((p) => {
      const b = new Date(p.birthDate);
      return {
        id: p.id, noRm: p.noRm, name: p.name, gender: p.gender, phone: p.phone, birthDate: p.birthDate,
        turning: now.getFullYear() - b.getFullYear(), isToday: b.getDate() === now.getDate() && b.getMonth() === now.getMonth(),
        consentMarketing: p.id % 3 !== 0, lastVisit: toDateStr(daysAgo(20 + (p.id % 30))),
      };
    });
};

const photoGroups = [
  { id: 1, clinicId: null, name: 'Behel', sortOrder: 0, isActive: true, templates: ['Depan senyum', 'Depan tidak senyum', 'Rahang atas', 'Rahang bawah', 'Molar kanan', 'Molar kiri', 'Foto profil', 'Foto profil samping', 'Lain-lain'] },
  { id: 2, clinicId: DEMO_CLINIC_ID, name: 'Estetik & Bleaching', sortOrder: 1, isActive: true, templates: ['Sebelum', 'Sesudah', 'Warna gigi (shade)'] },
].map((g) => ({ ...g, templates: g.templates.map((name, i) => ({ id: g.id * 100 + i, groupId: g.id, name, sortOrder: i, isActive: true })) }));

const attendanceBoard = () => {
  const rows = STAFF.map((s, i) => {
    const status = i === 0 ? 'present' : i === 1 ? 'late' : i === 2 ? 'working' : 'not_in_yet';
    const clock = (h: number, mi: number) => ({
      at: new Date(new Date(demoToday).setHours(h, mi, 0, 0)).toISOString(), location: 'inside' as const, distanceM: 12,
      accuracyM: 8, deviceStatus: 'registered' as const, deviceId: 1, deviceName: 'HP Resepsionis',
    });
    return {
      userId: s.userId, name: s.name, role: s.role,
      day: {
        date: toDateStr(demoToday), status, lateMinutes: status === 'late' ? 14 : 0, earlyMinutes: 0, workedMinutes: status === 'not_in_yet' ? 0 : 240,
        schedule: { mode: 'work' as const, start: '09:00', end: '17:00' }, recordId: i + 1,
        clockIn: status === 'not_in_yet' ? null : clock(9, status === 'late' ? 14 : 2), clockOut: null, correction: null,
      },
    };
  });
  return {
    date: toDateStr(demoToday), serverTime: new Date().toISOString(),
    counts: { total: rows.length, in: 3, late: 1, notYet: 1, absent: 0, flagged: 0 }, rows,
  };
};

const clinicalPhoto = (patientId: number, i: number) => {
  const group = photoGroups[0];
  const tpl = group.templates[i % group.templates.length];
  return {
    id: patientId * 10 + i, patientId, encounterId: 1, templateId: tpl.id, fileUrl: `/demo-photo/${patientId}/${i}`,
    originalName: null, takenAt: iso(daysAgo(i < 4 ? 12 : 40)), template: tpl,
  };
};

export const extraRoutes: [RegExp, Handler][] = [
  [
    /^\/patients\/(\d+)\/photos$/,
    (m) => ({
      consentMarketing: Number(m[1]) % 3 !== 0,
      folders: [{ group: photoGroups[0], photos: Array.from({ length: 6 }, (_, i) => clinicalPhoto(Number(m[1]), i)) }],
    }),
  ],
  [/^\/encounters\/(\d+)\/photos$/, () => []],
  [/^\/pharmacy\/queue$/, () => pharmacyQueue()],
  [/^\/payroll\/runs\/(\d{4}-\d{2})$/, (m) => payrollView(m[1])],
  [/^\/payroll\/runs$/, () => []],
  [/^\/payroll\/employees$/, () => STAFF.map((s) => ({ ...s, isDoctor: s.role === 'dokter', bankName: 'BCA', bankAccount: '8801230045', bankHolder: s.name }))],
  [/^\/patients\/birthdays$/, (_m, q) => birthdays(q.get('range') || 'month')],
  [/^\/photo-template-groups$/, () => photoGroups],
  [/^\/users\/quota$/, () => ({ used: 5, limit: 25, scope: 'clinic', tier: 'pro', planName: 'Pro', trialStage: undefined })],
  [/^\/attendance\/today$/, () => attendanceBoard()],
  [/^\/clinic-links\/requests$/, () => []],
  [/^\/clinic-links\/current$/, () => null],
  [/^\/features\/clinic\/satusehat$/, () => ({ globalEnabled: false, enabled: false, active: false })],
  [/^\/reservations\/active$/, () => []],
  [
    /^\/satusehat\/summary$/,
    () => ({
      config: { configured: false, environment: 'sandbox', organizationId: null, hasClientId: false, tokenValidUntil: null },
      resources: [],
      syncLogs: { success: 0, failed: 0, pending: 0, lastSyncAt: null },
    }),
  ],
];
