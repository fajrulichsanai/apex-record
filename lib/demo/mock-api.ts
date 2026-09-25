import { ApiError } from '../api-client';
import type {
  FinancialReportProResponse,
  FinancialReportResponse,
  VisitReportResponse,
} from '../reports';
import {
  DEMO_CLINIC_ID,
  DOCTOR_FEE_PERCENT,
  demoBarang,
  demoBillings,
  demoClinic,
  demoEncounters,
  demoExpenses,
  demoPatients,
  demoPractitioners,
  demoTarifs,
  demoToday,
  toDateStr,
  type DemoBilling,
  type DemoEncounter,
} from './demo-data';

/**
 * Answers apiClient requests in demo mode (see lib/demo/demo-mode.ts).
 * Reads are served from the fictional clinic in demo-data.ts; writes are
 * refused with a friendly message, so nothing is ever saved or sent.
 */

const DEMO_READ_ONLY_MESSAGE =
  'Ini mode demo — perubahan tidak disimpan. Daftar gratis untuk mencoba semua fitur.';

type Query = URLSearchParams;
type Handler = (match: RegExpMatchArray, query: Query) => unknown;

const DOW_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const AGE_GROUPS = [
  { group: '0-12 (Anak)', max: 12 },
  { group: '13-17 (Remaja)', max: 17 },
  { group: '18-25 (Dewasa Muda)', max: 25 },
  { group: '26-40 (Dewasa)', max: 40 },
  { group: '41-60 (Paruh Baya)', max: 60 },
  { group: '60+ (Lansia)', max: 200 },
];

// ---------- lookups ----------

const patientById = new Map(demoPatients.map((p) => [p.id, p]));
const practitionerById = new Map(demoPractitioners.map((p) => [p.id, p]));
const tarifById = new Map(demoTarifs.map((t) => [t.id, t]));
const billingByEncounter = new Map(demoBillings.map((b) => [b.encounterId, b]));
const firstVisit = new Map<number, number>();
for (const e of demoEncounters) {
  if (!firstVisit.has(e.patientId)) firstVisit.set(e.patientId, e.arrived.getTime());
}

