/**
 * Fictional clinic for demo mode. Generated deterministically (seeded PRNG)
 * relative to today, so every report page shows the same, internally
 * consistent numbers: reports are computed from these rows, not hardcoded.
 * No real person is represented; names are assembled from common words.
 */

// ---------- helpers ----------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260924);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function atTime(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---------- master data ----------

export const DEMO_CLINIC_ID = 900001;

export const demoClinic = {
  id: DEMO_CLINIC_ID,
  name: 'Klinik Gigi Senyum Sehat (Demo)',
  address: 'Jl. Contoh Raya No. 12',
  city: 'Kota Bandung',
  province: 'Jawa Barat',
  postalCode: '40123',
  phone: '022-0000-1234',
  email: 'halo@senyumsehat.demo',
  website: 'https://senyumsehat.demo',
  sipNumber: 'SIP/DEMO/2026',
  operationalHours: {
    senin: '08:00-20:00',
    selasa: '08:00-20:00',
    rabu: '08:00-20:00',
    kamis: '08:00-20:00',
    jumat: '08:00-20:00',
    sabtu: '08:00-15:00',
  },
  setupComplete: true,
  logoUrl: null as string | null,
};

export const demoPractitioners = [
  { id: 1, name: 'Anisa Putri', specialization: 'Dokter Gigi Umum', gender: 'female', sipNumber: 'SIP-DG-001' },
  { id: 2, name: 'Bima Santoso, Sp.Ort', specialization: 'Ortodonti', gender: 'male', sipNumber: 'SIP-DG-002' },
  { id: 3, name: 'Citra Lestari', specialization: 'Dokter Gigi Umum', gender: 'female', sipNumber: 'SIP-DG-003' },
].map((p) => ({ ...p, clinicId: DEMO_CLINIC_ID, phone: '0812-0000-000' + p.id, email: `dokter${p.id}@senyumsehat.demo`, createdAt: '2026-01-05T08:00:00.000Z' }));

export const demoTarifs = [
  { id: 1, name: 'Konsultasi & Pemeriksaan', kategori: 'Konsultasi', hargaPokok: 15000, hargaJual: 100000, weight: 10, kodeIcd9: '89.31' },
  { id: 2, name: 'Scaling (Pembersihan Karang Gigi)', kategori: 'Preventif', hargaPokok: 60000, hargaJual: 350000, weight: 9, kodeIcd9: '96.54' },
  { id: 3, name: 'Tambal Gigi Komposit', kategori: 'Konservasi', hargaPokok: 90000, hargaJual: 400000, weight: 9, kodeIcd9: '23.2' },
  { id: 4, name: 'Cabut Gigi Biasa', kategori: 'Bedah Mulut', hargaPokok: 50000, hargaJual: 300000, weight: 6, kodeIcd9: '23.09' },
  { id: 5, name: 'Cabut Gigi Bungsu (Odontektomi)', kategori: 'Bedah Mulut', hargaPokok: 400000, hargaJual: 2500000, weight: 2, kodeIcd9: '23.19' },
  { id: 6, name: 'Perawatan Saluran Akar', kategori: 'Konservasi', hargaPokok: 250000, hargaJual: 1200000, weight: 3, kodeIcd9: '23.70' },
  { id: 7, name: 'Bleaching (Pemutihan Gigi)', kategori: 'Estetik', hargaPokok: 500000, hargaJual: 2000000, weight: 2, kodeIcd9: '24.99' },
  { id: 8, name: 'Pasang Behel (Kawat Gigi)', kategori: 'Ortodonti', hargaPokok: 1500000, hargaJual: 6500000, weight: 1, kodeIcd9: '24.7' },
  { id: 9, name: 'Kontrol Behel', kategori: 'Ortodonti', hargaPokok: 50000, hargaJual: 250000, weight: 6, kodeIcd9: '24.8' },
  { id: 10, name: 'Gigi Tiruan Lepasan', kategori: 'Prostodonti', hargaPokok: 700000, hargaJual: 2800000, weight: 1, kodeIcd9: '23.43' },
  { id: 11, name: 'Fissure Sealant Anak', kategori: 'Preventif', hargaPokok: 40000, hargaJual: 200000, weight: 3, kodeIcd9: '96.54' },
  { id: 12, name: 'Rontgen Periapikal', kategori: 'Penunjang', hargaPokok: 25000, hargaJual: 150000, weight: 4, kodeIcd9: '87.12' },
].map((t) => ({
  ...t,
  clinicId: DEMO_CLINIC_ID,
  deskripsi: '',
  diskonMaksimal: 10,
  isActive: true,
  createdAt: '2026-01-05T08:00:00.000Z',
  updatedAt: '2026-01-05T08:00:00.000Z',
}));

