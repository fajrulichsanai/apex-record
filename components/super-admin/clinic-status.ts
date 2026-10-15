import type { ClinicSubscription, SatusehatStatus } from '@/types/subscription';
import type { Tone } from './ui';

/** Sama dengan SUBSCRIPTION_GRACE_PERIOD_DAYS bawaan backend. */
export const GRACE_DAYS = 3;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000);
}

/**
 * Status klinik dari langganan terakhirnya (PRD UP-04): Aktif / Masa coba,
 * Masa tenggang (3 hari setelah habis, akses penuh), Hanya-baca, dan
 * dijadwalkan atau sudah dihapus datanya.
 */
export function clinicStatus(
  sub: ClinicSubscription | null | undefined,
  retention?: { dataDeleteAfter?: string | null; dataPurgedAt?: string | null },
): { label: string; tone: Tone; hint?: string } {
  if (retention?.dataPurgedAt) return { label: 'Data dihapus', tone: 'bad' };
  if (!sub) return { label: 'Belum berlangganan', tone: 'neutral' };
  const today = todayIso();
  const end = sub.endDate.slice(0, 10);
  if (sub.status === 'active' && end >= today) {
    return sub.plan?.tier === 'trial'
      ? { label: 'Masa coba', tone: 'info', hint: `s.d. ${end}` }
      : { label: 'Aktif', tone: 'ok' };
  }
  const since = daysBetween(end, today);
  if (since <= GRACE_DAYS) {
    return { label: 'Masa tenggang', tone: 'warn', hint: `${GRACE_DAYS - since + 1} hari akses penuh tersisa` };
  }
  return {
    label: 'Hanya-baca',
    tone: 'bad',
    hint: retention?.dataDeleteAfter ? `Data dihapus setelah ${retention.dataDeleteAfter}` : undefined,
  };
}

export const SATUSEHAT_STATUS: Record<SatusehatStatus, { label: string; tone: Tone }> = {
  aktif: { label: 'Aktif', tone: 'ok' },
  dimatikan: { label: 'Dimatikan klinik', tone: 'neutral' },
  belum_siap: { label: 'Belum siap', tone: 'warn' },
};