const dateOf = (d: Date) => toDateStr(d);
const inRange = (d: Date, from: string, to: string) => {
  const s = dateOf(d);
  return s >= from && s <= to;
};
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const changePct = (now: number, prev: number) => (prev ? Math.round(((now - prev) / prev) * 1000) / 10 : null);
const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1;
const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};
function previousRange(from: string, to: string) {
  const len = daysBetween(from, to);
  return { from: shift(from, -len), to: shift(from, -1) };
}
function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = shift(d, 1)) out.push(d);
  return out;
}
function ageAt(birthDate: string, at: Date) {
  const b = new Date(`${birthDate}T00:00:00`);
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}
function paginate<T>(rows: T[], query: Query, defaultLimit = 10) {
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.max(1, Number(query.get('limit')) || defaultLimit);
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
function range(query: Query) {
  const to = query.get('dateTo') || toDateStr(demoToday);
  const from = query.get('dateFrom') || shift(to, -29);
  return { from, to };
}

// ---------- entity views ----------

function patientView(id: number) {
  const p = patientById.get(id)!;
  return {
    ...p,
    clinicId: DEMO_CLINIC_ID,
    nik: `327301${String(p.id).padStart(4, '0')}******`,
    syncStatus: 'synced' as const,
    updatedAt: p.createdAt,
  };
}

function encounterListItem(e: DemoEncounter) {
  const p = patientById.get(e.patientId)!;
  return {
    encounterId: e.id,
    patientId: e.patientId,
    patientName: p.name,
    noRM: p.noRm,
    practitionerName: practitionerById.get(e.practitionerId)?.name,
    status: e.status,
    serviceType: 'outpatient',
    chiefComplaint: e.chiefComplaint,
    arrivedTime: e.arrived.toISOString(),
    inProgressTime: e.inProgress?.toISOString(),
    finishedTime: e.finished?.toISOString(),
    satusehatSyncStatus: e.status === 'finished' ? ('synced' as const) : ('pending' as const),
  };
}

function encounterDetail(e: DemoEncounter) {
  const p = patientById.get(e.patientId)!;
  const doc = practitionerById.get(e.practitionerId)!;
  return {
    id: e.id,
    clinicId: DEMO_CLINIC_ID,
    patientId: e.patientId,
    practitionerId: e.practitionerId,
    locationId: 1,
    serviceType: 'outpatient' as const,
    chiefComplaint: e.chiefComplaint,
    status: e.status,
    arrivedTime: e.arrived.toISOString(),
    inProgressTime: e.inProgress?.toISOString(),
    finishedTime: e.finished?.toISOString(),
    syncStatus: 'synced' as const,
    patient: { id: p.id, name: p.name, noRm: p.noRm },
    practitioner: { id: doc.id, name: doc.name },
    location: { id: 1, name: 'Ruang Periksa 1' },
  };
}

function billingDetail(b: DemoBilling) {
  const p = patientById.get(b.patientId)!;
  const discount = b.items.reduce((s, it) => s + it.discount, 0);
  return {
    id: b.id,
    clinicId: DEMO_CLINIC_ID,
    encounterId: b.encounterId,
    patientId: b.patientId,
    invoiceNumber: b.invoiceNumber,
    subtotal: b.grandTotal + discount,
    totalDiscount: discount,
    additionalFee: 0,
    grandTotal: b.grandTotal,
    paidAmount: b.paidAmount,
    outstandingAmount: b.grandTotal - b.paidAmount,
    status: b.status,
    notes: '',
    items: b.items.map((it, i) => ({
      id: b.id * 10 + i,
      tarifId: it.tarifId,
      name: it.name,
      quantity: 1,
      unitPrice: it.unitPrice,
      discount: it.discount,
      discountType: 'nominal' as const,
      subtotal: it.subtotal,
    })),
    payments: b.payments.map((pay) => ({
      id: pay.id,
      receiptNumber: `KW/${pay.id}`,
      method: pay.method,
      amount: pay.amount,
      paidAt: pay.paidAt.toISOString(),
    })),
    patient: { id: p.id, name: p.name, noRm: p.noRm, phone: p.phone },
  };
}

function medicalRecord(patientId: number) {
  return demoEncounters
    .filter((e) => e.patientId === patientId && e.status === 'finished')
    .reverse()
    .slice(0, 10)
    .map((e) => ({
      encounter: {
        id: e.id,
        status: e.status,
        serviceType: 'outpatient',
        chiefComplaint: e.chiefComplaint,
        arrivedTime: e.arrived.toISOString(),
        finishedTime: e.finished?.toISOString(),
        practitionerName: practitionerById.get(e.practitionerId)?.name,
      },
      vitals: { bloodPressureSystolic: 118, bloodPressureDiastolic: 78, pulseRate: 80, temperature: 36.6, weight: 60, height: 162 },
      soap: {
        subjective: e.chiefComplaint,
        objective: 'Pemeriksaan intraoral dalam batas normal kecuali keluhan utama.',
        assessment: tarifById.get(e.procedures[0].tarifId)?.kategori,
        treatment: e.procedures.map((p) => tarifById.get(p.tarifId)?.name).join(', '),
        plan: 'Kontrol 6 bulan lagi.',
      },
      dentalExam: null,
      prescriptions: [],
      supportingExamImages: [],
    }));
}

// ---------- reports ----------

function visitReport(query: Query): VisitReportResponse {
  const { from, to } = range(query);
  const rows = demoEncounters.filter((e) => inRange(e.arrived, from, to));
  const prev = previousRange(from, to);
  const previousTotal = demoEncounters.filter((e) => inRange(e.arrived, prev.from, prev.to)).length;
  const finished = rows.filter((e) => e.status === 'finished');
  const durations = finished.map((e) => (e.finished!.getTime() - e.arrived.getTime()) / 60000);

  const countBy = <K,>(keyOf: (e: DemoEncounter) => K) => {
    const m = new Map<K, number>();
    for (const e of rows) m.set(keyOf(e), (m.get(keyOf(e)) ?? 0) + 1);
    return m;
  };

  const byDayMap = countBy((e) => dateOf(e.arrived));
  const byDoctorMap = countBy((e) => e.practitionerId);
  const byGenderMap = countBy((e) => patientById.get(e.patientId)!.gender);
  const byAgeMap = countBy((e) => {
    const age = ageAt(patientById.get(e.patientId)!.birthDate, e.arrived);
    return AGE_GROUPS.find((g) => age <= g.max)!.group;
  });
  const byHourMap = countBy((e) => e.arrived.getHours());
  const byDowMap = countBy((e) => e.arrived.getDay());

  const procCount = new Map<number, number>();
  let procTotal = 0;
  for (const e of finished) {
    for (const p of e.procedures) {
      procCount.set(p.tarifId, (procCount.get(p.tarifId) ?? 0) + 1);
      procTotal++;
    }
  }
  const byKategori = new Map<string, number>();
  for (const [tarifId, count] of procCount) {
    const k = tarifById.get(tarifId)!.kategori;
    byKategori.set(k, (byKategori.get(k) ?? 0) + count);
  }

  const fromMs = new Date(`${from}T00:00:00`).getTime();
  const patientsInRange = new Set(rows.map((e) => e.patientId));
  let newPatients = 0;
  for (const id of patientsInRange) if ((firstVisit.get(id) ?? 0) >= fromMs) newPatients++;

  const status = query.get('status');
  const listRows = rows
    .filter((e) => !status || e.status === status)
    .slice()
    .reverse()
    .map((e) => ({
      encounterId: e.id,
      date: e.arrived.toISOString(),
      patientName: patientById.get(e.patientId)!.name,
      practitionerName: practitionerById.get(e.practitionerId)?.name,
      status: e.status,
      durationMinutes: e.finished ? Math.round((e.finished.getTime() - e.arrived.getTime()) / 60000) : null,
    }));
  const page = paginate(listRows, query, 20);

  return {
    summary: {
      total: rows.length,
      finished: finished.length,
      cancelled: rows.filter((e) => e.status === 'cancelled').length,
      inProgress: rows.filter((e) => e.status === 'in_progress' || e.status === 'arrived').length,
      avgDurationMinutes: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    },
    byDay: eachDay(from, to).map((date) => ({ date, count: byDayMap.get(date) ?? 0 })),
    byDoctor: [...byDoctorMap].map(([id, count]) => ({ practitionerName: practitionerById.get(id)!.name, count })),
    demographics: {
      byGender: [...byGenderMap].map(([gender, count]) => ({ gender, count })),
      byAgeGroup: AGE_GROUPS.map(({ group }) => ({ group, count: byAgeMap.get(group) ?? 0 })).filter((g) => g.count > 0),
      newVsReturning: { new: newPatients, returning: patientsInRange.size - newPatients },
    },
    procedureMix: {
      topProcedures: [...procCount]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tarifId, count]) => ({ tarifName: tarifById.get(tarifId)!.name, kategori: tarifById.get(tarifId)!.kategori, count })),
      byKategori: [...byKategori].sort((a, b) => b[1] - a[1]).map(([kategori, count]) => ({ kategori, count })),
      avgProceduresPerVisit: finished.length ? Math.round((procTotal / finished.length) * 100) / 100 : 0,
    },
    byHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHourMap.get(hour) ?? 0 })),
    byDayOfWeek: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DOW_LABELS[d], count: byDowMap.get(d) ?? 0 })),
    comparison: { previousTotal, changePercent: changePct(rows.length, previousTotal) },
    encounters: page.data,
    meta: page.meta,
  };
}