/** Doctor's share per procedure (percentage of the billed price). */
export const DOCTOR_FEE_PERCENT = 35;

const FIRST_F = ['Siti', 'Dewi', 'Rina', 'Ayu', 'Putri', 'Nur', 'Maya', 'Lina', 'Indah', 'Sari', 'Fitri', 'Wulan', 'Tari', 'Nadia', 'Rara'];
const FIRST_M = ['Budi', 'Agus', 'Rizky', 'Dimas', 'Fajar', 'Hendra', 'Andi', 'Yoga', 'Eko', 'Arif', 'Bayu', 'Galih', 'Rafi', 'Ilham', 'Teguh'];
const LAST = ['Pratama', 'Saputra', 'Wijaya', 'Hidayat', 'Kusuma', 'Nugroho', 'Permana', 'Rahmawati', 'Susanti', 'Maulana', 'Setiawan', 'Lestari', 'Ramadhan', 'Anggraini', 'Firmansyah'];
const AREAS = [
  { kelurahan: 'Sukajadi', kecamatan: 'Sukajadi', city: 'Kota Bandung' },
  { kelurahan: 'Cipedes', kecamatan: 'Sukajadi', city: 'Kota Bandung' },
  { kelurahan: 'Dago', kecamatan: 'Coblong', city: 'Kota Bandung' },
  { kelurahan: 'Lebakgede', kecamatan: 'Coblong', city: 'Kota Bandung' },
  { kelurahan: 'Antapani Kidul', kecamatan: 'Antapani', city: 'Kota Bandung' },
  { kelurahan: 'Turangga', kecamatan: 'Lengkong', city: 'Kota Bandung' },
  { kelurahan: 'Cibabat', kecamatan: 'Cimahi Utara', city: 'Kota Cimahi' },
  { kelurahan: 'Baros', kecamatan: 'Cimahi Tengah', city: 'Kota Cimahi' },
  { kelurahan: 'Lembang', kecamatan: 'Lembang', city: 'Kabupaten Bandung Barat' },
] as const;
const SOURCES = ['instagram', 'google_maps', 'teman_keluarga', 'tiktok', 'lewat_depan_klinik', 'facebook', 'brosur'] as const;
const COMPLAINTS = ['Gigi berlubang terasa ngilu', 'Karang gigi, gusi mudah berdarah', 'Gigi geraham sakit saat mengunyah', 'Kontrol rutin', 'Ingin memutihkan gigi', 'Gigi bungsu tumbuh miring', 'Kontrol behel bulanan', 'Tambalan lepas'];

export interface DemoPatient {
  id: number;
  noRm: string;
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  phone: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  sumberInformasi: (typeof SOURCES)[number];
  referrerPatientId?: number;
  createdAt: string;
}

export interface DemoEncounter {
  id: number;
  patientId: number;
  practitionerId: number;
  arrived: Date;
  inProgress?: Date;
  finished?: Date;
  status: 'arrived' | 'in_progress' | 'finished' | 'cancelled';
  chiefComplaint: string;
  procedures: { tarifId: number; discount: number }[];
}

export interface DemoBilling {
  id: number;
  encounterId: number;
  patientId: number;
  invoiceNumber: string;
  createdAt: Date;
  items: { tarifId: number; name: string; unitPrice: number; discount: number; subtotal: number; modal: number }[];
  grandTotal: number;
  paidAmount: number;
  status: 'unpaid' | 'partial' | 'paid';
  payments: { id: number; method: 'cash' | 'transfer' | 'qris' | 'insurance' | 'bpjs'; amount: number; paidAt: Date }[];
}

export interface DemoExpense {
  id: number;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
}

// ---------- generation ----------

const today = new Date();
today.setHours(0, 0, 0, 0);
const DAYS_BACK = 400;

