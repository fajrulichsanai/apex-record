import { tarifApi, type Tarif } from './tarif';
import { practitionersApi, type Practitioner } from './practitioners';

export type FeeType = 'fixed' | 'percentage';

export interface DoctorFeeConfig {
  id: number;
  tarifId: number;
  tarifName: string;
  feeType: FeeType;
  feeValue: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertDoctorFeeConfigPayload {
  tarifId: number;
  feeType: FeeType;
  feeValue: number;
  isActive?: boolean;
}

export interface TindakanLogEntry {
  id: number;
  tanggal: string;
  practitionerId: number;
  tarifId: number;
}

export interface DoctorMonthlyShareBreakdownItem {
  tarifId: number;
  tarifName: string;
  count: number;
  feeType: FeeType;
  feeValue: number;
  totalShare: number;
}

export interface DoctorMonthlyShareReport {
  practitionerId: number;
  practitionerName: string;
  breakdown: DoctorMonthlyShareBreakdownItem[];
  totalTindakan: number;
  totalShareFee: number;
}

export interface MonthlyShareReportQuery {
  year: number;
  month: number; // 1-12
}

const delay = <T,>(value: T, ms = 350) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

let _feeConfigs: DoctorFeeConfig[] = [];
let _tindakanLog: TindakanLogEntry[] = [];
let _nextConfigId = 1;
let _nextLogId = 1;
let _seedPromise: Promise<void> | null = null;

function monthKeyOf(dateIso: string) {
  const d = new Date(dateIso);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function ensureSeeded(): Promise<void> {
  if (_seedPromise) return _seedPromise;

  _seedPromise = (async () => {
    const [tarifRes, practitioners] = await Promise.all([
      tarifApi.list(),
      practitionersApi.list(),
    ]);
    const tarifs: Tarif[] = tarifRes.data;
    if (tarifs.length === 0 || practitioners.length === 0) return;

    // Deterministic verification scenario: pick the first two tarifs (or specific
    // "Scaling Gigi"/"Tambal Gigi" if present) and assign fixed/percentage fee.
    const scaling = tarifs.find((t) => /scaling/i.test(t.name)) ?? tarifs[0];
    const tambal = tarifs.find((t) => /tambal/i.test(t.name)) ?? tarifs[1] ?? tarifs[0];

    _feeConfigs = tarifs.map((t) => {
      let feeType: FeeType = 'percentage';
      let feeValue = 15;
      if (t.id === scaling.id) {
        feeType = 'fixed';
        feeValue = 50000;
      } else if (t.id === tambal.id) {
        feeType = 'percentage';
        feeValue = 20;
      }
      return {
        id: _nextConfigId++,
        tarifId: t.id,
        tarifName: t.name,
        feeType,
        feeValue,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };
    });

    const now = new Date();
    const log: TindakanLogEntry[] = [];
    const dokterA = practitioners[0];

    // Deterministic entries for verification: Dokter A, current month,
    // Scaling Gigi x3 (fixed fee) + Tambal Gigi x2 (percentage fee).
    if (dokterA) {
      for (let i = 0; i < 3; i++) {
        log.push({
          id: _nextLogId++,
          tanggal: new Date(now.getFullYear(), now.getMonth(), 3 + i).toISOString().slice(0, 10),
          practitionerId: dokterA.id,
          tarifId: scaling.id,
        });
      }
      for (let i = 0; i < 2; i++) {
        log.push({
          id: _nextLogId++,
          tanggal: new Date(now.getFullYear(), now.getMonth(), 10 + i).toISOString().slice(0, 10),
          practitionerId: dokterA.id,
          tarifId: tambal.id,
        });
      }
    }

    // Extra randomized realistic log entries across all practitioners/tarifs,
    // spread over the last 3 months, so the report isn't trivially empty.
    for (let m = 0; m < 3; m++) {
      for (let i = 0; i < 8; i++) {
        const practitioner = practitioners[Math.floor(Math.random() * practitioners.length)];
        const tarif = tarifs[Math.floor(Math.random() * tarifs.length)];
        const day = 1 + Math.floor(Math.random() * 26);
        log.push({
          id: _nextLogId++,
          tanggal: new Date(now.getFullYear(), now.getMonth() - m, day).toISOString().slice(0, 10),
          practitionerId: practitioner.id,
          tarifId: tarif.id,
        });
      }
    }

    _tindakanLog = log;
  })();

  return _seedPromise;
}

async function computeMonthlyReport(query: MonthlyShareReportQuery): Promise<DoctorMonthlyShareReport[]> {
  await ensureSeeded();

  const [tarifRes, practitioners] = await Promise.all([
    tarifApi.list(),
    practitionersApi.list(),
  ]);
  const tarifMap = new Map<number, Tarif>(tarifRes.data.map((t) => [t.id, t]));
  const practitionerMap = new Map<number, Practitioner>(practitioners.map((p) => [p.id, p]));
  const configMap = new Map<number, DoctorFeeConfig>(_feeConfigs.map((c) => [c.tarifId, c]));

  const entriesInMonth = _tindakanLog.filter((entry) => {
    const key = monthKeyOf(entry.tanggal);
    return key.year === query.year && key.month === query.month;
  });

  const byPractitioner = new Map<number, TindakanLogEntry[]>();
  for (const entry of entriesInMonth) {
    const list = byPractitioner.get(entry.practitionerId) ?? [];
    list.push(entry);
    byPractitioner.set(entry.practitionerId, list);
  }

  const reports: DoctorMonthlyShareReport[] = [];

  for (const [practitionerId, entries] of byPractitioner) {
    const practitioner = practitionerMap.get(practitionerId);
    if (!practitioner) continue;

    const byTarif = new Map<number, number>();
    for (const entry of entries) {
      byTarif.set(entry.tarifId, (byTarif.get(entry.tarifId) ?? 0) + 1);
    }

    const breakdown: DoctorMonthlyShareBreakdownItem[] = [];
    let totalShareFee = 0;

    for (const [tarifId, count] of byTarif) {
      const tarif = tarifMap.get(tarifId);
      const config = configMap.get(tarifId);
      const feeType: FeeType = config?.feeType ?? 'percentage';
      const feeValue = config?.feeValue ?? 0;
      const hargaJual = tarif?.hargaJual ?? 0;

      const totalShare = feeType === 'fixed' ? count * feeValue : count * (hargaJual * (feeValue / 100));

      breakdown.push({
        tarifId,
        tarifName: tarif?.name ?? `Tarif #${tarifId}`,
        count,
        feeType,
        feeValue,
        totalShare,
      });
      totalShareFee += totalShare;
    }

    breakdown.sort((a, b) => b.totalShare - a.totalShare);

    reports.push({
      practitionerId,
      practitionerName: practitioner.name,
      breakdown,
      totalTindakan: entries.length,
      totalShareFee,
    });
  }

  reports.sort((a, b) => b.totalShareFee - a.totalShareFee);
  return reports;
}

function upsertConfigImpl(payload: UpsertDoctorFeeConfigPayload): DoctorFeeConfig {
  const existing = _feeConfigs.find((c) => c.tarifId === payload.tarifId);
  const now = new Date().toISOString();

  if (existing) {
    const updated: DoctorFeeConfig = {
      ...existing,
      feeType: payload.feeType,
      feeValue: payload.feeValue,
      isActive: payload.isActive ?? existing.isActive,
      updatedAt: now,
    };
    _feeConfigs = _feeConfigs.map((c) => (c.tarifId === payload.tarifId ? updated : c));
    return updated;
  }

  const created: DoctorFeeConfig = {
    id: _nextConfigId++,
    tarifId: payload.tarifId,
    tarifName: '',
    feeType: payload.feeType,
    feeValue: payload.feeValue,
    isActive: payload.isActive ?? true,
    updatedAt: now,
  };
  _feeConfigs = [..._feeConfigs, created];
  return created;
}

export const doctorFeeApi = {
  listConfigs: async () => {
    await ensureSeeded();
    return delay([..._feeConfigs]);
  },
  upsertConfig: async (payload: UpsertDoctorFeeConfigPayload) => {
    await ensureSeeded();
    return delay(upsertConfigImpl(payload));
  },
  monthlyReport: (query: MonthlyShareReportQuery) => computeMonthlyReport(query).then((r) => delay(r)),

  // REAL IMPLEMENTATION (swap in when backend is ready, keep signatures identical):
  // listConfigs: () => apiClient.get<DoctorFeeConfig[]>('/settings/doctor-fee-configs'),
  // upsertConfig: (payload) => apiClient.post<DoctorFeeConfig>('/settings/doctor-fee-configs', payload),
  // monthlyReport: (query) => apiClient.get<DoctorMonthlyShareReport[]>('/reports/doctor-fee-share?' + new URLSearchParams(query as any).toString()),
};