function financialCore(from: string, to: string) {
  const bills = demoBillings.filter((b) => inRange(b.createdAt, from, to));
  const totalBilling = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
  const modal = bills.reduce((s, b) => s + b.items.reduce((m, it) => m + it.modal, 0), 0);
  const expenses = demoExpenses.filter((x) => x.tanggal >= from && x.tanggal <= to);
  const pengeluaran = expenses.reduce((s, x) => s + x.nominal, 0);
  return { bills, totalBilling, totalPaid, modal, expenses, pengeluaran };
}

function financialReport(query: Query): FinancialReportResponse {
  const { from, to } = range(query);
  const core = financialCore(from, to);
  const prev = previousRange(from, to);
  const prevCore = financialCore(prev.from, prev.to);
  const { bills, totalBilling, totalPaid, modal, pengeluaran } = core;
  const labaBersih = totalPaid - modal - pengeluaran;

  const byDay = new Map<string, { revenue: number; collected: number }>();
  const byMethod = new Map<string, number>();
  const byDoctor = new Map<number, number>();
  const tindakan = new Map<number, { frekuensi: number; totalDiskon: number; pendapatan: number; modal: number }>();
  const patientSpend = new Map<number, number>();
  for (const b of bills) {
    const day = dateOf(b.createdAt);
    const cur = byDay.get(day) ?? { revenue: 0, collected: 0 };
    cur.revenue += b.grandTotal;
    cur.collected += b.paidAmount;
    byDay.set(day, cur);
    for (const pay of b.payments) byMethod.set(pay.method, (byMethod.get(pay.method) ?? 0) + pay.amount);
    const enc = demoEncounters[b.encounterId - 1];
    byDoctor.set(enc.practitionerId, (byDoctor.get(enc.practitionerId) ?? 0) + b.grandTotal);
    patientSpend.set(b.patientId, (patientSpend.get(b.patientId) ?? 0) + b.paidAmount);
    for (const it of b.items) {
      const t = tindakan.get(it.tarifId) ?? { frekuensi: 0, totalDiskon: 0, pendapatan: 0, modal: 0 };
      t.frekuensi++;
      t.totalDiskon += it.discount;
      t.pendapatan += it.subtotal;
      t.modal += it.modal;
      tindakan.set(it.tarifId, t);
    }
  }

  const categories = new Map<string, { frekuensi: number; pendapatan: number; modal: number }>();
  for (const [tarifId, t] of tindakan) {
    const k = tarifById.get(tarifId)!.kategori;
    const c = categories.get(k) ?? { frekuensi: 0, pendapatan: 0, modal: 0 };
    c.frekuensi += t.frekuensi;
    c.pendapatan += t.pendapatan;
    c.modal += t.modal;
    categories.set(k, c);
  }

  const spends = [...patientSpend.values()].sort((a, b) => b - a);
  const top20 = spends.slice(0, Math.max(1, Math.ceil(spends.length * 0.2))).reduce((a, b) => a + b, 0);
  const visitsPerPatient = bills.length / Math.max(1, patientSpend.size);
  const fromMs = new Date(`${from}T00:00:00`).getTime();
  const newPatients = [...patientSpend.keys()].filter((id) => (firstVisit.get(id) ?? 0) >= fromMs).length;
  const adSpend = core.expenses.filter((x) => x.kategori === 'biaya_iklan').reduce((s, x) => s + x.nominal, 0);
  const prevPatients = new Set(prevCore.bills.map((b) => b.patientId));
  const returning = [...patientSpend.keys()].filter((id) => prevPatients.has(id)).length;
  const avgLtv = totalPaid / Math.max(1, patientSpend.size);
  const cac = newPatients ? Math.round(adSpend / newPatients) : null;

  return {
    summary: {
      totalBilling,
      totalPaid,
      totalOutstanding: totalBilling - totalPaid,
      collectionRate: pct(totalPaid, totalBilling),
      totalRefunded: 0,
    },
    comparison: { previousPendapatan: prevCore.totalPaid, changePercent: changePct(totalPaid, prevCore.totalPaid) },
    byDay: eachDay(from, to).map((date) => ({ date, revenue: byDay.get(date)?.revenue ?? 0, collected: byDay.get(date)?.collected ?? 0 })),
    byPaymentMethod: [...byMethod].map(([method, amount]) => ({ method: method as 'cash', amount })),
    byDoctor: [...byDoctor].map(([id, revenue]) => ({
      practitionerName: practitionerById.get(id)!.name,
      revenue,
      doctorFeeShare: Math.round((revenue * DOCTOR_FEE_PERCENT) / 100),
    })),
    ringkasan: {
      pendapatanTotal: totalPaid,
      modal,
      labaBersih,
      pengeluaran,
      marginPersen: pct(labaBersih, totalPaid),
    },
    tindakanTerlaris: [...tindakan]
      .sort((a, b) => b[1].frekuensi - a[1].frekuensi)
      .slice(0, 10)
      .map(([tarifId, t]) => ({
        tarifId,
        namaTindakan: tarifById.get(tarifId)!.name,
        modal: tarifById.get(tarifId)!.hargaPokok,
        hargaJual: tarifById.get(tarifId)!.hargaJual,
        frekuensi: t.frekuensi,
        totalDiskon: t.totalDiskon,
        labaBersih: t.pendapatan - t.modal,
      })),
    businessMetrics: {
      ltv: { averageLtv: Math.round(avgLtv), averageVisitsPerPatient: Math.round(visitsPerPatient * 10) / 10, patientCount: patientSpend.size },
      arpv: Math.round(totalPaid / Math.max(1, bills.length)),
      pareto: { top20PercentPatientShare: pct(top20, totalPaid), patientCount: patientSpend.size },
      dso: { averageDays: 3, outstandingCount: bills.filter((b) => b.status !== 'paid').length },
      retention: {
        retentionRatePercent: prevPatients.size ? pct(returning, prevPatients.size) : null,
        previousPeriodPatients: prevPatients.size,
        returningPatients: returning,
      },
      categoryProfitability: [...categories]
        .sort((a, b) => b[1].pendapatan - a[1].pendapatan)
        .map(([kategori, c]) => ({
          kategori,
          frekuensi: c.frekuensi,
          pendapatan: c.pendapatan,
          modal: c.modal,
          labaBersih: c.pendapatan - c.modal,
          marginPersen: pct(c.pendapatan - c.modal, c.pendapatan),
        })),
      marketing: {
        totalAdSpend: adSpend,
        newPatients,
        cac,
        ltvCacRatio: cac ? Math.round((avgLtv / cac) * 10) / 10 : null,
      },
    },
  };
}