export const demoPatients: DemoPatient[] = [];
for (let i = 1; i <= 240; i++) {
  const gender = rand() < 0.58 ? 'female' : 'male';
  const first = gender === 'female' ? pick(FIRST_F) : pick(FIRST_M);
  const area = pick(AREAS);
  const age = rand() < 0.15 ? between(5, 12) : rand() < 0.1 ? between(13, 17) : between(18, 70);
  const birth = new Date(today.getFullYear() - age, between(0, 11), between(1, 28));
  // The first 70 patients predate the demo window; the rest register steadily
  // through it, so every period has genuinely new patients.
  const createdBack = i <= 70 ? DAYS_BACK + between(1, 200) : Math.round(((240 - i) / 170) * DAYS_BACK);
  const created = new Date(today.getTime() - createdBack * 86400000);
  demoPatients.push({
    id: i,
    noRm: `RM-${String(i).padStart(5, '0')}`,
    name: `${first} ${pick(LAST)}`,
    gender,
    birthDate: toDateStr(birth),
    phone: `0812${String(10000000 + i * 7919).slice(0, 8)}`,
    address: `Jl. Contoh No. ${between(1, 120)}`,
    ...area,
    province: 'Jawa Barat',
    sumberInformasi: pick(SOURCES),
    referrerPatientId: i > 20 && rand() < 0.12 ? between(1, 20) : undefined,
    createdAt: created.toISOString(),
  });
}

function weightedTarif(): number {
  const total = demoTarifs.reduce((s, t) => s + t.weight, 0);
  let r = rand() * total;
  for (const t of demoTarifs) {
    r -= t.weight;
    if (r <= 0) return t.id;
  }
  return 1;
}

export const demoEncounters: DemoEncounter[] = [];
export const demoBillings: DemoBilling[] = [];
{
  let encId = 1;
  let payId = 1;
  const nowMs = Date.now();
  for (let back = DAYS_BACK; back >= 0; back--) {
    const day = new Date(today.getTime() - back * 86400000);
    const dow = day.getDay();
    // Gentle growth over the year; busier on Saturday, short hours on Sunday.
    const growth = 1 + (DAYS_BACK - back) / DAYS_BACK / 2;
    const base = dow === 6 ? 13 : dow === 0 ? 3 : 9;
    const dayEndMs = day.getTime() + 86400000;
    const registered = demoPatients.filter((p) => new Date(p.createdAt).getTime() < dayEndMs);
    const recent = registered.filter((p) => new Date(p.createdAt).getTime() > day.getTime() - 21 * 86400000);
    const count = Math.round(base * growth * (0.75 + rand() * 0.5));
    for (let n = 0; n < count; n++) {
      const hour = dow === 6 || dow === 0 ? between(8, 14) : pick([8, 9, 10, 10, 11, 13, 14, 15, 16, 17, 17, 18, 18, 19]);
      const arrived = atTime(day, hour, between(0, 59));
      if (arrived.getTime() > nowMs) continue;
      // Newly registered patients come in soon after signing up.
      const patient = recent.length && rand() < 0.3 ? pick(recent) : pick(registered);
      const cancelled = rand() < 0.04;
      const procedures = [{ tarifId: weightedTarif(), discount: rand() < 0.15 ? 10 : 0 }];
      if (rand() < 0.35) procedures.push({ tarifId: 12, discount: 0 });
      const durationMin = between(20, 75);
      const finished = new Date(arrived.getTime() + durationMin * 60000);
      const isToday = back === 0;
      let status: DemoEncounter['status'] = cancelled ? 'cancelled' : 'finished';
      if (isToday && !cancelled && finished.getTime() > nowMs) status = 'in_progress';
      if (isToday && !cancelled && arrived.getTime() > nowMs - 15 * 60000) status = 'arrived';

      const enc: DemoEncounter = {
        id: encId++,
        patientId: patient.id,
        practitionerId: demoPractitioners[between(0, 2)].id,
        arrived,
        inProgress: status !== 'arrived' ? new Date(arrived.getTime() + 10 * 60000) : undefined,
        finished: status === 'finished' ? finished : undefined,
        status,
        chiefComplaint: pick(COMPLAINTS),
        procedures,
      };
      demoEncounters.push(enc);

      if (status !== 'finished') continue;
      const items = procedures.map(({ tarifId, discount }) => {
        const t = demoTarifs.find((x) => x.id === tarifId)!;
        const cut = Math.round((t.hargaJual * discount) / 100);
        return { tarifId, name: t.name, unitPrice: t.hargaJual, discount: cut, subtotal: t.hargaJual - cut, modal: t.hargaPokok };
      });
      const grandTotal = items.reduce((s, it) => s + it.subtotal, 0);
      const unpaid = back < 20 && rand() < 0.08;
      const method = pick(['cash', 'cash', 'qris', 'qris', 'transfer', 'insurance'] as const);
      demoBillings.push({
        id: enc.id,
        encounterId: enc.id,
        patientId: patient.id,
        invoiceNumber: `INV/${toDateStr(day).replace(/-/g, '')}/${String(enc.id).padStart(5, '0')}`,
        createdAt: finished,
        items,
        grandTotal,
        paidAmount: unpaid ? 0 : grandTotal,
        status: unpaid ? 'unpaid' : 'paid',
        payments: unpaid ? [] : [{ id: payId++, method, amount: grandTotal, paidAt: finished }],
      });
    }
  }
}

export const demoExpenses: DemoExpense[] = [];
{
  let id = 1;
  for (let m = 13; m >= 0; m--) {
    const month = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const push = (day: number, kategori: string, deskripsi: string, nominal: number) => {
      const d = new Date(month.getFullYear(), month.getMonth(), day);
      if (d > today) return;
      demoExpenses.push({ id: id++, tanggal: toDateStr(d), kategori, deskripsi, nominal });
    };
    push(1, 'sewa', 'Sewa ruko bulanan', 7500000);
    push(25, 'gaji', 'Gaji staf (resepsionis, asisten, kebersihan)', 14500000);
    push(5, 'listrik', 'Tagihan listrik PLN', between(1800, 2600) * 1000);
    push(5, 'air', 'Tagihan PDAM', between(250, 400) * 1000);
    push(6, 'internet', 'Internet & telepon', 650000);
    push(10, 'bahan_habis_pakai', 'Belanja bahan habis pakai', between(3500, 6000) * 1000);
    push(15, 'biaya_iklan', 'Iklan Instagram & Google', between(1500, 3000) * 1000);
    if (m % 3 === 0) push(18, 'maintenance', 'Servis dental unit & kompresor', 1250000);
    if (m % 4 === 1) push(20, 'alat_dental', 'Pembelian instrumen dental', between(2000, 5000) * 1000);
  }
}

export const demoBarang = [
  ['Komposit Resin A2', 'BHP-001', 'Bahan Tambal', 'box', 'tube', 5, 450000, 5, 14],
  ['Bonding Agent', 'BHP-002', 'Bahan Tambal', 'botol', 'botol', 1, 380000, 3, 6],
  ['Anestesi Lidocaine', 'OBT-001', 'Obat', 'box', 'ampul', 50, 520000, 40, 120],
  ['Sarung Tangan Nitril M', 'APD-001', 'APD', 'box', 'pasang', 50, 95000, 100, 64],
  ['Masker Medis', 'APD-002', 'APD', 'box', 'pcs', 50, 45000, 100, 320],
  ['Kapas Gulung', 'BHP-003', 'Bahan Habis Pakai', 'pack', 'pcs', 100, 30000, 200, 850],
  ['Bracket Metal Set', 'ORT-001', 'Ortodonti', 'set', 'set', 1, 350000, 4, 3],
  ['Gel Bleaching 35%', 'EST-001', 'Estetik', 'kit', 'kit', 1, 420000, 2, 5],
  ['Film Rontgen Periapikal', 'PNJ-001', 'Penunjang', 'box', 'lembar', 100, 650000, 100, 240],
  ['Jarum Suntik 27G', 'BHP-004', 'Bahan Habis Pakai', 'box', 'pcs', 100, 120000, 100, 90],
].map(([name, sku, kategori, satuanBeli, satuanPakai, konversiQty, hargaBeli, stokMinimum, stokSaatIni], i) => ({
  id: i + 1,
  clinicId: DEMO_CLINIC_ID,
  name: name as string,
  sku: sku as string,
  kategori: kategori as string,
  satuanBeli: satuanBeli as string,
  satuanPakai: satuanPakai as string,
  konversiQty: konversiQty as number,
  supplierName: 'PT Dental Supply (Demo)',
  hargaBeli: hargaBeli as number,
  stokMinimum: stokMinimum as number,
  stokSaatIni: stokSaatIni as number,
  trackExpiry: kategori === 'Obat' || kategori === 'Estetik',
  lokasiSimpan: 'Lemari A',
  isActive: true,
  createdAt: '2026-01-05T08:00:00.000Z',
  updatedAt: '2026-01-05T08:00:00.000Z',
}));

export const demoToday = today;