function financialProReport(query: Query): FinancialReportProResponse {
  const base = financialReport(query);
  const { from, to } = range(query);
  const core = financialCore(from, to);

  const end = new Date(`${to}T00:00:00`);
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(end.getFullYear(), end.getMonth() - 11 + i, 1);
    const last = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const m = financialCore(toDateStr(start), toDateStr(last));
    const visits = demoEncounters.filter((e) => inRange(e.arrived, toDateStr(start), toDateStr(last))).length;
    const newPatients = [...firstVisit.values()].filter((t) => t >= start.getTime() && t <= last.getTime() + 86399999).length;
    const netProfit = m.totalPaid - m.modal - m.pengeluaran;
    return {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      revenue: m.totalPaid,
      modal: m.modal,
      expense: m.pengeluaran,
      netProfit,
      marginPercent: pct(netProfit, m.totalPaid),
      visits,
      newPatients,
    };
  });

  const heat = new Map<string, number>();
  for (const e of demoEncounters) {
    if (!inRange(e.arrived, from, to)) continue;
    const key = `${e.arrived.getDay() + 1}-${e.arrived.getHours()}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }

  const usage = demoBarang.slice(0, 6).map((b, i) => {
    const qtyUsed = Math.round((core.bills.length * (i + 1)) / 8);
    return {
      barangId: b.id,
      barangName: b.name,
      satuan: b.satuanPakai,
      qtyUsed,
      totalCost: Math.round((qtyUsed * b.hargaBeli) / b.konversiQty),
    };
  });

  return {
    ...base,
    labaKotor: base.summary.totalPaid - base.ringkasan.modal,
    monthlyTrend,
    byDoctorProfit: base.byDoctor.map((d) => ({ ...d, labaBersih: d.revenue - d.doctorFeeShare })),
    discountRanking: [...base.tindakanTerlaris].filter((t) => t.totalDiskon > 0).sort((a, b) => b.totalDiskon - a.totalDiskon),
    visitHeatmap: [...heat].map(([key, count]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return { dayOfWeek, hour, count };
    }),
    stockReport: {
      totalInventoryValue: demoBarang.reduce((s, b) => s + Math.round((b.stokSaatIni * b.hargaBeli) / b.konversiQty), 0),
      totalActiveItems: demoBarang.length,
      usage,
    },
  };
}

function patientOrigin(level: 'kecamatan' | 'kelurahan') {
  const counts = new Map<string, { kelurahan: string; kecamatan: string; city: string; count: number }>();
  for (const p of demoPatients) {
    const key = level === 'kecamatan' ? `${p.kecamatan}|${p.city}` : `${p.kelurahan}|${p.kecamatan}`;
    const cur = counts.get(key) ?? { kelurahan: p.kelurahan, kecamatan: p.kecamatan, city: p.city, count: 0 };
    cur.count++;
    counts.set(key, cur);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

// ---------- routes ----------

const now = () => new Date().toISOString();
const list = <T,>(rows: T[], query: Query, limit = 10) => paginate(rows, query, limit);

/** A handful of real ICD-10 / SNOMED CT codes for the demo's diagnosis search. */
const DEMO_TERMS = [
  { system: 'icd10', code: 'K02.1', display: 'Caries of dentine', nameId: 'Karies dentin', category: 'Dental caries', aliases: ['gigi berlubang', 'karies media', 'karies profunda'], explanation: 'Lubang gigi yang sudah mencapai dentin. Sering terasa ngilu saat makan manis atau dingin; ditangani dengan penambalan.' },
  { system: 'icd10', code: 'K02.0', display: 'Caries limited to enamel', nameId: 'Karies email', category: 'Dental caries', aliases: ['karies superfisial', 'gigi berlubang kecil'], explanation: 'Lubang atau demineralisasi yang masih terbatas pada lapisan email.' },
  { system: 'icd10', code: 'K04.0', display: 'Pulpitis', nameId: 'Pulpitis', category: 'Diseases of pulp and periapical tissues', aliases: ['radang saraf gigi', 'sakit gigi berdenyut'], explanation: 'Peradangan pulpa (saraf gigi), biasanya karena karies dalam.' },
  { system: 'icd10', code: 'K04.7', display: 'Periapical abscess without sinus', nameId: 'Abses periapikal tanpa fistula', category: 'Diseases of pulp and periapical tissues', aliases: ['abses gigi', 'gigi bengkak'], explanation: 'Kumpulan nanah di ujung akar gigi tanpa saluran keluar; biasanya nyeri hebat dan bengkak.' },
  { system: 'icd10', code: 'K05.1', display: 'Chronic gingivitis', nameId: 'Gingivitis kronis', category: 'Gingivitis and periodontal diseases', aliases: ['radang gusi', 'gusi berdarah'], explanation: 'Peradangan gusi menahun akibat plak dan karang gigi.' },
  { system: 'icd10', code: 'K05.3', display: 'Chronic periodontitis', nameId: 'Periodontitis kronis', category: 'Gingivitis and periodontal diseases', aliases: ['gigi goyang', 'penyakit gusi'], explanation: 'Kerusakan jaringan penyangga gigi secara bertahap; gigi bisa goyang.' },
  { system: 'icd10', code: 'K01.1', display: 'Impacted teeth', nameId: 'Gigi impaksi', category: 'Embedded and impacted teeth', aliases: ['gigi bungsu', 'impaksi'], explanation: 'Gigi gagal tumbuh sempurna karena terhalang — paling sering gigi geraham bungsu.' },
  { system: 'icd10', code: 'K03.6', display: 'Deposits [accretions] on teeth', nameId: 'Deposit pada gigi (karang gigi)', category: 'Other diseases of hard tissues of teeth', aliases: ['karang gigi', 'kalkulus', 'plak'], explanation: 'Endapan pada permukaan gigi: plak, karang gigi, atau noda. Ditangani dengan scaling.' },
  { system: 'snomed', code: '44828002', display: 'Dentin caries', nameId: 'Karies dentin', category: '', aliases: ['gigi berlubang'], explanation: 'Lubang gigi yang sudah mencapai dentin.' },
  { system: 'snomed', code: '80967001', display: 'Dental caries', nameId: 'Karies gigi (tidak spesifik)', category: '', aliases: ['gigi berlubang', 'karies'], explanation: 'Kerusakan jaringan keras gigi akibat asam dari bakteri plak.' },
  { system: 'snomed', code: '32620007', display: 'Pulpitis', nameId: 'Pulpitis', category: '', aliases: ['radang saraf gigi'], explanation: 'Peradangan pulpa (saraf gigi).' },
  { system: 'snomed', code: '72621003', display: 'Chronic gingivitis', nameId: 'Gingivitis kronis', category: '', aliases: ['radang gusi'], explanation: 'Peradangan gusi menahun.' },
];

const routes: [RegExp, Handler][] = [
  // dashboard
  [/^\/dashboard\/summary$/, () => {
    const todayStr = toDateStr(demoToday);
    const monthStart = todayStr.slice(0, 8) + '01';
    const todays = demoEncounters.filter((e) => dateOf(e.arrived) === todayStr);
    return {
      totalPatients: demoPatients.length,
      activePractitioners: demoPractitioners.length,
      todayVisits: todays.length,
      pendingVisits: todays.filter((e) => e.status === 'arrived' || e.status === 'in_progress').length,
      monthlyRevenue: financialCore(monthStart, todayStr).totalPaid,
      activeTarifs: demoTarifs.length,
      totalTransactions: demoBillings.filter((b) => dateOf(b.createdAt) >= monthStart).length,
      registeredUsers: 5,
    };
  }],
  [/^\/dashboard\/activity$/, (_m, q) => {
    const limit = Number(q.get('limit')) || 8;
    return demoEncounters.slice(-limit).reverse().map((e) => {
      const p = patientById.get(e.patientId)!;
      const bill = billingByEncounter.get(e.id);
      return bill && e.status === 'finished'
        ? { type: 'billing', title: `Pembayaran ${p.name}`, detail: `${bill.invoiceNumber} · Rp ${bill.grandTotal.toLocaleString('id-ID')}`, timestamp: bill.createdAt.toISOString(), status: bill.status }
        : { type: 'encounter', title: `Kunjungan ${p.name}`, detail: practitionerById.get(e.practitionerId)!.name, timestamp: e.arrived.toISOString(), status: e.status };
    });
  }],

  // reports
  [/^\/reports\/visits$/, (_m, q) => visitReport(q)],
  [/^\/reports\/financial$/, (_m, q) => financialReport(q)],
  [/^\/reports\/financial-pro$/, (_m, q) => financialProReport(q)],
  [/^\/reports\/financial-pro\/patient-origin-map$/, () =>
    patientOrigin('kecamatan').map((r) => ({ kecamatan: r.kecamatan, city: r.city, count: r.count, lat: null, lng: null, resolved: false }))],
  [/^\/reports\/financial-pro\/patient-origin-kelurahan$/, () =>
    patientOrigin('kelurahan').map((r) => ({ kelurahan: r.kelurahan, kecamatan: r.kecamatan, city: r.city, count: r.count }))],
  [/^\/reports\/financial\/visit-detail$/, (_m, q) => {
    const { from, to } = range(q);
    const rows = demoEncounters
      .filter((e) => e.status === 'finished' && inRange(e.arrived, from, to))
      .reverse()
      .map((e) => ({
        encounterId: e.id,
        patientName: patientById.get(e.patientId)!.name,
        birthDate: patientById.get(e.patientId)!.birthDate,
        tindakan: e.procedures.map((p) => tarifById.get(p.tarifId)!.name).join(', '),
        jamMasuk: e.arrived.toISOString(),
        jamKeluar: e.finished?.toISOString() ?? null,
      }));
    return list(rows, q, 20);
  }],
  [/^\/reports\/doctor-fee-share$/, (_m, q) => {
    const year = Number(q.get('year')) || demoToday.getFullYear();
    const month = Number(q.get('month')) || demoToday.getMonth() + 1;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = toDateStr(new Date(year, month, 0));
    return demoPractitioners.map((doc) => {
      const perTarif = new Map<number, number>();
      for (const e of demoEncounters) {
        if (e.practitionerId !== doc.id || e.status !== 'finished' || !inRange(e.arrived, from, to)) continue;
        for (const p of e.procedures) perTarif.set(p.tarifId, (perTarif.get(p.tarifId) ?? 0) + 1);
      }
      const breakdown = [...perTarif].map(([tarifId, count]) => {
        const t = tarifById.get(tarifId)!;
        return { tarifId, tarifName: t.name, count, feeType: 'percentage' as const, feeValue: DOCTOR_FEE_PERCENT, totalShare: Math.round((count * t.hargaJual * DOCTOR_FEE_PERCENT) / 100) };
      });
      return {
        practitionerId: doc.id,
        practitionerName: doc.name,
        breakdown,
        totalTindakan: breakdown.reduce((s, b) => s + b.count, 0),
        totalShareFee: breakdown.reduce((s, b) => s + b.totalShare, 0),
      };
    });
  }],

  // patients
  [/^\/patients\/referral-summary$/, () => {
    const bySource = new Map<string, number>();
    const byRef = new Map<number, number>();
    for (const p of demoPatients) {
      bySource.set(p.sumberInformasi, (bySource.get(p.sumberInformasi) ?? 0) + 1);
      if (p.referrerPatientId) byRef.set(p.referrerPatientId, (byRef.get(p.referrerPatientId) ?? 0) + 1);
    }
    return {
      bySource: [...bySource].map(([sumberInformasi, count]) => ({ sumberInformasi, count })),
      byReferrer: [...byRef]
        .sort((a, b) => b[1] - a[1])
        .map(([id, referralCount]) => ({ referrerPatientId: id, referrerName: patientById.get(id)!.name, referralCount })),
    };
  }],
  [/^\/patients\/(\d+)\/encounters$/, (m) =>
    demoEncounters.filter((e) => e.patientId === Number(m[1])).reverse().map((e) => ({
      id: e.id,
      status: e.status,
      serviceType: 'outpatient',
      chiefComplaint: e.chiefComplaint,
      arrivedTime: e.arrived.toISOString(),
      finishedTime: e.finished?.toISOString(),
      practitionerName: practitionerById.get(e.practitionerId)?.name,
    }))],
  [/^\/patients\/(\d+)\/medical-record$/, (m) => medicalRecord(Number(m[1]))],
  [/^\/patients\/(\d+)\/timeline$/, (m) =>
    demoEncounters.filter((e) => e.patientId === Number(m[1])).reverse().slice(0, 15).map((e) => ({
      type: 'kunjungan' as const,
      date: e.arrived.toISOString(),
      title: e.procedures.map((p) => tarifById.get(p.tarifId)!.name).join(', '),
      subtitle: practitionerById.get(e.practitionerId)?.name,
    }))],
  [/^\/patients\/(\d+)\/treatment-plans$/, () => []],
  [/^\/patients\/(\d+)\/odontogram$/, () => ({ teeth: [], bridges: [] })],
  [/^\/patients\/(\d+)$/, (m) => {
    if (!patientById.has(Number(m[1]))) throw new ApiError('Pasien tidak ditemukan', 404);
    return patientView(Number(m[1]));
  }],
  [/^\/patients$/, (_m, q) => {
    const search = (q.get('search') || '').toLowerCase();
    const gender = q.get('gender');
    const rows = demoPatients
      .filter((p) => (!search || p.name.toLowerCase().includes(search) || p.noRm.toLowerCase().includes(search)) && (!gender || p.gender === gender))
      .slice()
      .reverse()
      .map((p) => patientView(p.id));
    // The real endpoint's list is unwrapped to a bare array by apiClient.
    return paginate(rows, q, 10).data;
  }],

  // encounters
  [/^\/encounters\/(\d+)\/(soap-note|dental-examination|physical-examination)$/, () => null],
  [/^\/terminology\/search$/, (_m, q) => {
    const words = (q.get('q') || '').toLowerCase().split(/\s+/).filter(Boolean);
    return DEMO_TERMS.filter((t) => t.system === q.get('system'))
      .filter((t) => words.every((w) => [t.code, t.display, t.nameId, ...t.aliases].join(' ').toLowerCase().includes(w)))
      .slice(0, 12)
      .map(({ system, code, display, nameId }) => ({ system, code, display, nameId }));
  }],
  [/^\/terminology\/(icd10|snomed)\/(.+)$/, (m) => {
    const t = DEMO_TERMS.find((x) => x.system === m[1] && x.code === decodeURIComponent(m[2]));
    if (!t) return null;
    const eq = DEMO_TERMS.find((x) => x.system !== t.system && x.nameId === t.nameId);
    return {
      ...t,
      classification: t.system === 'icd10'
        ? { chapter: { roman: 'XI', range: 'K00–K93', name: 'Penyakit sistem pencernaan' }, block: { range: 'K00–K14', name: 'Penyakit rongga mulut, kelenjar ludah, dan rahang' }, category: { code: t.code.slice(0, 3), display: t.category } }
        : null,
      equivalent: eq ? { system: eq.system, code: eq.code, display: eq.display } : null,
    };
  }],
  [/^\/encounters\/(\d+)\/(prescriptions|supporting-exam-images)$/, () => []],
  [/^\/encounters\/(\d+)$/, (m) => {
    const e = demoEncounters[Number(m[1]) - 1];
    if (!e) throw new ApiError('Kunjungan tidak ditemukan', 404);
    return encounterDetail(e);
  }],
  [/^\/encounters$/, (_m, q) => {
    const date = q.get('date');
    const status = q.get('status');
    const doc = q.get('practitionerId');
    const unbilled = q.get('unbilled') === 'true';
    const rows = demoEncounters
      .filter((e) =>
        (!date || dateOf(e.arrived) === date) &&
        (!status || e.status === status) &&
        (!doc || e.practitionerId === Number(doc)) &&
        (!unbilled || (e.status === 'finished' && !billingByEncounter.has(e.id))))
      .slice()
      .reverse()
      .map(encounterListItem);
    return list(rows, q, 20);
  }],

  // billing
  [/^\/billings\/(\d+)$/, (m) => {
    const b = demoBillings.find((x) => x.id === Number(m[1]));
    if (!b) throw new ApiError('Tagihan tidak ditemukan', 404);
    return billingDetail(b);
  }],
  [/^\/billings$/, (_m, q) => {
    const status = q.get('status');
    const from = q.get('dateFrom');
    const to = q.get('dateTo');
    const rows = demoBillings
      .filter((b) => (!status || b.status === status) && (!from || dateOf(b.createdAt) >= from) && (!to || dateOf(b.createdAt) <= to))
      .slice()
      .reverse()
      .map((b) => ({
        billingId: b.id,
        encounterId: b.encounterId,
        invoiceNumber: b.invoiceNumber,
        patientName: patientById.get(b.patientId)!.name,
        grandTotal: b.grandTotal,
        paidAmount: b.paidAmount,
        outstandingAmount: b.grandTotal - b.paidAmount,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      }));
    return list(rows, q, 10);
  }],

  // reservations & recalls
  [/^\/reservations$/, (_m, q) => {
    const rows = Array.from({ length: 18 }, (_, i) => {
      const p = demoPatients[(i * 13) % demoPatients.length];
      const d = new Date(demoToday.getTime() + (Math.floor(i / 3) + 1) * 86400000);
      const doc = demoPractitioners[i % 3];
      return {
        id: i + 1,
        clinicId: DEMO_CLINIC_ID,
        patientId: p.id,
        patientName: p.name,
        patientPhone: p.phone,
        practitionerId: doc.id,
        practitioner: { id: doc.id, name: doc.name },
        reservationDate: toDateStr(d),
        jamSlot: `${String(9 + (i % 8)).padStart(2, '0')}:00`,
        notes: i % 4 === 0 ? 'Kontrol pasca tambal' : '',
        status: i % 5 === 0 ? ('pending' as const) : ('confirmed' as const),
        source: i % 3 === 0 ? ('website' as const) : ('dashboard' as const),
        token: `demo-${i + 1}`,
        createdAt: now(),
      };
    });
    const date = q.get('date');
    return list(rows.filter((r) => !date || r.reservationDate === date), q, 20);
  }],
  [/^\/patient-recalls$/, (_m, q) =>
    list(
      demoPatients.slice(0, 25).map((p, i) => ({
        id: i + 1,
        clinicId: DEMO_CLINIC_ID,
        patientId: p.id,
        tarifId: 2,
        billingItemId: null,
        dueDate: toDateStr(new Date(demoToday.getTime() + (i - 8) * 86400000)),
        status: i % 3 === 0 ? ('sudah_dihubungi' as const) : ('belum_dihubungi' as const),
        contactedAt: null,
        contactedBy: null,
        notes: null,
        createdAt: now(),
        patient: { id: p.id, name: p.name, phone: p.phone, noRm: p.noRm },
        tarif: { id: 2, name: 'Scaling (Pembersihan Karang Gigi)' },
        upcomingReservation: null,
      })).filter((r) => !q.get('status') || r.status === q.get('status')),
      q,
      20,
    )],
  [/^\/recall-intervals$/, () => [
    { id: 1, clinicId: DEMO_CLINIC_ID, tarifId: 2, intervalDays: 180, tarif: { id: 2, name: 'Scaling (Pembersihan Karang Gigi)' } },
    { id: 2, clinicId: DEMO_CLINIC_ID, tarifId: 9, intervalDays: 30, tarif: { id: 9, name: 'Kontrol Behel' } },
  ]],

  // operations
  [/^\/operational-records$/, (_m, q) => {
    const kategori = q.get('kategori');
    const start = q.get('startDate');
    const end = q.get('endDate');
    const search = (q.get('search') || '').toLowerCase();
    const rows = demoExpenses
      .filter((x) => (!kategori || x.kategori === kategori) && (!start || x.tanggal >= start) && (!end || x.tanggal <= end) && (!search || x.deskripsi.toLowerCase().includes(search)))
      .slice()
      .reverse()
      .map((x) => ({ ...x, clinicId: DEMO_CLINIC_ID, createdAt: `${x.tanggal}T09:00:00.000Z`, updatedAt: `${x.tanggal}T09:00:00.000Z` }));
    return list(rows, q, 10);
  }],
  [/^\/settings\/doctor-fee-configs$/, () =>
    demoTarifs.map((t) => ({ id: t.id, tarifId: t.id, tarifName: t.name, feeType: 'percentage', feeValue: DOCTOR_FEE_PERCENT, isActive: true, updatedAt: t.updatedAt }))],
  [/^\/gudang\/dashboard$/, () => {
    const low = demoBarang.filter((b) => b.stokSaatIni < b.stokMinimum);
    return {
      totalItems: demoBarang.length,
      lowStockCount: low.length,
      lowStockItems: low.map((b) => ({ id: b.id, name: b.name, sku: b.sku, stokSaatIni: b.stokSaatIni, stokMinimum: b.stokMinimum })),
      totalInventoryValue: demoBarang.reduce((s, b) => s + Math.round((b.stokSaatIni * b.hargaBeli) / b.konversiQty), 0),
      nearExpiryCount: 1,
    };
  }],
  [/^\/gudang\/barang\/(\d+)$/, (m) => demoBarang.find((b) => b.id === Number(m[1]))],
  [/^\/gudang\/barang$/, (_m, q) => list(demoBarang, q, 20)],
  [/^\/gudang\/transaksi$/, (_m, q) =>
    list(
      demoBarang.map((b, i) => ({
        id: i + 1,
        clinicId: DEMO_CLINIC_ID,
        barangId: b.id,
        barang: b,
        type: i % 3 === 0 ? ('in' as const) : ('out' as const),
        qty: i % 3 === 0 ? 5 : 2,
        tanggal: toDateStr(new Date(demoToday.getTime() - i * 86400000)),
        createdAt: now(),
      })),
      q,
      20,
    )],
  [/^\/gudang\/bom$/, () => []],

  // settings
  [/^\/settings\/clinic$/, () => demoClinic],
  [/^\/settings\/tarifs\/(\d+)$/, (m) => demoTarifs.find((t) => t.id === Number(m[1]))],
  [/^\/settings\/tarifs$/, (_m, q) => list(demoTarifs, q, 50)],
  [/^\/settings\/practitioners$/, () => demoPractitioners],
  [/^\/settings\/api\/keys$/, () => [
    { id: 1, name: 'Website klinik', type: 'publishable', keyPrefix: 'apx_pk_Q3vN', allowedOrigins: ['https://senyumsehat.demo'], createdAt: '2026-06-02T08:00:00.000Z', lastUsedAt: now(), revokedAt: null },
    { id: 2, name: 'Server tim IT', type: 'secret', keyPrefix: 'apx_sk_8fLc', allowedOrigins: [], createdAt: '2026-07-14T08:00:00.000Z', lastUsedAt: now(), revokedAt: null },
  ]],
  [/^\/settings\/api\/usage$/, () => {
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(demoToday.getTime() - (29 - i) * 86400000);
      const weekend = d.getDay() === 0;
      return { date: toDateStr(d), count: weekend ? 120 + ((i * 37) % 60) : 900 + ((i * 523) % 1400) };
    });
    const usedToday = daily[daily.length - 1].count;
    return {
      plan: 'Pro', subscriptionActive: true, limitPerDay: 10000, limitPerMinute: 300,
      usedToday, remainingToday: 10000 - usedToday, daily,
      byKey: [{ apiKeyId: 1, count: daily.reduce((s, d) => s + d.count, 0) - 2400 }, { apiKeyId: 2, count: 2400 }],
    };
  }],
  [/^\/settings\/api\/practitioners$/, () =>
    demoPractitioners.map((p, i) => ({
      id: p.id, name: p.name, specialization: p.specialization ?? null, photoUrl: null, isActive: true,
      jadwalPraktik: i === 1 ? { senin: '09:00-15:00', selasa: 'Tutup', rabu: '09:00-15:00', kamis: 'Tutup', jumat: '13:00-20:00', sabtu: '09:00-13:00', minggu: 'Tutup' } : null,
    }))],
  [/^\/settings\/locations$/, () => [
    { id: 1, name: 'Ruang Periksa 1', isActive: true, clinicId: DEMO_CLINIC_ID, createdAt: now() },
    { id: 2, name: 'Ruang Periksa 2', isActive: true, clinicId: DEMO_CLINIC_ID, createdAt: now() },
  ]],
  [/^\/users\/roles$/, () => [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'dokter', label: 'Dokter' },
  ]],
  [/^\/users$/, () => [
    { id: 900001, email: 'demo@apexrecord.id', name: 'drg. Demo Pratama', role: 'owner', clinicId: DEMO_CLINIC_ID, isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
    { id: 900002, email: 'resepsionis@senyumsehat.demo', name: 'Rani (Resepsionis)', role: 'admin', clinicId: DEMO_CLINIC_ID, isActive: true, createdAt: '2026-01-06T08:00:00.000Z' },
    ...demoPractitioners.map((p) => ({ id: 900010 + p.id, email: p.email, name: p.name, role: 'dokter', clinicId: DEMO_CLINIC_ID, isActive: true, createdAt: p.createdAt })),
  ]],
  [/^\/consent-templates$/, () => []],
  [/^\/patient-consents$/, (_m, q) => list([], q)],
  [/^\/audit-logs$/, (_m, q) =>
    list(
      demoEncounters.slice(-30).reverse().map((e, i) => ({
        id: i + 1,
        clinicId: DEMO_CLINIC_ID,
        actorId: 900002,
        actorName: 'Rani (Resepsionis)',
        actorRole: 'admin',
        actionType: i % 4 === 0 ? 'CREATE' : 'VIEW',
        entityType: i % 4 === 0 ? 'Encounter' : 'Patient',
        entityId: String(i % 4 === 0 ? e.id : e.patientId),
        entityLabel: patientById.get(e.patientId)!.name,
        beforeValue: null,
        afterValue: null,
        status: 'SUCCESS',
        failureReason: null,
        ipAddress: '10.0.0.12',
        userAgent: 'Mozilla/5.0',
        createdAt: e.arrived.toISOString(),
      })),
      q,
      20,
    )],

  // account & app chrome
  [/^\/clinic-subscriptions\/current$/, () => ({
    id: 1,
    clinicId: DEMO_CLINIC_ID,
    clinicName: demoClinic.name,
    planId: 2,
    plan: { id: 2, name: 'Pro Tahunan', durationDays: 365, price: 0, isActive: true, tier: 'pro', billingCycle: 'yearly' },
    startDate: toDateStr(new Date(demoToday.getTime() - 60 * 86400000)),
    endDate: toDateStr(new Date(demoToday.getTime() + 305 * 86400000)),
    status: 'active',
    extendedBy: null,
    notes: null,
    createdAt: now(),
  })],
  [/^\/subscription-plans$/, () => []],
  [/^\/subscription-payments\/mine$/, (_m, q) => list([], q)],
  [/^\/onboarding\/status$/, () => ({
    infoKlinik: { complete: true },
    tarif: { complete: true, count: demoTarifs.length },
    dokter: { complete: true, count: demoPractitioners.length },
    allComplete: true,
  })],
  [/^\/auth\/mfa\/status$/, () => ({ enabled: true })],
  [/^\/auth\/me$/, () => ({ id: 900001, email: 'demo@apexrecord.id', name: 'drg. Demo Pratama', role: 'owner', clinicId: DEMO_CLINIC_ID, isActive: true })],
  [/^\/notifications$/, () => ({
    items: demoEncounters.slice(-5).reverse().map((e, i) => ({
      id: i + 1,
      clinicId: DEMO_CLINIC_ID,
      type: i % 2 === 0 ? 'KUNJUNGAN_NEW' : 'PAYMENT_NEW',
      title: i % 2 === 0 ? 'Kunjungan baru' : 'Pembayaran diterima',
      message: patientById.get(e.patientId)!.name,
      entityType: null,
      entityId: null,
      actorId: null,
      actorName: 'Rani (Resepsionis)',
      isRead: i > 1,
      createdAt: e.arrived.toISOString(),
    })),
    unreadCount: 2,
  })],
  [/^\/api\/master-data\//, () => []],
];

export async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(path, 'http://demo.local');

  // Marking notifications read is harmless and keeps the bell usable.
  if (method !== 'GET' && !/^\/notifications\/(read-all|\d+\/read)$/.test(url.pathname)) {
    throw new ApiError(DEMO_READ_ONLY_MESSAGE, 403, 'DEMO_READ_ONLY');
  }
  if (method !== 'GET') return { success: true } as T;

  // A short, realistic delay so loading states render as they would live.
  await new Promise((r) => setTimeout(r, 120));

  for (const [pattern, handler] of routes) {
    const match = url.pathname.match(pattern);
    if (match) return structuredClone(handler(match, url.searchParams)) as T;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[demo] no mock for GET ${url.pathname}`);
  }
  return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } } as T;
}
